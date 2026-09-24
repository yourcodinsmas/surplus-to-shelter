import math


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points
    on Earth (in decimal degrees), returning distance in kilometers.
    """
    # Radius of Earth in kilometers
    R = 6371.0

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


def calculate_match_score(
    distance_km: float,
    hours_until_expiry: float,
    capacity: float,
    current_stock: float,
    quantity: float,
) -> dict:
    """
    Calculate matching score based on SPEC.md:
    match score = 40% time fit + 30% distance + 20% space available + 10% need level

    Returns dictionary with breakdown and final score.
    """
    # 1. Distance fit (30% weight) - Max radius is 15 km
    if distance_km > 15.0:
        distance_fit = 0.0
    else:
        # 0 km = 1.0, 15 km = 0.0
        distance_fit = max(0.0, 1.0 - (distance_km / 15.0))

    # 2. Time fit (40% weight) - Higher is better if there's sufficient time for delivery
    # Having between 4 and 24 hours gives a strong score; under 1 hour drops to near 0.
    if hours_until_expiry <= 0.5:
        time_fit = 0.0
    else:
        # Scale smoothly up to 8 hours
        time_fit = min(1.0, max(0.0, hours_until_expiry / 8.0))

    # 3. Space available fit (20% weight)
    available_space = max(0.0, capacity - current_stock)
    if available_space <= 0 or quantity <= 0:
        space_fit = 0.0
    else:
        # Can the shelter take all or most of this donation?
        space_fit = min(1.0, available_space / quantity)

    # 4. Need level fit (10% weight)
    # Higher need when current stock is lower compared to capacity
    if capacity > 0:
        need_level = max(0.0, min(1.0, 1.0 - (current_stock / capacity)))
    else:
        need_level = 0.5

    # Total weighted score
    total_score = (
        (0.40 * time_fit)
        + (0.30 * distance_fit)
        + (0.20 * space_fit)
        + (0.10 * need_level)
    )

    return {
        "distance_km": distance_km,
        "time_fit": round(time_fit, 2),
        "distance_fit": round(distance_fit, 2),
        "space_fit": round(space_fit, 2),
        "need_level": round(need_level, 2),
        "total_score": round(total_score, 3),
        "is_viable": distance_km <= 15.0 and total_score >= 0.5,
    }
