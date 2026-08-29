"""
main.py — FastAPI application entrypoint

WHAT THIS FILE DOES:
This is the "front door" of our backend. It defines the API routes (URLs)
that the React frontend calls. In cloud terms, this whole file becomes
the code that runs inside your AWS compute (App Runner / EC2 / Lambda) —
think of it as the "server" half of the app.

ROUTES:
- GET  /api/health        -> simple check that the server is alive
- POST /api/categorize    -> accepts a CSV upload, returns categorized rows as JSON

We deliberately keep this STATELESS: no database, no user accounts.
The file is processed in memory and the result is handed straight back.
This keeps the architecture simple, which matters a lot for an MVP.
"""

import csv
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from categorizer import categorize_transactions, CATEGORIES

app = FastAPI(title="AI Expense Categorization Tool", version="1.0.0")

# CORS: allows the React frontend (running on a different origin/port)
# to call this API from the browser. In production, replace "*" with
# your actual frontend domain (e.g. https://app.yourdomain.com) for security.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    """Simple endpoint so you (or AWS health checks) can confirm the API is running."""
    return {"status": "ok", "service": "expense-categorizer-backend"}


@app.post("/api/categorize")
async def categorize_csv(file: UploadFile = File(...)):
    """
    Accepts a CSV file with columns: Date, Description, Amount
    Returns each row with an added "category" field, chosen by the AI model.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file.")

    raw_bytes = await file.read()
    try:
        text = raw_bytes.decode("utf-8-sig")  # utf-8-sig handles CSVs saved from Excel
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Could not read file. Please save as UTF-8 CSV.")

    reader = csv.DictReader(io.StringIO(text))

    # Normalize header names so "date"/"Date"/"DATE" all work the same way.
    fieldnames = {name.lower().strip(): name for name in (reader.fieldnames or [])}
    required = ["date", "description", "amount"]
    missing = [col for col in required if col not in fieldnames]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required column(s): {', '.join(missing)}. "
                   f"Required columns are: Date, Description, Amount."
        )

    transactions = []
    for row in reader:
        try:
            amount = float(row[fieldnames["amount"]])
        except (ValueError, TypeError):
            amount = 0.0
        transactions.append({
            "date": row[fieldnames["date"]].strip(),
            "description": row[fieldnames["description"]].strip(),
            "amount": amount,
        })

    if not transactions:
        raise HTTPException(status_code=400, detail="No transaction rows found in the CSV.")

    # This is the actual AI step — see categorizer.py for how it works.
    categorized = categorize_transactions(transactions)

    return {
        "count": len(categorized),
        "categories_used": CATEGORIES,
        "transactions": categorized,
    }
