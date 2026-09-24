"""
backend/matcher.py

Handles matching surplus food donations to recipient shelters based on:
1. SAFETY GATE: Reject food immediately if safety_score > 0.7.
2. DISTANCE: Shelters must be within 15 km (using Haversine distance).
3. SCORING FORMULA (SPEC.md):
   Match Score = 40% time fit + 30% distance + 20% space available + 10% need level.
4. AUTO-MATCH & SMS:
   If best score > 0.5, creates the match and simulates sending an SMS to a driver.
"""

import math
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

# Import models if running within backend package
try:
    import models
except ImportError:
    models = None

# Constants from SPEC.md
MAX_DISTANCE_KM = 15.0
SAFETY_THRESHOLD = 0.7
MIN_MATCH_SCORE = 0.5


def send_real_twilio_sms(to_phone: str, pickup_address: str, shelter_name: str) -> dict:
    """
    Sends an SMS via Twilio using the credentials in backend/.env.
    Text format specified in Prompt:
    "New pickup at [address]. Deliver to [shelter]. Reply YES to accept."
    """
    import os
    from dotenv import load_dotenv

    load_dotenv()
    sid = os.getenv("TWILIO_SID")
    token = os.getenv("TWILIO_TOKEN")
    from_phone = os.getenv("TWILIO_PHONE")

    sms_body = f"New pickup at {pickup_address}. Deliver to {shelter_name}. Reply YES to accept."

    if not sid or not token or not from_phone:
        print("⚠️ Twilio credentials missing in .env. Skipping SMS dispatch.")
        return {"sent": False, "reason": "missing_credentials", "body": sms_body}

    # Format numbers: ensure E.164 (+) format
    from_num = from_phone.strip()
    if not from_num.startswith("+"):
        from_num = f"+91{from_num}" if len(from_num) == 10 and from_num[0] in "6789" else f"+{from_num}"

    to_num = to_phone.strip()
    if not to_num.startswith("+"):
        to_num = f"+91{to_num}" if len(to_num) == 10 and to_num[0] in "6789" else f"+{to_num}"

    try:
        from twilio.rest import Client
        client = Client(sid, token)
        message = client.messages.create(
            body=sms_body,
            from_=from_num,
            to=to_num,
        )
        print("=" * 60)
        print(f"📱 REAL TWILIO SMS DISPATCHED! (SID: {message.sid})")
        print(f"   To: {to_num}")
        print(f"   From: {from_num}")
        print(f"   Message: {sms_body}")
        print("=" * 60)
        return {"sent": True, "sid": message.sid, "body": sms_body}
    except Exception as e:
        print("=" * 60)
        print("📱 TWILIO SMS DISPATCH ATTEMPT:")
        print(f"   To: {to_num}")
        print(f"   From: {from_num}")
        print(f"   Message: {sms_body}")
        print(f"⚠️ Twilio API Notice: {e}")
        print("=" * 60)
        return {"sent": False, "error": str(e), "body": sms_body}



def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points
    on Earth (in decimal degrees), returning distance in kilometers.
    """
    R = 6371.0  # Earth's radius in kilometers

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return round(R * c, 2)


def score_shelter(
    distance_km: float,
    hours_until_expiry: float,
    capacity: float,
    current_stock: float,
    quantity: float,
) -> Dict[str, Any]:
    """
    Calculates the match score between a donation and a shelter.
    Formula from SPEC.md:
      Match Score = 40% time fit + 30% distance + 20% space available + 10% need level
    """
    # 1. TIME FIT (40% weight): Can they use it in time?
    # If hours until expiry is less than 30 mins, it's virtually impossible to deliver and consume.
    # 6+ hours provides comfortable time for pickup, transport, and meal distribution.
    if hours_until_expiry <= 0.5:
        time_fit = 0.0
    else:
        time_fit = min(1.0, max(0.0, hours_until_expiry / 6.0))

    # 2. DISTANCE FIT (30% weight): Closer is better!
    # Max radius is 15 km. 0 km = 1.0 (perfect), 15 km = 0.0.
    if distance_km > MAX_DISTANCE_KM:
        distance_fit = 0.0
    else:
        distance_fit = max(0.0, 1.0 - (distance_km / MAX_DISTANCE_KM))

    # 3. SPACE AVAILABLE (20% weight): Do they have room to store this food?
    available_space = max(0.0, capacity - current_stock)
    if available_space <= 0 or quantity <= 0:
        space_fit = 0.0
    elif available_space >= quantity:
        # Full capacity to take all of it!
        space_fit = 1.0
    else:
        # Partial capacity
        space_fit = available_space / quantity

    # 4. NEED LEVEL (10% weight): How empty are their shelves?
    # An empty pantry (current_stock = 0) has the highest need (1.0).
    # A full pantry (current_stock = capacity) has the lowest need (0.0).
    if capacity > 0:
        need_level = max(0.0, min(1.0, (capacity - current_stock) / capacity))
    else:
        need_level = 0.5

    # Combine using the exact weights from SPEC.md
    total_score = (
        (0.40 * time_fit)
        + (0.30 * distance_fit)
        + (0.20 * space_fit)
        + (0.10 * need_level)
    )

    return {
        "distance_km": distance_km,
        "time_fit": round(time_fit, 3),
        "distance_fit": round(distance_fit, 3),
        "space_fit": round(space_fit, 3),
        "need_level": round(need_level, 3),
        "total_score": round(total_score, 3),
        "is_viable": distance_km <= MAX_DISTANCE_KM and total_score >= MIN_MATCH_SCORE,
    }


def find_and_create_match(
    donation: Any,
    shelters: List[Any],
    drivers: Optional[List[Any]] = None,
    db: Optional[Session] = None,
) -> Optional[Any]:
    """
    Main matching function:
    1. SAFETY GATE: Checks safety_score <= 0.7. If > 0.7, marks rejected.
    2. Searches all shelters within 15 km.
    3. Scores each shelter using the 40/30/20/10 formula.
    4. If the best score is > 0.5, creates match & prints fake SMS to driver.
    """
    # ----------------------------------------------------
    # STEP 1: SAFETY GATE FIRST
    # ----------------------------------------------------
    safety_score = getattr(donation, "safety_score", 0.0)
    if safety_score > SAFETY_THRESHOLD:
        setattr(donation, "status", "rejected")
        print(f"🛑 SAFETY GATE TRIGGERED: Donation '{getattr(donation, 'food_name', 'Unknown')}' "
              f"has safety score {safety_score:.2f} (> {SAFETY_THRESHOLD}). "
              f"Status set to 'rejected'. Never matched.")
        if db:
            db.commit()
            db.refresh(donation)
        return None

    # ----------------------------------------------------
    # STEP 2 & 3: FIND SHELTERS WITHIN 15 KM AND SCORE THEM
    # ----------------------------------------------------
    donation_lat = getattr(donation, "latitude")
    donation_lon = getattr(donation, "longitude")
    donation_qty = getattr(donation, "quantity", 10.0)
    donation_expiry = getattr(donation, "hours_until_expiry", 6.0)

    best_shelter = None
    best_score_data = None
    best_score = -1.0

    print(f"\n🔍 Searching shelters for donation: '{getattr(donation, 'food_name', 'Food')}' "
          f"({donation_qty} kg, {donation_expiry} hrs until expiry)...")

    for shelter in shelters:
        shelter_lat = getattr(shelter, "latitude")
        shelter_lon = getattr(shelter, "longitude")
        shelter_name = getattr(shelter, "name", "Shelter")
        shelter_capacity = getattr(shelter, "capacity", 100.0)
        shelter_stock = getattr(shelter, "current_stock", 0.0)

        # Haversine distance
        dist = haversine_distance(donation_lat, donation_lon, shelter_lat, shelter_lon)

        # Distance gate: must be within 15 km
        if dist > MAX_DISTANCE_KM:
            print(f"  ⏭️  Skipping '{shelter_name}': {dist:.1f} km away (exceeds {MAX_DISTANCE_KM} km limit)")
            continue

        score_data = score_shelter(
            distance_km=dist,
            hours_until_expiry=donation_expiry,
            capacity=shelter_capacity,
            current_stock=shelter_stock,
            quantity=donation_qty,
        )

        score = score_data["total_score"]
        space_avail = max(0.0, shelter_capacity - shelter_stock)
        print(f"  📊 '{shelter_name}': {dist:.1f} km away, space={space_avail:.0f}kg, score={score:.3f}")

        if score > best_score:
            best_score = score
            best_shelter = shelter
            best_score_data = score_data

    # ----------------------------------------------------
    # STEP 4: AUTO-MATCH IF BEST SCORE > 0.5 & SEND SMS
    # ----------------------------------------------------
    if best_shelter and best_score >= MIN_MATCH_SCORE:
        shelter_name = getattr(best_shelter, "name", "Shelter")
        dist = best_score_data["distance_km"]

        print(f"\n🏆 WINNER FOUND: '{shelter_name}' with score {best_score:.3f} (>= {MIN_MATCH_SCORE})!")

        # Find an available driver if list is provided
        assigned_driver = None
        if drivers:
            for driver in drivers:
                if getattr(driver, "is_available", True):
                    assigned_driver = driver
                    break

        import os
        from dotenv import load_dotenv
        load_dotenv()

        driver_name = getattr(assigned_driver, "name", "Volunteer Driver")
        driver_phone = (
            os.getenv("DRIVER_DISPATCH_PHONE")
            or getattr(assigned_driver, "phone", None)
            or "+919897313403"
        )

        # Get pickup address
        pickup_address = getattr(donation, "pickup_address", None) or "750 Howard St, San Francisco, CA"

        # Dispatch REAL Twilio SMS as requested:
        # "New pickup at [address]. Deliver to [shelter]. Reply YES to accept."
        sms_result = send_real_twilio_sms(
            to_phone=driver_phone,
            pickup_address=pickup_address,
            shelter_name=shelter_name,
        )

        # Update donation status
        setattr(donation, "status", "matched")

        # If connected to a real database session and SQLAlchemy model
        match_record = None
        if db and models:
            donation_id = getattr(donation, "id", None)
            shelter_id = getattr(best_shelter, "id", None)
            driver_id = getattr(assigned_driver, "id", None) if assigned_driver else None

            if donation_id and shelter_id:
                match_record = models.Match(
                    donation_id=donation_id,
                    recipient_id=shelter_id,
                    driver_id=driver_id,
                    match_score=best_score,
                    distance_km=dist,
                    status="matched",
                )
                db.add(match_record)
                db.commit()
                db.refresh(match_record)
                db.refresh(donation)

        return {
            "matched": True,
            "shelter": best_shelter,
            "score": best_score,
            "score_breakdown": best_score_data,
            "driver": assigned_driver,
            "match_record": match_record,
        }

    else:
        print(f"\n❌ No suitable match found (highest score was {best_score:.3f}, minimum required is {MIN_MATCH_SCORE}).")
        return None
