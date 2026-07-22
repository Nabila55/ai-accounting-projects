# Bank Reconciliation & Month-End Close Assistant

A full-stack MVP that matches a bank statement against a general ledger
export, flags mismatches and unmatched items, and produces a downloadable
reconciliation report — no AI, no cost, pure logic.

## Folder structure

```
bank-reconciler/
├── backend/                FastAPI app
│   ├── main.py               API routes
│   ├── reconciler.py         matching logic (date + amount + description)
│   └── requirements.txt
├── frontend/                React + Tailwind app (same design system as
│   └── src/                 the AI Expense Categorization Tool)
├── bank_statement.csv        sample data for testing
└── general_ledger.csv        sample data for testing
```

## Running it locally

Same routine as the expense categorizer project:

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Then open the `localhost:5173` link, upload `bank_statement.csv` and
`general_ledger.csv` (from the project root), and click **Run
reconciliation**.

## How matching works

1. Transactions are paired by date (within 3 days) and amount (exact match).
2. If dates/description are close but the amount differs, it's flagged as
   a **mismatch** — the exact dollar difference is shown.
3. Anything left over after matching is **unmatched** — split by whether
   it appeared only in the bank statement or only in the general ledger.

This mirrors how a real reconciliation is actually performed by hand,
just automated.
