"""
main.py — FastAPI application entrypoint for the Payout Reconciler.

No API key required — this runs fully for free. See reconciler.py for
the optional AI upgrade path.
"""

import csv
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from reconciler import reconcile

app = FastAPI(title="Multi-Channel Payout Reconciler", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "payout-reconciler-backend"}


def _parse_csv(raw_bytes, required_cols, source_name):
    try:
        text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail=f"Could not read {source_name}. Please save as UTF-8 CSV.")

    reader = csv.DictReader(io.StringIO(text))
    fieldnames = {name.lower().strip(): name for name in (reader.fieldnames or [])}
    missing = [c for c in required_cols if c.lower() not in fieldnames]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"{source_name} is missing required column(s): {', '.join(missing)}."
        )
    return reader, fieldnames


@app.post("/api/reconcile")
async def reconcile_endpoint(
    orders_file: UploadFile = File(...),
    payouts_file: UploadFile = File(...),
):
    if not orders_file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Orders file must be a .csv file.")
    if not payouts_file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Payouts file must be a .csv file.")

    orders_reader, of = _parse_csv(
        await orders_file.read(), ["OrderID", "Date", "Channel", "GrossAmount"], "Orders file"
    )
    order_rows = []
    for row in orders_reader:
        try:
            gross = round(float(row[of["grossamount"]]), 2)
        except (ValueError, TypeError):
            gross = 0.0
        order_rows.append({
            "order_id": row[of["orderid"]].strip(),
            "date": row[of["date"]].strip(),
            "channel": row[of["channel"]].strip(),
            "gross": gross,
        })
    if not order_rows:
        raise HTTPException(status_code=400, detail="No rows found in the orders file.")

    payouts_reader, pf = _parse_csv(
        await payouts_file.read(), ["PayoutID", "Date", "Channel", "NetAmount", "OrderIDs"], "Payouts file"
    )
    payout_rows = []
    for row in payouts_reader:
        try:
            net = round(float(row[pf["netamount"]]), 2)
        except (ValueError, TypeError):
            net = 0.0
        payout_rows.append({
            "payout_id": row[pf["payoutid"]].strip(),
            "date": row[pf["date"]].strip(),
            "channel": row[pf["channel"]].strip(),
            "net_amount": net,
            "order_ids": row[pf["orderids"]].strip(),
        })
    if not payout_rows:
        raise HTTPException(status_code=400, detail="No rows found in the payouts file.")

    return reconcile(order_rows, payout_rows)
