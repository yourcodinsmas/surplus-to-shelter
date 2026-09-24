import os
from contextlib import asynccontextmanager
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, Query, status, File, UploadFile, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, get_db, SessionLocal
import models
import schemas
from matcher import find_and_create_match, score_shelter, haversine_distance, MAX_DISTANCE_KM, SAFETY_THRESHOLD
import ai_service
from auth import hash_password, verify_password, create_token, decode_token


# --- Automatic Database Initialization & Seeding ---
def seed_initial_data(db: Session):
    """
    Populates sample shelters and volunteer drivers if the database is empty.
    This lets beginners test endpoints immediately without manual data setup!
    """
    shelter_count = db.query(models.Recipient).count()
    if shelter_count == 0:
        sample_shelters = [
            models.Recipient(
                name="Downtown Hope Shelter",
                phone="+1-415-555-0101",
                address="500 Market St, San Francisco, CA",
                capacity=150.0,
                current_stock=30.0,
                latitude=37.7897,
                longitude=-122.4014,
            ),
            models.Recipient(
                name="Mission Community Pantry",
                phone="+1-415-555-0102",
                address="2400 Mission St, San Francisco, CA",
                capacity=100.0,
                current_stock=15.0,
                latitude=37.7599,
                longitude=-122.4190,
            ),
            models.Recipient(
                name="Bay Area Food Bank",
                phone="+1-415-555-0103",
                address="900 Marin St, San Francisco, CA",
                capacity=300.0,
                current_stock=80.0,
                latitude=37.7495,
                longitude=-122.3855,
            ),
        ]
        db.add_all(sample_shelters)
        db.commit()

    driver_count = db.query(models.Driver).count()
    if driver_count == 0:
        sample_drivers = [
            models.Driver(
                name="Jordan Lee",
                phone="+919897313403",
                latitude=37.7749,
                longitude=-122.4194,
                is_available=True,
            ),
            models.Driver(
                name="Sam Patel",
                phone="+1-415-555-0202",
                latitude=37.7833,
                longitude=-122.4167,
                is_available=True,
            ),
        ]
        db.add_all(sample_drivers)
        db.commit()

    user_count = db.query(models.User).count()
    if user_count == 0:
        sample_users = [
            models.User(
                email="donor@restaurant.com",
                hashed_password=hash_password("donor123"),
                name="Chef Marco",
                role="donor",
                phone="+1-415-555-0188",
                organization="Green Leaf Bistro",
            ),
            models.User(
                email="driver@rescue.org",
                hashed_password=hash_password("driver123"),
                name="Jordan Lee",
                role="driver",
                phone="+919897313403",
                organization="SF Volunteer Dispatch",
            ),
            models.User(
                email="shelter@hope.org",
                hashed_password=hash_password("shelter123"),
                name="Sarah Jenkins",
                role="shelter",
                phone="+1-415-555-0101",
                organization="Downtown Hope Shelter",
            ),
        ]
        db.add_all(sample_users)
        db.commit()


# Ensure tables exist on load
Base.metadata.create_all(bind=engine)
# Seed initial sample data if empty
try:
    with SessionLocal() as db_session:
        seed_initial_data(db_session)
except Exception as e:
    print(f"Initial seed notice: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables and seed data exist
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db_session:
        seed_initial_data(db_session)
    yield


app = FastAPI(
    title="Surplus-to-Shelter Backend API",
    description="Backend API matching surplus food donations with shelters and volunteer drivers.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from localhost:3000, etc.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Root / Welcome ---
@app.get("/", tags=["General"])
def read_root():
    return {
        "project": "Surplus-to-Shelter API",
        "status": "online",
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "message": "Welcome! Visit /docs in your browser to interact with all endpoints.",
    }


@app.get("/stats", tags=["General"])
def get_stats(db: Session = Depends(get_db)):
    """
    Returns live computed stats for the dashboard:
    meals_rescued, kg_saved, co2_avoided_kg, active_matches.
    """
    delivered = db.query(models.Match).filter(models.Match.status == "delivered").all()
    total_kg = 0.0
    for m in delivered:
        donation = db.query(models.Donation).filter(models.Donation.id == m.donation_id).first()
        if donation:
            total_kg += donation.quantity

    active = db.query(models.Match).filter(
        models.Match.status.in_(["matched", "accepted", "picked_up"])
    ).count()

    return {
        "meals_rescued": round(total_kg * 2),        # 1 kg ≈ 2 meals
        "kg_saved": round(total_kg, 1),
        "co2_avoided_kg": round(total_kg * 2.5, 1),  # 1 kg food ≈ 2.5 kg CO₂ avoided
        "active_matches": active,
        "total_deliveries": len(delivered),
    }


# ==========================================
# Authentication Endpoints (Login & Register)
# ==========================================
@app.post("/auth/register", response_model=schemas.AuthResponse, tags=["Authentication"])
def register_user(user_in: schemas.UserRegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account (donor, driver, or shelter) in the database."""
    email_clean = user_in.email.strip().lower()
    existing = db.query(models.User).filter(models.User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    new_user = models.User(
        email=email_clean,
        hashed_password=hash_password(user_in.password),
        name=user_in.name.strip(),
        role=user_in.role.lower().strip() or "donor",
        phone=user_in.phone,
        organization=user_in.organization,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_token(new_user.id, new_user.email, new_user.role)
    return {
        "user": new_user,
        "token": token,
        "message": f"Welcome, {new_user.name}! Account created as {new_user.role}.",
    }


@app.post("/auth/login", response_model=schemas.AuthResponse, tags=["Authentication"])
def login_user(login_in: schemas.UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email and password."""
    email_clean = login_in.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email_clean).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_token(user.id, user.email, user.role)
    return {
        "user": user,
        "token": token,
        "message": f"Welcome back, {user.name}!",
    }


@app.get("/auth/me", response_model=schemas.UserResponse, tags=["Authentication"])
def get_current_user_profile(token: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Fetch current user session details using token."""
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required.")
    data = decode_token(token)
    if not data or "uid" not in data:
        raise HTTPException(status_code=401, detail="Invalid session token.")
    user = db.query(models.User).filter(models.User.id == data["uid"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")
    return user


@app.get("/auth/demo-users", tags=["Authentication"])
def get_demo_accounts():
    """Returns pre-seeded demo user accounts for instant 1-click evaluation."""
    return [
        {"email": "donor@restaurant.com", "password": "donor123", "name": "Chef Marco", "role": "donor", "org": "Green Leaf Bistro"},
        {"email": "driver@rescue.org", "password": "driver123", "name": "Jordan Lee", "role": "driver", "org": "SF Volunteer Dispatch"},
        {"email": "shelter@hope.org", "password": "shelter123", "name": "Sarah Jenkins", "role": "shelter", "org": "Downtown Hope Shelter"},
    ]


# ==========================================
# AI Endpoints (Google Gemini Vision & Text)
# ==========================================
@app.post("/ai/analyze-photo", tags=["AI"])
async def ai_analyze_photo(file: UploadFile = File(...)):
    """
    1. AI PHOTO INTAKE:
    Inspects food photo using Google Gemini Vision.
    Returns: {item_name, category, estimated_quantity, unit, perishability_class, safe_window_hours}
    """
    content = await file.read()
    mime_type = file.content_type or "image/jpeg"
    result = ai_service.analyze_food_photo(content, mime_type=mime_type)
    return result


@app.post("/ai/parse-text", tags=["AI"])
def ai_parse_text(payload: dict = Body(...)):
    """
    3. AI TEXT PARSING:
    Extracts quantity, hours, and description from donor text (e.g. '30 samosas from party, good for 4 hrs').
    """
    text = payload.get("text", "")
    if not text.strip():
        raise HTTPException(status_code=400, detail="Missing text in request body")
    result = ai_service.parse_donation_text(text)
    return result


@app.post("/ai/safety-score", tags=["AI"])
def ai_calculate_safety_score(payload: dict = Body(...)):
    """
    2. AI SAFETY SCORE:
    Calculates safety risk as hours pass: Score = hours_since_posted / safe_window.
    If score > 0.7, blocks matching.
    """
    hours_since_posted = float(payload.get("hours_since_posted", 0.0))
    safe_window_hours = float(payload.get("safe_window_hours", 6.0))
    is_cooked = bool(payload.get("is_cooked", True))

    result = ai_service.calculate_safety_score(
        hours_since_posted=hours_since_posted,
        safe_window_hours=safe_window_hours,
        is_cooked=is_cooked,
    )
    return result


# ==========================================
# 1. POST /donations (A donor submits food)
# ==========================================
@app.post(
    "/donations",
    response_model=schemas.DonationResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Donations"],
)
def create_donation(donation_in: schemas.DonationCreate, db: Session = Depends(get_db)):
    """
    Submit a surplus food donation.
    - If donor details are provided, creates or links the donor.
    - HARD SAFETY RULE: If safety_score > 0.7, donation is marked 'rejected' and will not be matched.
    - If safe (<= 0.7), status is 'posted'. If a shelter matches above 0.5 within 15 km, creates match.
    """
    donor_id = None
    if donation_in.donor_name:
        donor = models.Donor(
            name=donation_in.donor_name,
            phone=donation_in.donor_phone,
            latitude=donation_in.latitude,
            longitude=donation_in.longitude,
        )
        db.add(donor)
        db.commit()
        db.refresh(donor)
        donor_id = donor.id

    # Check Hard Safety Rule
    is_safe = donation_in.safety_score <= 0.7
    initial_status = "posted" if is_safe else "rejected"

    donation = models.Donation(
        donor_id=donor_id,
        food_name=donation_in.food_name,
        quantity=donation_in.quantity,
        hours_until_expiry=donation_in.hours_until_expiry,
        safety_score=donation_in.safety_score,
        status=initial_status,
        latitude=donation_in.latitude,
        longitude=donation_in.longitude,
        pickup_address=donation_in.pickup_address,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    # Run matcher logic (handles safety gate, distance, scoring, auto-match, and SMS)
    shelters = db.query(models.Recipient).all()
    drivers = db.query(models.Driver).filter(models.Driver.is_available == True).all()
    find_and_create_match(donation=donation, shelters=shelters, drivers=drivers, db=db)

    return donation


@app.get("/donations", response_model=List[schemas.DonationResponse], tags=["Donations"])
def list_donations(db: Session = Depends(get_db)):
    """List all food donations."""
    return db.query(models.Donation).order_by(models.Donation.id.desc()).all()


# ==========================================
# 2. GET /matches/nearby (Find shelters near a donation)
# ==========================================
@app.get(
    "/matches/nearby",
    response_model=schemas.NearbyMatchesResponse,
    tags=["Matches"],
)
def get_nearby_matches(
    donation_id: Optional[int] = Query(None, description="ID of an existing donation to match"),
    lat: Optional[float] = Query(None, description="Pickup latitude (if not using donation_id)"),
    lon: Optional[float] = Query(None, description="Pickup longitude (if not using donation_id)"),
    quantity: float = Query(10.0, description="Quantity in kg or meals"),
    hours_until_expiry: float = Query(6.0, description="Hours remaining before expiry"),
    safety_score: float = Query(0.1, description="Safety score (0.0=safe, >0.7=rejected)"),
    food_name: Optional[str] = Query(None, description="Name of the food"),
    db: Session = Depends(get_db),
):
    """
    Find recipient shelters within 15 km of a donation and rank them using the formula:
    match score = 40% time fit + 30% distance + 20% space available + 10% need level.

    Enforces HARD SAFETY RULE: If safety score > 0.7, no matching is performed.
    """
    # 1. Resolve coordinates & donation details
    if donation_id is not None:
        donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
        if not donation:
            raise HTTPException(status_code=404, detail=f"Donation with id {donation_id} not found")
        pickup_lat = donation.latitude
        pickup_lon = donation.longitude
        quantity = donation.quantity
        hours_until_expiry = donation.hours_until_expiry
        safety_score = donation.safety_score
        food_name = donation.food_name
    elif lat is not None and lon is not None:
        pickup_lat = lat
        pickup_lon = lon
    else:
        raise HTTPException(
            status_code=400,
            detail="Please provide either 'donation_id' or both 'lat' and 'lon' coordinates.",
        )

    # 2. Check HARD SAFETY RULE
    if safety_score > 0.7:
        return schemas.NearbyMatchesResponse(
            donation_id=donation_id,
            food_name=food_name,
            quantity=quantity,
            hours_until_expiry=hours_until_expiry,
            safety_score=safety_score,
            is_rejected=True,
            message="Food safety score exceeds 0.7 threshold. Per safety guidelines, this food cannot be donated.",
            nearby_shelters=[],
        )

    # 3. Query all shelters and find those within 15 km
    shelters = db.query(models.Recipient).all()
    results = []

    for shelter in shelters:
        distance = haversine_distance(pickup_lat, pickup_lon, shelter.latitude, shelter.longitude)
        if distance <= MAX_DISTANCE_KM:
            score_data = score_shelter(
                distance_km=distance,
                hours_until_expiry=hours_until_expiry,
                capacity=shelter.capacity,
                current_stock=shelter.current_stock,
                quantity=quantity,
            )
            available_space = max(0.0, shelter.capacity - shelter.current_stock)
            results.append(
                schemas.NearbyMatchShelter(
                    shelter_id=shelter.id,
                    shelter_name=shelter.name,
                    address=shelter.address,
                    phone=shelter.phone,
                    latitude=shelter.latitude,
                    longitude=shelter.longitude,
                    capacity=shelter.capacity,
                    current_stock=shelter.current_stock,
                    available_space=round(available_space, 1),
                    distance_km=distance,
                    match_score=score_data["total_score"],
                    is_viable=score_data["is_viable"],
                    score_breakdown=score_data,
                )
            )

    # Sort descending by match score (highest score first)
    results.sort(key=lambda s: s.match_score, reverse=True)

    return schemas.NearbyMatchesResponse(
        donation_id=donation_id,
        food_name=food_name,
        quantity=quantity,
        hours_until_expiry=hours_until_expiry,
        safety_score=safety_score,
        is_rejected=False,
        message=f"Found {len(results)} shelter(s) within 15 km.",
        nearby_shelters=results,
    )


# ==========================================
# 3. POST /matches/accept (A driver accepts)
# ==========================================
@app.post(
    "/matches/accept",
    response_model=schemas.MatchResponse,
    tags=["Matches"],
)
def accept_match(accept_in: schemas.MatchAcceptRequest, db: Session = Depends(get_db)):
    """
    A volunteer driver accepts a food delivery match.
    - Links driver to the match
    - Updates match status to 'accepted'
    - Marks driver as currently busy
    """
    match = db.query(models.Match).filter(models.Match.id == accept_in.match_id).first()
    if not match:
        raise HTTPException(
            status_code=404, detail=f"Match with id {accept_in.match_id} not found"
        )

    driver = db.query(models.Driver).filter(models.Driver.id == accept_in.driver_id).first()
    if not driver:
        raise HTTPException(
            status_code=404, detail=f"Driver with id {accept_in.driver_id} not found"
        )

    if not driver.is_available:
        raise HTTPException(
            status_code=400,
            detail=f"Driver '{driver.name}' is currently unavailable or assigned to another run.",
        )

    match.driver_id = driver.id
    match.status = "accepted"
    driver.is_available = False

    db.commit()
    db.refresh(match)
    return match


# ==========================================
# 4. PATCH /matches/{id}/status (Status updates)
# ==========================================
@app.patch(
    "/matches/{id}/status",
    response_model=schemas.MatchResponse,
    tags=["Matches"],
)
def update_match_status(
    id: int,
    status_update: schemas.MatchStatusUpdateRequest,
    db: Session = Depends(get_db),
):
    """
    Update the progress of a delivery match.
    Supported statuses:
    - 'picked_up': food has been retrieved from the donor
    - 'delivered': food has reached the shelter safely (completes donation & frees driver)
    - 'cancelled': match cancelled (frees driver)
    """
    valid_statuses = ["matched", "accepted", "picked_up", "delivered", "cancelled"]
    new_status = status_update.status.lower().strip()

    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{new_status}'. Allowed values are: {', '.join(valid_statuses)}",
        )

    match = db.query(models.Match).filter(models.Match.id == id).first()
    if not match:
        raise HTTPException(status_code=404, detail=f"Match with id {id} not found")

    match.status = new_status

    # Synchronize donation and driver states
    donation = db.query(models.Donation).filter(models.Donation.id == match.donation_id).first()

    if new_status == "picked_up":
        if donation:
            donation.status = "picked_up"

    elif new_status == "delivered":
        if donation:
            donation.status = "completed"
        # Free the driver
        if match.driver_id:
            driver = db.query(models.Driver).filter(models.Driver.id == match.driver_id).first()
            if driver:
                driver.is_available = True
        # Update shelter's stock
        shelter = db.query(models.Recipient).filter(models.Recipient.id == match.recipient_id).first()
        if shelter and donation:
            shelter.current_stock = min(shelter.capacity, shelter.current_stock + donation.quantity)

    elif new_status == "cancelled":
        if donation:
            donation.status = "posted"
        if match.driver_id:
            driver = db.query(models.Driver).filter(models.Driver.id == match.driver_id).first()
            if driver:
                driver.is_available = True

    db.commit()
    db.refresh(match)
    return match


# ==========================================
# Additional Helpful Endpoints for Testing
# ==========================================
@app.get("/matches", tags=["Matches"])
def list_matches(db: Session = Depends(get_db)):
    """
    List all delivery matches, enriched with food_name, donor_name,
    recipient_name, recipient_address, driver_name, and pickup_address
    so the dashboard and driver portal are data-rich.
    """
    matches = db.query(models.Match).order_by(models.Match.id.desc()).all()
    results = []
    for m in matches:
        donation = db.query(models.Donation).filter(models.Donation.id == m.donation_id).first()
        shelter = db.query(models.Recipient).filter(models.Recipient.id == m.recipient_id).first()
        driver = db.query(models.Driver).filter(models.Driver.id == m.driver_id).first() if m.driver_id else None
        donor = db.query(models.Donor).filter(models.Donor.id == donation.donor_id).first() if (donation and donation.donor_id) else None

        results.append({
            "id": m.id,
            "donation_id": m.donation_id,
            "recipient_id": m.recipient_id,
            "driver_id": m.driver_id,
            "match_score": m.match_score,
            "distance_km": m.distance_km,
            "status": m.status,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "updated_at": m.updated_at.isoformat() if m.updated_at else None,
            # Enriched fields
            "food_name": donation.food_name if donation else None,
            "quantity": donation.quantity if donation else None,
            "pickup_address": donation.pickup_address if donation else None,
            "pickup_latitude": donation.latitude if donation else None,
            "pickup_longitude": donation.longitude if donation else None,
            "donor_name": donor.name if donor else None,
            "recipient_name": shelter.name if shelter else None,
            "recipient_address": shelter.address if shelter else None,
            "recipient_latitude": shelter.latitude if shelter else None,
            "recipient_longitude": shelter.longitude if shelter else None,
            "driver_name": driver.name if driver else None,
            "driver_phone": driver.phone if driver else None,
        })
    return results


@app.get("/shelters", response_model=List[schemas.RecipientResponse], tags=["Shelters"])
def list_shelters(db: Session = Depends(get_db)):
    """List all registered recipient shelters."""
    return db.query(models.Recipient).all()


@app.post(
    "/shelters",
    response_model=schemas.RecipientResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Shelters"],
)
def create_shelter(shelter_in: schemas.RecipientCreate, db: Session = Depends(get_db)):
    """Add a new recipient shelter."""
    shelter = models.Recipient(**shelter_in.model_dump())
    db.add(shelter)
    db.commit()
    db.refresh(shelter)
    return shelter


@app.get("/drivers", response_model=List[schemas.DriverResponse], tags=["Drivers"])
def list_drivers(db: Session = Depends(get_db)):
    """List all registered volunteer drivers."""
    return db.query(models.Driver).all()


@app.post(
    "/drivers",
    response_model=schemas.DriverResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Drivers"],
)
def create_driver(driver_in: schemas.DriverCreate, db: Session = Depends(get_db)):
    """Register a new volunteer driver."""
    driver = models.Driver(**driver_in.model_dump())
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver
