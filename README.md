# Surplus-to-Shelter

**Real-time food rescue routing.** Connects restaurants, grocers and caterers with surplus food to nearby shelters and food banks — before it spoils.

## The Problem

Restaurants, grocers and caterers throw away edible surplus food — not because nobody wants it, but because there is no fast way to connect what is available *right now* with who can pick it up within the typical **2–6 hour freshness window**.

## The Solution

A donor posts surplus food in under 60 seconds (photo or text). The system matches it to the best-fit nearby shelter by **expiry fit, distance, capacity and need**, dispatches a volunteer driver over SMS, and tracks the full journey on a live impact dashboard.

## Live Demo

| Part | Link |
| --- | --- |
| Frontend (Vercel) | `https://surplus2shelter.vercel.app` |
| Backend API (Render) | `https://surplus-to-shelter-42z0.onrender.com/docs` |

## The Full Loop

```javascript
posted -> matched -> picked up -> delivered
```

1. **Donor posts** surplus (photo / description / quantity / expiry window / location)
2. **AI intake** parses the photo or text into structured data and computes a **food-safety risk score**
3. **Safety gate** — any item with risk score > 0.7 is **never matched** (auto-rejected)
4. **Matcher** scores every shelter within 15 km: `40% expiry fit + 30% distance + 20% capacity + 10% need` — best score above 0.5 wins in under 2 seconds
5. **Driver gets an SMS** with pickup + dropoff details (Twilio)
6. **Live tracking** — one-tap status updates: accepted → picked up → delivered
7. **Impact dashboard** — meals rescued, kg diverted, CO₂e avoided

## Architecture

```javascript
                            SURPLUS-TO-SHELTER
                Real-time food rescue routing system
                posted -> matched -> picked up -> delivered

+----------------+   +----------------+   +----------------+
|     DONOR      |   |     DRIVER     |   | SHELTER STAFF  |
| Next.js web    |   | Mobile PWA     |   | Dashboard      |
| Posts surplus  |   | accept->pickup |   | Capacity/need  |
| in 60 seconds  |   | ->delivered    |   | Live match feed|
+-------+--------+   +-------+--------+   +-------+--------+
        |                    |                    |
        v                    v                    v
+-------------------------------------------------------------+
|         FRONTEND  --  Next.js 14 + Tailwind  (Vercel)       |
|   /donate form   /driver page   /dashboard  impact stats    |
+---------------------------+---------------------------------+
                            |
                            |  REST API (JSON over HTTPS)
                            |  NEXT_PUBLIC_API_URL
                            v
+-------------------------------------------------------------+
|              BACKEND  --  FastAPI  (Render)                 |
|                                                             |
|   POST /donations          GET /matches/nearby              |
|   PATCH /matches/{id}      GET /dashboard/impact            |
|                                                             |
|   MATCHER ( < 2 sec ):                                     |
|   score = 0.4*expires-in-time + 0.3*near + 0.2*space       |
|           + 0.1*need  ->  best score > 0.5 wins             |
|                                                             |
|   SAFETY GATE:  risk_score > 0.7  -->  AUTO-REJECT          |
+-----+----------------+----------------+----------------+------+
      |                |                |                |
      v                v                v                v
+-----------+  +-----------+  +-----------+  +-----------+
|  SQLite   |  |  Google   |  |  Twilio   |  |  Mapbox   |
|    DB     |  |  Gemini   |  |           |  |           |
|           |  |           |  |           |  |           |
| donors    |  | Vision:   |  | SMS to    |  | Geocoding |
| donations |  | photo ->  |  | driver on |  | + map     |
| recipients|  | food JSON |  | match:    |  | pins:     |
| drivers   |  | Text      |  | pickup +  |  | donor /   |
| matches   |  | parsing   |  | dropoff   |  | shelter / |
|           |  | Risk      |  |           |  | driver    |
|           |  | scoring   |  |           |  |           |
+-----------+  +-----------+  +-----------+  +-----------+

   DATA FLOW  (one donation):
   ------------------------------------------------------------
   donor posts food
        |
        v
   Gemini parses photo/text  +  risk score computed
        |
        v
   SAFETY GATE  --  risk > 0.7 ?  REJECT : continue
        |
        v
   Matcher scores all shelters within 15 km
        |
        v
   Best match found  ->  Twilio SMS sent to driver
        |
        v
   Driver taps:  accepted -> picked up -> delivered
        |
        v
   Dashboard updates: meals rescued | kg diverted | CO2e saved
   ------------------------------------------------------------
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui |
| Backend | FastAPI (Python), Pydantic |
| Database | SQLite (demo) → Supabase PostGIS (scale path) |
| AI | Google Gemini — Vision intake, free-text parsing, expiry-risk scoring |
| Notifications | Twilio SMS |
| Maps | Mapbox GL |
| Deploy | Vercel (frontend) + Render (backend) |

## Safety, Privacy & Ethics

- **Never route expired-risk food** — the safety gate rejects before matching
- **Privacy** — coordinates stored; exact address shared only after a match is confirmed
- **Small-donor friendly** — no minimum quantity, 60-second posting flow
- **Graceful degradation** — if the AI is unavailable, the manual form still works

## Run Locally

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload        # API docs at http://localhost:8000/docs

# Frontend (new terminal)
cd frontend
npm install
npm run dev                      # app at http://localhost:3000
```

## Environment Variables

**backend/.env** — never commit this file.

```javascript
DATABASE_URL=sqlite:///./surplus.db
GEMINI_API_KEY=...
TWILIO_SID=...
TWILIO_TOKEN=...
TWILIO_PHONE=...
MAPBOX_TOKEN=...
```

**frontend (.env.local / Vercel env vars)**

```javascript
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Impact

| Metric | Demo session |
| --- | --- |
| Meals rescued | 40+ |
| Food diverted | 12 kg |
| CO₂e avoided | ~31 kg |
| Average match time | < 11 seconds |

## Scale Path

One city → many: the matcher is location-agnostic (point + radius query), so onboarding a new city is a new bounding box and local partner list, not new code. SQLite → Supabase PostGIS is a one-line `DATABASE_URL` change.

## Team

Built at a hackathon with AI-assisted development (Antigravity + Cursor + Gemini).
