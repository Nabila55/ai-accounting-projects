"""
AI General Ledger Analyzer — Quick Version
---------------------------------------------
Reads a General Ledger CSV and performs the kind of review a controller
does at month-end:
  1. Flags anomalies (duplicates, round-number entries, weekend postings,
     statistical outliers per account)
  2. Builds a month-over-month variance table per account
  3. Writes a plain-English executive summary (AI mode if a real Claude
     API key is configured, otherwise a free template-based summary)
  4. Opens a simple Q&A prompt so you can ask follow-up questions about
     the data

SETUP:
1. pip install anthropic --break-system-packages   (only needed for AI mode —
   the tool still runs fully without it, using free template-based analysis)
2. Prepare general_ledger.csv with columns: Date, Account, Description, Amount
3. Run: python gl_analyzer.py

AI MODE vs DEMO MODE:
If a real Anthropic API key (starting with "sk-ant-") is set in the
ANTHROPIC_API_KEY environment variable, this runs in AI mode — the
executive summary and Q&A are written by Claude. Otherwise it
automatically falls back to demo mode: a template-based summary and a
small set of pattern-matched answers, at no cost.
"""

import csv
import os
import statistics
from collections import defaultdict
from datetime import datetime

# --- Mode detection, same pattern as the other projects -------------------

_raw_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
DEMO_MODE = not _raw_key.startswith("sk-ant-")

client = None
if not DEMO_MODE:
    try:
        import anthropic
        client = anthropic.Anthropic()
    except Exception as e:
        print(f"[gl_analyzer] Falling back to demo mode: {e}")
        DEMO_MODE = True

ROUND_NUMBER_THRESHOLD = 500   # flag amounts that are exact multiples of this
OUTLIER_Z_SCORE = 2.0          # how many standard deviations counts as "unusual"
MIN_TXNS_FOR_OUTLIER_CHECK = 4  # need enough history per account to judge outliers


# --- Loading ----------------------------------------------------------------

def load_ledger(filepath):
    rows = []
    with open(filepath, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append({
                "date": datetime.strptime(row["Date"].strip(), "%Y-%m-%d"),
                "account": row["Account"].strip(),
                "description": row["Description"].strip(),
                "amount": round(float(row["Amount"]), 2),
            })
    return rows


# --- Anomaly detection -------------------------------------------------------

def find_anomalies(rows):
    anomalies = []

    # Duplicates: same account + same amount + same date
    seen = defaultdict(list)
    for r in rows:
        key = (r["account"], r["amount"], r["date"].date())
        seen[key].append(r)
    for key, group in seen.items():
        if len(group) > 1:
            anomalies.append({
                "type": "Possible duplicate",
                "detail": f'{len(group)} identical entries: {group[0]["account"]} / '
                          f'{group[0]["amount"]:.2f} on {group[0]["date"].date()}',
            })

    # Round-number entries — often worth a second look
    for r in rows:
        if r["amount"] != 0 and abs(r["amount"]) % ROUND_NUMBER_THRESHOLD == 0:
            anomalies.append({
                "type": "Round-number entry",
                "detail": f'{r["account"]}: {r["amount"]:.2f} on {r["date"].date()} — "{r["description"]}"',
            })

    # Weekend postings
    for r in rows:
        if r["date"].weekday() >= 5:
            anomalies.append({
                "type": "Weekend posting",
                "detail": f'{r["account"]}: {r["amount"]:.2f} on {r["date"].date()} '
                          f'({r["date"].strftime("%A")}) — "{r["description"]}"',
            })

    # Statistical outliers per account
    by_account = defaultdict(list)
    for r in rows:
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
                    "detail": f'{account}: {t["amount"]:.2f} on {t["date"].date()} is '
                              f'{z:.1f}x the account\'s typical variation '
                              f'(account average: {mean:.2f})',
                })

    return anomalies


# --- Variance analysis --------------------------------------------------

def build_variance_table(rows):
    by_account_month = defaultdict(lambda: defaultdict(float))
    for r in rows:
        month_key = r["date"].strftime("%Y-%m")
        by_account_month[r["account"]][month_key] += r["amount"]

    all_months = sorted({m for months in by_account_month.values() for m in months})
    table = []
    for account, months in by_account_month.items():
        row = {"account": account}
        for i, month in enumerate(all_months):
            current = months.get(month, 0.0)
            row[month] = current
            if i > 0:
                prior_month = all_months[i - 1]
                prior = months.get(prior_month, 0.0)
                if prior != 0:
                    # Use absolute values for the percent change so direction
                    # (increase/decrease) reflects actual spending magnitude,
                    # regardless of whether expenses are stored as negative
                    # numbers in this ledger.
                    pct_change = ((abs(current) - abs(prior)) / abs(prior)) * 100
                    row[f"{month}_change_pct"] = pct_change
        table.append(row)
    return table, all_months


# --- Narrative summary --------------------------------------------------

def build_demo_summary(anomalies, variance_table, all_months):
    if not all_months:
        return "Not enough data to summarize."

    latest_month = all_months[-1]
    biggest_mover = None
    biggest_change = 0
    for row in variance_table:
        change_key = f"{latest_month}_change_pct"
        if change_key in row and abs(row[change_key]) > abs(biggest_change):
            biggest_change = row[change_key]
            biggest_mover = row["account"]

    lines = [f"MONTH-END SUMMARY — {latest_month} (template-based, demo mode)\n"]
    if biggest_mover:
        direction = "increased" if biggest_change > 0 else "decreased"
        lines.append(
            f"- {biggest_mover} {direction} {abs(biggest_change):.0f}% versus the prior month — "
            f"the largest movement of any account this period."
        )
    lines.append(f"- {len(anomalies)} item(s) flagged for review this period.")
    if anomalies:
        by_type = defaultdict(int)
        for a in anomalies:
            by_type[a["type"]] += 1
        for t, count in by_type.items():
            lines.append(f"  - {count} {t.lower()}(s)")
    return "\n".join(lines)


def build_ai_summary(anomalies, variance_table, all_months):
    context = {
        "months_covered": all_months,
        "variance_by_account": variance_table,
        "anomalies": anomalies,
    }
    prompt = f"""You are a financial controller writing a month-end executive summary
from general ledger analysis. Be concise (5-8 sentences), specific, and reference
actual account names and numbers from the data below. Highlight the most important
movements and the most important anomalies to review — don't just list everything.

DATA:
{context}

Write the executive summary now:"""

    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


# --- Q&A ---------------------------------------------------------------

def answer_question_demo(question, rows, anomalies, variance_table, all_months):
    q = question.lower()
    if "largest" in q or "biggest" in q:
        if "anomal" in q or "flag" in q:
            if anomalies:
                a = anomalies[0]
                return f"The first flagged item: {a['type']} — {a['detail']}"
            return "No anomalies flagged."
        # largest single transaction
        biggest = max(rows, key=lambda r: abs(r["amount"]))
        return f"Largest transaction: {biggest['account']} — {biggest['amount']:.2f} on {biggest['date'].date()} ({biggest['description']})"
    if "total" in q:
        total = sum(r["amount"] for r in rows)
        return f"Total across all transactions: {total:.2f}"
    if "how many" in q and "anomal" in q:
        return f"{len(anomalies)} anomalies flagged."
    return ("Demo mode Q&A only understands a few patterns (try asking about the "
            "'largest transaction', 'largest anomaly', or 'total'). Switch on AI mode "
            "for open-ended questions about this data.")


def answer_question_ai(question, rows, anomalies, variance_table, all_months):
    context = {
        "variance_by_account": variance_table,
        "anomalies": anomalies,
        "total_transactions": len(rows),
    }
    prompt = f"""You are a financial analyst answering a question about general ledger
data. Here is the analyzed data (variance table and flagged anomalies):

{context}

Question: {question}

Answer concisely and specifically, referencing real numbers from the data."""

    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


# --- Main ----------------------------------------------------------------

def main():
    try:
        rows = load_ledger("general_ledger.csv")
    except FileNotFoundError:
        print("Could not find general_ledger.csv in this folder.")
        return

    print(f"Loaded {len(rows)} transactions. Mode: {'DEMO (free, template-based)' if DEMO_MODE else 'AI (Claude)'}\n")

    anomalies = find_anomalies(rows)
    variance_table, all_months = build_variance_table(rows)

    print("=" * 70)
    if DEMO_MODE:
        print(build_demo_summary(anomalies, variance_table, all_months))
    else:
        print(build_ai_summary(anomalies, variance_table, all_months))
    print("=" * 70)

    print(f"\n--- Flagged items ({len(anomalies)}) ---")
    for a in anomalies:
        print(f"  [{a['type']}] {a['detail']}")

    print(f"\n--- Variance by account across {len(all_months)} month(s): {', '.join(all_months)} ---")
    for row in variance_table:
        parts = [row["account"]]
        for m in all_months:
            parts.append(f"{m}: {row.get(m, 0):.2f}")
        print("  " + " | ".join(parts))

    print("\n--- Ask a question about this data (type 'quit' to exit) ---")
    while True:
        question = input("\n> ").strip()
        if question.lower() in ("quit", "exit", ""):
            break
        if DEMO_MODE:
            print(answer_question_demo(question, rows, anomalies, variance_table, all_months))
        else:
            print(answer_question_ai(question, rows, anomalies, variance_table, all_months))


if __name__ == "__main__":
    main()
