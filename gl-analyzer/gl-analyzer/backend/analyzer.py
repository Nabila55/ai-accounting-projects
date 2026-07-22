"""
analyzer.py — anomaly detection, variance analysis, and AI summary/Q&A
logic, isolated from the web server code (same pattern as the other
tools in this series).
"""

import os
import statistics
from collections import defaultdict
from datetime import datetime

_raw_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
DEMO_MODE = not _raw_key.startswith("sk-ant-")

client = None
if not DEMO_MODE:
    try:
        import anthropic
        client = anthropic.Anthropic()
    except Exception as e:
        print(f"[analyzer] Falling back to demo mode: {e}")
        DEMO_MODE = True

ROUND_NUMBER_THRESHOLD = 500
OUTLIER_Z_SCORE = 2.0
MIN_TXNS_FOR_OUTLIER_CHECK = 4


def _parse_date(date_str):
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Unrecognized date format: {date_str}")


def find_anomalies(rows):
    parsed = [{**r, "_date": _parse_date(r["date"])} for r in rows]
    anomalies = []

    seen = defaultdict(list)
    for r in parsed:
        key = (r["account"], r["amount"], r["_date"].date())
        seen[key].append(r)
    for key, group in seen.items():
        if len(group) > 1:
            anomalies.append({
                "type": "Possible duplicate",
                "severity": "high",
                "detail": f'{len(group)} identical entries: {group[0]["account"]} / '
                          f'{abs(group[0]["amount"]):.2f} on {group[0]["_date"].date()}',
            })

    for r in parsed:
        if r["amount"] != 0 and abs(r["amount"]) % ROUND_NUMBER_THRESHOLD == 0:
            anomalies.append({
                "type": "Round-number entry",
                "severity": "low",
                "detail": f'{r["account"]}: {abs(r["amount"]):.2f} on {r["_date"].date()} — "{r["description"]}"',
            })

    for r in parsed:
        if r["_date"].weekday() >= 5:
            anomalies.append({
                "type": "Weekend posting",
                "severity": "low",
                "detail": f'{r["account"]}: {abs(r["amount"]):.2f} on {r["_date"].date()} '
                          f'({r["_date"].strftime("%A")}) — "{r["description"]}"',
            })

    by_account = defaultdict(list)
    for r in parsed:
        by_account[r["account"]].append(r)

    for account, txns in by_account.items():
        if len(txns) < MIN_TXNS_FOR_OUTLIER_CHECK:
            continue
        amounts = [t["amount"] for t in txns]
        mean = statistics.mean(amounts)
        stdev = statistics.pstdev(amounts)
        if stdev == 0:
            continue
        for t in txns:
            z = abs(t["amount"] - mean) / stdev
            if z >= OUTLIER_Z_SCORE:
                anomalies.append({
                    "type": "Statistical outlier",
                    "severity": "high",
                    "detail": f'{account}: {abs(t["amount"]):.2f} on {t["_date"].date()} is '
                              f'{z:.1f}x the account\'s typical variation '
                              f'(account average: {abs(mean):.2f})',
                })

    return anomalies


def build_variance_table(rows):
    parsed = [{**r, "_date": _parse_date(r["date"])} for r in rows]
    by_account_month = defaultdict(lambda: defaultdict(float))
    for r in parsed:
        month_key = r["_date"].strftime("%Y-%m")
        by_account_month[r["account"]][month_key] += r["amount"]

    all_months = sorted({m for months in by_account_month.values() for m in months})
    table = []
    for account, months in by_account_month.items():
        entry = {"account": account, "by_month": {}, "change_pct": None}
        for i, month in enumerate(all_months):
            current = months.get(month, 0.0)
            entry["by_month"][month] = round(abs(current), 2)  # display as positive spend
            if i == len(all_months) - 1 and i > 0:
                prior_month = all_months[i - 1]
                prior = months.get(prior_month, 0.0)
                if prior != 0:
                    entry["change_pct"] = round(((abs(current) - abs(prior)) / abs(prior)) * 100, 1)
        table.append(entry)

    table.sort(key=lambda e: e["by_month"].get(all_months[-1], 0) if all_months else 0, reverse=True)
    return table, all_months


def build_summary(anomalies, variance_table, all_months):
    if DEMO_MODE:
        return _build_demo_summary(anomalies, variance_table, all_months)
    return _build_ai_summary(anomalies, variance_table, all_months)


def _build_demo_summary(anomalies, variance_table, all_months):
    if not all_months:
        return "Not enough data to summarize."
    biggest_mover = max(
        (row for row in variance_table if row["change_pct"] is not None),
        key=lambda r: abs(r["change_pct"]), default=None,
    )
    parts = []
    if biggest_mover:
        direction = "increased" if biggest_mover["change_pct"] > 0 else "decreased"
        parts.append(
            f"{biggest_mover['account']} {direction} {abs(biggest_mover['change_pct']):.0f}% "
            f"versus the prior month — the largest movement of any account this period."
        )
    parts.append(f"{len(anomalies)} item(s) were flagged for review this period.")
    return " ".join(parts)


def _build_ai_summary(anomalies, variance_table, all_months):
    context = {"months_covered": all_months, "variance_by_account": variance_table, "anomalies": anomalies}
    prompt = f"""You are a financial controller writing a month-end executive summary
from general ledger analysis. Be concise (4-6 sentences), specific, and reference
actual account names and numbers from the data below. Highlight the most important
movements and the most important anomalies to review.

DATA:
{context}

Write the executive summary now:"""
    response = client.messages.create(
        model="claude-sonnet-5", max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


def answer_question(question, rows, anomalies, variance_table, all_months):
    if DEMO_MODE:
        return _answer_demo(question, rows, anomalies)
    return _answer_ai(question, variance_table, anomalies)


def _answer_demo(question, rows, anomalies):
    q = question.lower()

    # Try to detect a specific account mentioned in the question first —
    # e.g. "total for salaries" or "cost for rent" should filter to that
    # account, not answer with the grand total across everything.
    accounts = sorted({r["account"] for r in rows}, key=len, reverse=True)
    mentioned_account = None
    for acc in accounts:
        acc_lower = acc.lower()
        variations = {acc_lower, acc_lower + "s", acc_lower.rstrip("s")}
        if any(v in q for v in variations if v):
            mentioned_account = acc
            break

    if mentioned_account and ("total" in q or "spend" in q or "cost" in q or "how much" in q):
        total = sum(abs(r["amount"]) for r in rows if r["account"] == mentioned_account)
        count = sum(1 for r in rows if r["account"] == mentioned_account)
        return f"Total for {mentioned_account}: {total:.2f} across {count} transaction(s)."

    if "largest" in q or "biggest" in q:
        if "anomal" in q or "flag" in q:
            if anomalies:
                a = anomalies[0]
                return f"The first flagged item: {a['type']} — {a['detail']}"
            return "No anomalies flagged."
        biggest = max(rows, key=lambda r: abs(r["amount"]))
        return f"Largest transaction: {biggest['account']} — {abs(biggest['amount']):.2f} on {biggest['date']} ({biggest['description']})"
    if "total" in q:
        total = sum(abs(r["amount"]) for r in rows)
        return f"Total spend across all transactions: {total:.2f}"
    if "how many" in q and "anomal" in q:
        return f"{len(anomalies)} anomalies flagged."
    return ("Demo mode Q&A only understands a few patterns — try asking about the "
            "'largest transaction', 'largest anomaly', 'total', or 'total for [account name]'. "
            "Add a real API key for open-ended questions.")


def _answer_ai(question, variance_table, anomalies):
    context = {"variance_by_account": variance_table, "anomalies": anomalies}
    prompt = f"""You are a financial analyst answering a question about general ledger
data. Here is the analyzed data:

{context}

Question: {question}

Answer concisely and specifically, referencing real numbers from the data."""
    response = client.messages.create(
        model="claude-sonnet-5", max_tokens=250,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()