# Simple, small production image for the FastAPI backend.
# This same Dockerfile is what AWS App Runner or ECS will build and run.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# App Runner/ECS expect the container to listen on a port — 8000 here.
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
