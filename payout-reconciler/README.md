# Multi-Channel Payout Reconciler

Matches e-commerce orders (Shopify, Stripe, PayPal, Amazon) to their
payouts, checks whether the fee deducted matches what that channel
should actually charge, and flags overdue or unexplained discrepancies.

**Runs 100% free — no API key required.** The summary is template-based
by default. An optional AI upgrade path exists (see below) but nothing
in this app requires it to be fully functional.

## Folder structure

```
payout-reconciler/
├── backend/
│   ├── main.py           API route (/api/reconcile)
│   ├── reconciler.py      matching + fee benchmarking + anomaly detection
│   └── requirements.txt   (no anthropic package needed by default)
├── frontend/
│   └── src/components/
│       ├── DualUpload.jsx
│       ├── SummaryAndChart.jsx   summary card + fee-rate-by-channel chart
│       ├── PayoutsTable.jsx
│       └── AnomaliesAndUnpaid.jsx
├── orders.csv    sample data
└── payouts.csv   sample data (with built-in anomalies)
```

## Running it locally

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

```bash
cd frontend
npm install
npm run dev
```

Open `localhost:5173`, upload `orders.csv` into the left box and
`payouts.csv` into the right box (both in the project root), click
**Reconcile payouts**.

## CSV format required

**orders.csv**: `OrderID, Date, Channel, GrossAmount`
**payouts.csv**: `PayoutID, Date, Channel, NetAmount, OrderIDs` — where
`OrderIDs` is a semicolon-separated list of the order IDs included in
that payout (e.g. `S1001;S1002`).

## How the fee benchmarking works

Each channel has a known typical fee structure (percentage + fixed fee
per order) built into `reconciler.py`. For every payout, the expected
fee is calculated from its matched orders and compared to what was
actually deducted. Anything off by more than 15% gets flagged.
Additionally, each channel's fee rate across all its payouts is checked
statistically (same z-score technique as the GL Analyzer project) to
catch gradual or unusual fee-rate shifts a simple threshold might miss.

## Optional: adding real AI later
If you ever want the summary written by Claude instead of a template,
`pip install anthropic` and add a real key (starting `sk-ant-`) to a
`.env` file in `backend/`. `reconciler.py` detects this automatically —
no other code changes needed.
