"""
reconciler.py — payout matching, fee benchmarking, and anomaly detection.

Fully functional with NO API key and NO cost — the summary is
template-based by default. If you later add a real ANTHROPIC_API_KEY
(starting with sk-ant-) to backend/.env, the summary and an optional
Q&A endpoint switch to real AI automatically — but nothing here
requires that to work.
"""

import os
import statistics
from collections import defaultdict
from datetime import datetime

_raw_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
AI_AVAILABLE = _raw_key.startswith("sk-ant-")

client = None
if AI_AVAILABLE:
    try:
        import anthropic
        client = anthropic.Anthropic()
    except Exception as e:
        print(f"[reconciler] AI unavailable, using free summary instead: {e}")
        AI_AVAILABLE = False

FEE_STRUCTURE = {
    "Shopify": {"rate": 0.029, "fixed": 0.30},
    "Stripe":  {"rate": 0.029, "fixed": 0.30},
    "PayPal":  {"rate": 0.0349, "fixed": 0.49},
    "Amazon":  {"rate": 0.15,  "fixed": 0.00},
}
DEFAULT_FEE = {"rate": 0.03, "fixed": 0.30}

FEE_VARIANCE_THRESHOLD_PCT = 15
OUTLIER_Z_SCORE = 2.0
MIN_PAYOUTS_FOR_OUTLIER_CHECK = 3
OVERDUE_DAYS = 14


def _parse_date(date_str):
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Unrecognized date format: {date_str}")


def _expected_fee(order):
    structure = FEE_STRUCTURE.get(order["channel"], DEFAULT_FEE)
    return order["gross"] * structure["rate"] + structure["fixed"]


def reconcile(order_rows, payout_rows):
    orders = {
        r["order_id"]: {**r, "_date": _parse_date(r["date"])}
        for r in order_rows
    }

    payout_results = []
    referenced_ids = set()

    for p in payout_rows:
        order_ids = [o.strip() for o in p["order_ids"].split(";") if o.strip()]
        matched = []
        missing = []
        for oid in order_ids:
            referenced_ids.add(oid)
            if oid in orders:
                matched.append(orders[oid])
            else:
                missing.append(oid)

        expected_gross = round(sum(o["gross"] for o in matched), 2)
        expected_fee = round(sum(_expected_fee(o) for o in matched), 2)
        actual_fee = round(expected_gross - p["net_amount"], 2)
        fee_variance = round(actual_fee - expected_fee, 2)
        fee_variance_pct = round((fee_variance / expected_fee * 100) if expected_fee else 0, 1)
        effective_fee_rate = round((actual_fee / expected_gross * 100) if expected_gross else 0, 2)

        payout_results.append({
            "payout_id": p["payout_id"],
            "date": p["date"],
            "channel": p["channel"],
            "order_count": len(matched),
            "expected_gross": expected_gross,
            "net_amount": p["net_amount"],
            "expected_fee": expected_fee,
            "actual_fee": actual_fee,
            "fee_variance": fee_variance,
            "fee_variance_pct": fee_variance_pct,
            "effective_fee_rate": effective_fee_rate,
            "missing_order_ids": missing,
        })

    today = max(
        [_parse_date(p["date"]) for p in payout_rows] + [o["_date"] for o in orders.values()],
        default=datetime.now(),
    )
    unpaid_orders = []
    for oid, o in orders.items():
        if oid not in referenced_ids:
            days_pending = (today - o["_date"]).days
            unpaid_orders.append({
                "order_id": oid, "date": o["date"], "channel": o["channel"], "gross": o["gross"],
                "days_pending": days_pending, "overdue": days_pending > OVERDUE_DAYS,
            })

    anomalies = _find_anomalies(payout_results)
    summary = _build_summary(payout_results, unpaid_orders, anomalies)

    return {
        "mode": "ai" if AI_AVAILABLE else "free",
        "summary": summary,
        "payouts": payout_results,
        "unpaid_orders": unpaid_orders,
        "anomalies": anomalies,
    }


def _find_anomalies(payout_results):
    anomalies = []
    for r in payout_results:
        if r["missing_order_ids"]:
            anomalies.append({
                "type": "Unknown order reference",
                "severity": "high",
                "detail": f'{r["payout_id"]} ({r["channel"]}) references order(s) not in your '
                          f'orders file: {", ".join(r["missing_order_ids"])}',
            })
        if r["expected_fee"] > 0 and abs(r["fee_variance_pct"]) >= FEE_VARIANCE_THRESHOLD_PCT:
            direction = "higher" if r["fee_variance"] > 0 else "lower"
            anomalies.append({
                "type": "Unexpected fee variance",
                "severity": "high" if abs(r["fee_variance_pct"]) > 30 else "medium",
                "detail": f'{r["payout_id"]} ({r["channel"]}): actual fee is '
                          f'{abs(r["fee_variance_pct"]):.0f}% {direction} than expected '
                          f'(expected {r["expected_fee"]:.2f}, actual {r["actual_fee"]:.2f})',
            })

    by_channel = defaultdict(list)
    for r in payout_results:
        by_channel[r["channel"]].append(r)
    for channel, rows in by_channel.items():
        if len(rows) < MIN_PAYOUTS_FOR_OUTLIER_CHECK:
            continue
        rates = [row["effective_fee_rate"] for row in rows]
        mean = statistics.mean(rates)
        stdev = statistics.pstdev(rates)
        if stdev == 0:
            continue
        for row in rows:
            z = abs(row["effective_fee_rate"] - mean) / stdev
            if z >= OUTLIER_Z_SCORE:
                anomalies.append({
                    "type": "Statistical fee-rate outlier",
                    "severity": "high",
                    "detail": f'{row["payout_id"]} ({channel}): effective fee rate of '
                              f'{row["effective_fee_rate"]:.2f}% is {z:.1f}x this channel\'s '
                              f'typical variation (channel average: {mean:.2f}%)',
                })
    return anomalies


def _build_summary(payout_results, unpaid_orders, anomalies):
    if AI_AVAILABLE:
        return _build_ai_summary(payout_results, unpaid_orders, anomalies)
    return _build_free_summary(payout_results, unpaid_orders, anomalies)


def _build_free_summary(payout_results, unpaid_orders, anomalies):
    if not payout_results:
        return "Not enough data to summarize."
    worst = max(payout_results, key=lambda r: abs(r["fee_variance_pct"]))
    overdue_count = sum(1 for o in unpaid_orders if o["overdue"])
    parts = [
        f'{worst["payout_id"]} ({worst["channel"]}) had the largest fee discrepancy this period, '
        f'{worst["fee_variance_pct"]:+.0f}% versus the expected fee.',
        f'{len(anomalies)} item(s) flagged for review.',
    ]
    if overdue_count:
        parts.append(f'{overdue_count} order(s) are overdue for payout (pending more than {OVERDUE_DAYS} days).')
    return " ".join(parts)


def _build_ai_summary(payout_results, unpaid_orders, anomalies):
    context = {"payouts": payout_results, "unpaid_orders": unpaid_orders, "anomalies": anomalies}
    prompt = f"""You are a financial analyst reviewing e-commerce payout reconciliation
data across multiple sales channels. Write a concise (4-6 sentence) executive summary
highlighting the most important fee discrepancies and any overdue payouts.

DATA:
{context}

Write the summary now:"""
    response = client.messages.create(
        model="claude-sonnet-5", max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()
