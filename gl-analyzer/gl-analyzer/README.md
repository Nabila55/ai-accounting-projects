# AI General Ledger Analyzer

A full-stack MVP that reviews a general ledger like a controller would:
flags anomalies, builds a month-over-month variance table, writes an
executive summary, and answers follow-up questions — all through a
white/purple dashboard matching the rest of this project series.

## Folder structure

```
gl-analyzer/
├── backend/
│   ├── main.py           API routes (/api/analyze, /api/ask)
│   ├── analyzer.py       anomaly detection, variance math, AI summary/Q&A
│   ├── requirements.txt
│   └── .env.example      optional — add a real key to switch on AI mode
├── frontend/
│   └── src/components/
│       ├── UploadCard.jsx
│       ├── SummaryCard.jsx       AI/template executive summary
│       ├── AnomaliesList.jsx     severity-flagged anomaly feed
│       ├── VarianceChart.jsx     month-over-month bar chart
│       └── ChatWidget.jsx        follow-up Q&A about the data
└── general_ledger.csv    sample data with built-in anomalies
```

## Running it locally

Same routine as the other two projects:

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

Open `localhost:5173`, upload `general_ledger.csv` (from the project
root), click **Analyze ledger**.

## Demo mode vs AI mode

Same pattern as the expense categorizer: no key (or an invalid one) in
`backend/.env` runs free demo mode — a template-based summary and
pattern-matched chat answers. Add a real key starting with `sk-ant-` to
switch on full AI-generated summaries and open-ended chat, automatically.

## What makes this one different from the first two

The anomaly detection and variance math are pure statistics — no AI
involved, and that's deliberate, since rule-based checks are more
reliable for that kind of work. AI is used specifically where it adds
real value: turning structured data into a written explanation, and
answering open-ended questions a fixed report can't anticipate.
