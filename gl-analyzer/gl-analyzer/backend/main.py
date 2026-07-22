"""
main.py — FastAPI application entrypoint for the GL Analyzer

Routes:
- GET  /api/health     — server check
- POST /api/analyze    — upload a GL CSV, get back anomalies, variance,
                         and an AI (or template) executive summary
- POST /api/ask        — ask a follow-up question about the last analysis
"""

import csv
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from analyzer import (
    find_anomalies, build_variance_table, build_summary, answer_question, DEMO_MODE,
)

app = FastAPI(title="AI General Ledger Analyzer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory store of the last analysis, so /api/ask has context
# to answer follow-up questions without re-uploading the file. Fine for
# a single-user MVP with no accounts — matches the "no database" scope
# of the other tools in this series.
_last_analysis = {"rows": None, "anomalies": None, "variance_table": None, "all_months": None}


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "gl-analyzer-backend", "mode": "demo" if DEMO_MODE else "ai"}


def _parse_csv(raw_bytes: bytes):
    try:
        text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Could not read file. Please save as UTF-8 CSV.")

    reader = csv.DictReader(io.StringIO(text))
    fieldnames = {name.lower().strip(): name for name in (reader.fieldnames or [])}
    required = ["date", "account", "description", "amount"]
    missing = [col for col in required if col not in fieldnames]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required column(s): {', '.join(missing)}. "
                   f"Required columns are: Date, Account, Description, Amount."
        )

    rows = []
    for row in reader:
        try:
            amount = round(float(row[fieldnames["amount"]]), 2)
        except (ValueError, TypeError):
            amount = 0.0
        rows.append({
            "date": row[fieldnames["date"]].strip(),
            "account": row[fieldnames["account"]].strip(),
            "description": row[fieldnames["description"]].strip(),
            "amount": amount,
        })

    if not rows:
        raise HTTPException(status_code=400, detail="No transaction rows found in the CSV.")
    return rows


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file.")

    rows = _parse_csv(await file.read())
    anomalies = find_anomalies(rows)
    variance_table, all_months = build_variance_table(rows)
    summary = build_summary(anomalies, variance_table, all_months)

    _last_analysis["rows"] = rows
    _last_analysis["anomalies"] = anomalies
    _last_analysis["variance_table"] = variance_table
    _last_analysis["all_months"] = all_months

    return {
        "mode": "demo" if DEMO_MODE else "ai",
        "summary": summary,
        "anomalies": anomalies,
        "variance_table": variance_table,
        "months": all_months,
        "transaction_count": len(rows),
        "transactions": rows,
    }


class Question(BaseModel):
    question: str


@app.post("/api/ask")
async def ask(payload: Question):
    if _last_analysis["rows"] is None:
        raise HTTPException(status_code=400, detail="Run an analysis first before asking questions.")

    answer = answer_question(
        payload.question,
        _last_analysis["rows"],
        _last_analysis["anomalies"],
        _last_analysis["variance_table"],
        _last_analysis["all_months"],
    )
    return {"answer": answer}