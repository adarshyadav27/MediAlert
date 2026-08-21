# MedAlert Lucknow

MedAlert Lucknow is a hackathon-ready emergency care dashboard for connecting patients and responders with local triage guidance, hospitals, donor records, and Uttar Pradesh government health schemes.

## Features

- Rule-based trauma triage with RED, AMBER, and GREEN urgency levels
- One-click SOS countdown for the India emergency number, 112
- CSV-backed Lucknow hospital finder with area, specialty, and emergency filters
- Mock blood and organ donor registry endpoint
- Searchable Ayushman Bharat and Uttar Pradesh scheme directory
- Starter surfaces for OCR, care chatbot, Health ID, and nearby support workflows

## Run locally

```powershell
cd medialert-lucknow\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000 in a browser.

On macOS or Linux, activate the environment with `source .venv/bin/activate`.

## API endpoints

- `GET /api/health`
- `GET /api/hospitals?area=Gomti%20Nagar&specialty=Cardiology&emergency=true`
- `GET /api/donors?blood_group=O%2B`
- `GET /api/schemes?q=Ayushman`
- `POST /api/triage` with `{ "symptoms": ["chest pain"], "vitals": { "oxygen": 98, "heart_rate": 80 } }`

## Project layout

```text
backend/       Flask app, reusable utilities, and CSV demo data
frontend/      Jinja templates, CSS, and browser-side API interactions
```

## Important note

This project contains mock data and a deliberately simple rules engine for demonstration. It is not medical advice, a diagnosis, or a replacement for emergency services. Call 112 for immediate danger and verify all hospital, donor, and scheme details before acting.
