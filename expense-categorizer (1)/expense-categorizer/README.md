# AI Expense Categorization Tool

An MVP that lets small businesses, freelancers, and agencies upload a CSV of
expenses and get them automatically sorted into bookkeeping categories using
an AI model — no manual tagging.

## Folder structure

```
expense-categorizer/
├── backend/              FastAPI app — accepts CSV uploads, calls the AI model
│   ├── main.py            API routes (the "web" layer)
│   ├── categorizer.py      AI categorization logic (the "AI" layer, kept separate)
│   ├── requirements.txt
│   ├── Dockerfile          used for AWS deployment
│   └── .env.example        copy to .env and add your API key
│
└── frontend/              React + Tailwind single-page app
    ├── src/
    │   ├── App.jsx                 main page layout and state
    │   ├── components/
    │   │   ├── UploadCard.jsx       drag-and-drop CSV upload
    │   │   ├── ProgressIndicator.jsx   animated "AI is working" state
    │   │   └── ResultsTable.jsx     categorized results + CSV download
    │   └── index.css
    └── .env.example         set VITE_API_URL to your backend's address
```

No database and no authentication — by design, to keep this MVP simple.
Each upload is processed in memory and handed straight back to the browser.

---

## Running it locally

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then paste your real Anthropic API key into .env
uvicorn main:app --reload
```

Backend will run at `http://localhost:8000`. Check `http://localhost:8000/api/health`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env            # defaults to localhost:8000, fine for local dev
npm run dev
```

Frontend will run at `http://localhost:5173`.

---

## Deploying to AWS (kept intentionally simple)

You don't need Kubernetes or a complex VPC setup for an MVP. Here's the
simplest path that still counts as "real" production infrastructure:

### Backend → AWS App Runner
App Runner takes a Dockerfile and gives you a running, auto-scaling, HTTPS
API with almost no configuration — much simpler than EC2 or ECS for a first
deployment.

1. Push this repo to GitHub (or push the `backend/` folder as its own repo).
2. In the AWS Console, go to **App Runner → Create service**.
3. Choose "Source code repository", connect your GitHub repo, point it at
   the `backend/` folder and its `Dockerfile`.
4. Under **Environment variables**, add `ANTHROPIC_API_KEY` with your real key.
   (Never put real keys in your code or in GitHub.)
5. Deploy. App Runner gives you a public HTTPS URL — save it, you'll need it
   for the frontend's `VITE_API_URL`.

### Frontend → S3 + CloudFront
The standard, simple pattern for hosting a static React build.

1. Set `VITE_API_URL` in `frontend/.env` to your App Runner URL from above.
2. Build the static site:
   ```bash
   cd frontend
   npm run build
   ```
   This creates a `dist/` folder.
3. Create an S3 bucket, enable static website hosting, and upload the
   contents of `dist/`.
4. (Recommended, not required for MVP) Put a CloudFront distribution in
   front of the bucket for HTTPS and caching.

That's the whole deployment: one App Runner service for the API, one S3
bucket (optionally behind CloudFront) for the frontend. No servers to patch,
no orchestration to manage.

---

## Swapping in OpenAI instead of Claude

The AI logic is isolated in `backend/categorizer.py`. To use OpenAI instead,
replace the `anthropic.Anthropic()` client and the `_categorize_batch`
function's API call with the OpenAI SDK equivalent — the rest of the app
(routes, frontend, CSV handling) doesn't need to change at all. That's the
benefit of keeping the AI logic in its own file.

## CSV format required

```csv
Date,Description,Amount
2026-06-01,Facebook Ads Campaign,-120.00
2026-06-02,AWS Hosting Bill,-45.50
```
