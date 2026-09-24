from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


# --- Authentication & User Schemas ---
class UserRegisterRequest(BaseModel):
    email: str = Field(..., example="donor@restaurant.com")
    password: str = Field(..., min_length=4, example="secret123")
    name: str = Field(..., example="Chef Marco")
    role: str = Field("donor", example="donor", description="Role: 'donor', 'driver', or 'shelter'")
    phone: Optional[str] = Field(None, example="+14155550188")
    organization: Optional[str] = Field(None, example="Green Leaf Bistro")


class UserLoginRequest(BaseModel):
    email: str = Field(..., example="donor@restaurant.com")
    password: str = Field(..., example="secret123")


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    phone: Optional[str]
    organization: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    user: UserResponse
    token: str
    message: str


# --- Donor Schemas ---
class DonorCreate(BaseModel):
    name: str = Field(..., example="Kanha Sweets & Bakery")
    phone: Optional[str] = Field(None, example="+911412550101")
    latitude: float = Field(..., example=26.9124)
    longitude: float = Field(..., example=75.8010)


class DonorResponse(BaseModel):
    id: int
    name: str
    phone: Optional[str]
    latitude: float
    longitude: float
    created_at: datetime

    class Config:
        from_attributes = True


# --- Donation Schemas ---
class DonationCreate(BaseModel):
    food_name: str = Field(..., example="Surplus Sandwiches & Dal Pulao")
    quantity: float = Field(..., gt=0, example=25.0, description="Quantity in kg or meals")
    hours_until_expiry: float = Field(..., gt=0, example=6.0, description="Hours remaining before expiry")
    safety_score: float = Field(0.0, ge=0.0, le=1.0, example=0.1, description="Safety score from 0.0 (safe) to 1.0 (unsafe)")
    latitude: float = Field(..., example=26.9189, description="Pickup latitude")
    longitude: float = Field(..., example=75.8080, description="Pickup longitude")
    pickup_address: Optional[str] = Field("MI Road, Jaipur, Rajasthan, India", example="MI Road, Jaipur, Rajasthan, India")
    donor_name: Optional[str] = Field(None, example="Jaipur Spice Bistro")
    donor_phone: Optional[str] = Field(None, example="+919829055188")


class DonationResponse(BaseModel):
    id: int
    donor_id: Optional[int]
    food_name: str
    quantity: float
    hours_until_expiry: float
    safety_score: float
    status: str
    latitude: float
    longitude: float
    pickup_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Shelter (Recipient) Schemas ---
class RecipientCreate(BaseModel):
    name: str = Field(..., example="Malviya Nagar Community Shelter")
    phone: Optional[str] = Field(None, example="+911412550101")
    address: Optional[str] = Field(None, example="Malviya Nagar, Jaipur, Rajasthan")
    capacity: float = Field(..., gt=0, example=150.0, description="Max capacity in kg or meals")
    current_stock: float = Field(0.0, ge=0, example=30.0, description="Current stock in kg or meals")
    latitude: float = Field(..., example=26.8571)
    longitude: float = Field(..., example=75.8127)


class RecipientResponse(BaseModel):
    id: int
    name: str
    phone: Optional[str]
    address: Optional[str]
    capacity: float
    current_stock: float
    latitude: float
    longitude: float
    created_at: datetime

    class Config:
        from_attributes = True


# --- Driver Schemas ---
class DriverCreate(BaseModel):
    name: str = Field(..., example="Jordan Lee")
    phone: str = Field(..., example="+919897313403")
    latitude: float = Field(..., example=26.9124)
    longitude: float = Field(..., example=75.7873)
    is_available: bool = Field(True, example=True)


class DriverResponse(BaseModel):
    id: int
    name: str
    phone: str
    latitude: float
    longitude: float
    is_available: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Match & Scoring Schemas ---
class NearbyMatchShelter(BaseModel):
    shelter_id: int
    shelter_name: str
    address: Optional[str]
    phone: Optional[str]
    latitude: float
    longitude: float
    capacity: float
    current_stock: float
    available_space: float
    distance_km: float
    match_score: float
    is_viable: bool
    score_breakdown: Dict[str, Any]


class NearbyMatchesResponse(BaseModel):
    donation_id: Optional[int]
    food_name: Optional[str]
    quantity: float
    hours_until_expiry: float
    safety_score: float
    is_rejected: bool
    message: str
    nearby_shelters: list[NearbyMatchShelter]


class MatchAcceptRequest(BaseModel):
    match_id: int = Field(..., example=1)
    driver_id: int = Field(..., example=1)


class MatchStatusUpdateRequest(BaseModel):
    status: str = Field(
        ...,
        example="picked_up",
        description="Status options: 'picked_up', 'delivered', 'cancelled'",
    )


class MatchResponse(BaseModel):
    id: int
    donation_id: int
    recipient_id: int
    driver_id: Optional[int]
    match_score: float
    distance_km: float
    status: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
