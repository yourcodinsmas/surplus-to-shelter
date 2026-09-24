# SURPLUS-TO-SHELTER — PROJECT PLAN

## What the app does
1. Restaurant owner opens app, takes photo of surplus food / types description
2. AI figures out what food it is and how long it stays safe
3. App finds the nearest shelter that has space for it (within 15 km)
4. App texts a volunteer driver with pickup + dropoff route
5. App tracks: posted → matched → picked up → delivered
6. Dashboard shows: meals rescued, kg saved, CO2 avoided

## MUST WORK FIRST (before any fancy AI):
Donor form → find nearest shelter → send SMS → status updates → dashboard

## Data we store (database tables):
- donors: name, phone, location
- donations: food name, quantity, hours-til-expiry, safety score, status
- recipients (shelters): name, capacity, current stock, location
- drivers: name, phone, location, available yes/no
- matches: which donation went to which shelter with which driver

## HARD SAFETY RULE
If safety score is above 0.7, the food is NEVER matched. It gets rejected.

## HOW MATCHING WORKS (scoring, max 2 seconds):
match score = 40% time fit + 30% distance + 20% space available + 10% need level
Best match above 0.5 wins automatically.

## Tools used:
- Website: Next.js + Tailwind (what visitors see)
- Brain/server: FastAPI (Python) — receives forms, runs matching
- Database: Supabase Postgres with PostGIS (understands maps/distance)
- Text messages: Twilio
- AI photo reading: Google Gemini Vision
- Maps: Mapbox

