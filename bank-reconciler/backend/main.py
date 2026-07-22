"""
main.py — FastAPI application entrypoint

Accepts two CSV uploads (bank statement + general ledger), reconciles
them, and returns a structured JSON result the frontend can render as
a dashboard.
"""

import csv
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from reconciler import reconcile_transactions

app = FastAPI(title="Bank Reconciliation & Month-End Close Assistant", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "bank-reconciler-backend"}


def _parse_csv(raw_bytes: bytes, source_name: str):
    try:
        text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail=f"Could not read {source_name}. Please save as UTF-8 CSV.")

    reader = csv.DictReader(io.StringIO(text))
    fieldnames = {name.lower().strip(): name for name in (reader.fieldnames or [])}
    required = ["date", "description", "amount"]
    missing = [col for col in required if col not in fieldnames]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"{source_name} is missing required column(s): {', '.join(missing)}. "
                   f"Required columns are: Date, Description, Amount."
        )

    rows = []
    for row in reader:
        try:
            amount = round(float(row[fieldnames["amount"]]), 2)
        except (ValueError, TypeError):
            amount = 0.0
        rows.append({
            "date": row[fieldnames["date"]].strip(),
            "description": row[fieldnames["description"]].strip(),
            "amount": amount,
        })

    if not rows:
        raise HTTPException(status_code=400, detail=f"No transaction rows found in {source_name}.")
    return rows


@app.post("/api/reconcile")
async def reconcile(
    bank_statement: UploadFile = File(...),
    general_ledger: UploadFile = File(...),
):
    if not bank_statement.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Bank statement must be a .csv file.")
    if not general_ledger.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="General ledger must be a .csv file.")

    bank_rows = _parse_csv(await bank_statement.read(), "Bank statement")
    gl_rows = _parse_csv(await general_ledger.read(), "General ledger")

    result = reconcile_transactions(bank_rows, gl_rows)
    return result
