# Pelayo Email OTP API (Cloud Run)

Serverless backend that sends and verifies real email OTP codes for the Pelayo Wellness web app.

> OTP state is stored in-memory inside the Cloud Run container. If the instance restarts, pending codes expire immediately and users must request a new code.

## Endpoints
- `GET /health`
- `POST /v1/email-otp/request`
- `POST /v1/email-otp/verify`

## Required env vars
- `AGENTMAIL_API_KEY` (secret)
- `OTP_PEPPER` (secret)
- `AGENTMAIL_INBOX` (default: `jackbot@agentmail.to`)
- `ALLOWED_ORIGINS` (comma-separated frontend origins)

## Local run
```bash
cd /root/clawd/projects/gym-app/email-otp-api
npm install
AGENTMAIL_API_KEY=... OTP_PEPPER=... ALLOWED_ORIGINS=http://localhost:5173 npm start
```

## Deploy (Cloud Run)
```bash
gcloud run deploy pelayo-email-otp-api \
  --source /root/clawd/projects/gym-app/email-otp-api \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars AGENTMAIL_INBOX=jackbot@agentmail.to,ALLOWED_ORIGINS=https://jackten.github.io,http://localhost:5173 \
  --set-secrets AGENTMAIL_API_KEY=agentmail-api-key:latest,OTP_PEPPER=pelayo-otp-pepper:latest
```
