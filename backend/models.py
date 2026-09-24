from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, default="donor", nullable=False)  # donor, driver, shelter, admin
    phone = Column(String, nullable=True)
    organization = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)


class Donor(Base):
    __tablename__ = "donors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    donations = relationship("Donation", back_populates="donor")


class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    donor_id = Column(Integer, ForeignKey("donors.id"), nullable=True)
    food_name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)  # in kg or number of meals/portions
    hours_until_expiry = Column(Float, nullable=False)  # hours left before expiry
    safety_score = Column(Float, default=0.0, nullable=False)  # 0.0 safe, > 0.7 rejected
    status = Column(String, default="posted", nullable=False)  # posted, matched, rejected, completed
    latitude = Column(Float, nullable=False)  # pickup location latitude
    longitude = Column(Float, nullable=False)  # pickup location longitude
    pickup_address = Column(String, nullable=True, default="750 Howard St, San Francisco, CA")
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    donor = relationship("Donor", back_populates="donations")
    matches = relationship("Match", back_populates="donation")


class Recipient(Base):
    __tablename__ = "recipients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # Shelter or community organization name
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    capacity = Column(Float, nullable=False)  # Total capacity in kg or meals
    current_stock = Column(Float, default=0.0, nullable=False)  # Current stock in kg or meals
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    matches = relationship("Match", back_populates="recipient")


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    matches = relationship("Match", back_populates="driver")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    donation_id = Column(Integer, ForeignKey("donations.id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("recipients.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    match_score = Column(Float, nullable=False)  # Calculated score (0.0 to 1.0)
    distance_km = Column(Float, nullable=False)  # Distance in km from donation to shelter
    status = Column(
        String,
        default="matched",
        nullable=False,
    )  # matched, accepted, picked_up, delivered, cancelled
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    donation = relationship("Donation", back_populates="matches")
    recipient = relationship("Recipient", back_populates="matches")
    driver = relationship("Driver", back_populates="matches")
