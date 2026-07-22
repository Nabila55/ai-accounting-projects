"""
reconciler.py — the matching logic, isolated from the web server code

Same reconciliation approach as the quick-start script: match bank
transactions to general ledger entries by date proximity, amount, and
description similarity, then classify each as matched, mismatched, or
unmatched.
"""

from datetime import datetime
from difflib import SequenceMatcher

DATE_TOLERANCE_DAYS = 3
DESCRIPTION_SIMILARITY_THRESHOLD = 0.45
AMOUNT_TOLERANCE = 0.01


def _parse_date(date_str: str) -> datetime:
    # Accept a couple of common formats since real exports vary.
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Unrecognized date format: {date_str}")


def _description_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _find_best_match(bank_txn, gl_pool):
    best = None
    best_score = 0

    for gl_txn in gl_pool:
        if gl_txn["_matched"]:
            continue
        date_diff = abs((bank_txn["_date"] - gl_txn["_date"]).days)
        if date_diff > DATE_TOLERANCE_DAYS:
            continue

        desc_score = _description_similarity(bank_txn["description"], gl_txn["description"])
        amount_matches = abs(bank_txn["amount"] - gl_txn["amount"]) <= AMOUNT_TOLERANCE

        score = (2.0 if amount_matches else 0.0) + desc_score
        if score > best_score:
            best_score = score
            best = gl_txn

    if best is None or best_score < DESCRIPTION_SIMILARITY_THRESHOLD:
        return None, None

    amount_matches = abs(bank_txn["amount"] - best["amount"]) <= AMOUNT_TOLERANCE
    return best, ("exact" if amount_matches else "mismatch")


def reconcile_transactions(bank_rows: list[dict], gl_rows: list[dict]) -> dict:
    bank_txns = [{**t, "_date": _parse_date(t["date"]), "_matched": False} for t in bank_rows]
    gl_txns = [{**t, "_date": _parse_date(t["date"]), "_matched": False} for t in gl_rows]

    matched = []
    mismatches = []

    for bank_txn in bank_txns:
        match, status = _find_best_match(bank_txn, gl_txns)
        if match:
            match["_matched"] = True
            bank_txn["_matched"] = True
            entry = {
                "bank": {"date": bank_txn["date"], "description": bank_txn["description"], "amount": bank_txn["amount"]},
                "gl": {"date": match["date"], "description": match["description"], "amount": match["amount"]},
                "difference": round(bank_txn["amount"] - match["amount"], 2),
            }
            (matched if status == "exact" else mismatches).append(entry)

    unmatched_bank = [
        {"date": t["date"], "description": t["description"], "amount": t["amount"]}
        for t in bank_txns if not t["_matched"]
    ]
    unmatched_gl = [
        {"date": t["date"], "description": t["description"], "amount": t["amount"]}
        for t in gl_txns if not t["_matched"]
    ]

    total_bank = round(sum(t["amount"] for t in bank_rows), 2)
    total_gl = round(sum(t["amount"] for t in gl_rows), 2)

    return {
        "summary": {
            "total_bank": total_bank,
            "total_gl": total_gl,
            "difference": round(total_bank - total_gl, 2),
            "bank_count": len(bank_rows),
            "gl_count": len(gl_rows),
            "matched_count": len(matched),
            "mismatch_count": len(mismatches),
            "unmatched_bank_count": len(unmatched_bank),
            "unmatched_gl_count": len(unmatched_gl),
        },
        "matched": matched,
        "mismatches": mismatches,
        "unmatched_bank": unmatched_bank,
        "unmatched_gl": unmatched_gl,
    }
