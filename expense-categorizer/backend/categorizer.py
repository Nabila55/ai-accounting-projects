"""
categorizer.py — the AI logic, isolated from the web server code
"""

import os
import json

CATEGORIES = [
    "Advertising", "Marketing", "Inventory", "Shipping", "Software",
    "Office Supplies", "Utilities", "Bank Fees", "Taxes", "Travel",
    "Salaries", "Rent", "Other",
]

BATCH_SIZE = 25
MODEL = "claude-sonnet-5"

_raw_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
DEMO_MODE = not _raw_key.startswith("sk-ant-")

client = None
if not DEMO_MODE:
    try:
        import anthropic
        client = anthropic.Anthropic()
    except Exception as e:
        print(f"[categorizer] Falling back to demo mode: {e}")
        DEMO_MODE = True

_DEMO_KEYWORDS = {
    "Advertising": ["ad", "ads", "facebook ads", "google ads", "linkedin ads", "instagram ads", "ppc", "sponsor"],
    "Marketing": ["marketing", "seo", "email campaign", "newsletter", "promo", "influencer"],
    "Inventory": ["inventory", "supplier", "restock", "wholesale", "stock purchase", "raw materials"],
    "Shipping": ["shipping", "fedex", "ups", "dhl", "postage", "freight", "courier"],
    "Software": ["subscription", "saas", "aws", "azure", "google workspace", "microsoft 365",
                 "canva", "adobe", "software", "hosting", "domain", "github", "notion", "slack", "zoom"],
    "Office Supplies": ["staples", "office supplies", "office depot", "stationery", "printer ink"],
    "Utilities": ["electric", "utility", "utilities", "water bill", "gas bill", "internet bill"],
    "Bank Fees": ["bank fee", "maintenance fee", "overdraft", "wire fee", "atm fee", "interest charge"],
    "Taxes": ["tax", "irs", "vat", "estimated tax"],
    "Travel": ["flight", "airlines", "hotel", "uber", "lyft", "taxi", "airbnb", "travel", "rental car"],
    "Salaries": ["payroll", "salary", "salaries", "wages", "paycheck"],
    "Rent": ["rent", "lease", "office rent"],
}


def _categorize_demo(description: str) -> str:
    text = description.lower()
    for category, keywords in _DEMO_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text:
                return category
    return "Other"


def _build_prompt(batch):
    numbered_lines = "\n".join(
        f'{i}. description="{t["description"]}", amount={t["amount"]}'
        for i, t in enumerate(batch)
    )
    return f"""You are helping categorize business expense transactions for bookkeeping.

Categorize EACH transaction below into EXACTLY ONE of these categories:
{", ".join(CATEGORIES)}

Transactions:
{numbered_lines}

Respond with ONLY a JSON array, no other text, no markdown code fences.
Each element must be: {{"index": <number>, "category": "<one of the categories above>"}}
The array must have exactly {len(batch)} elements, one per transaction, in the same order."""


def _categorize_batch_ai(batch):
    prompt = _build_prompt(batch)
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    raw_text = response.content[0].text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`")
        raw_text = raw_text.replace("json", "", 1).strip()
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        return ["Other"] * len(batch)
    result_by_index = {item.get("index"): item.get("category") for item in parsed}
    categories = []
    for i in range(len(batch)):
        category = result_by_index.get(i)
        categories.append(category if category in CATEGORIES else "Other")
    return categories


def categorize_transactions(transactions):
    results = []
    if DEMO_MODE:
        for t in transactions:
            results.append({**t, "category": _categorize_demo(t["description"])})
        return results
    for start in range(0, len(transactions), BATCH_SIZE):
        batch = transactions[start:start + BATCH_SIZE]
        categories = _categorize_batch_ai(batch)
        for t, category in zip(batch, categories):
            results.append({**t, "category": category})
    return results