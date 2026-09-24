"""
backend/test_matcher.py

Simple test demonstrating:
1. Safety Gate: Unsafe food (safety_score > 0.7) is rejected and never matched.
2. 3 Fake Shelters scenario:
   - Shelter A: Very close (0.8 km), but FULL (0 kg space left).
   - Shelter B: Close (2.5 km) and HAS SPACE (80 kg space left).
   - Shelter C: Far away (12.5 km) and HAS SPACE (90 kg space left).
3. PROOF: The nearest one with space (Shelter B) wins!
"""

from matcher import find_and_create_match, haversine_distance


class FakeDonation:
    def __init__(self, food_name, quantity, hours_until_expiry, safety_score, latitude, longitude):
        self.food_name = food_name
        self.quantity = quantity
        self.hours_until_expiry = hours_until_expiry
        self.safety_score = safety_score
        self.latitude = latitude
        self.longitude = longitude
        self.status = "posted"


class FakeShelter:
    def __init__(self, name, capacity, current_stock, latitude, longitude):
        self.name = name
        self.capacity = capacity
        self.current_stock = current_stock
        self.latitude = latitude
        self.longitude = longitude


class FakeDriver:
    def __init__(self, name, phone, is_available=True):
        self.name = name
        self.phone = phone
        self.is_available = is_available


def run_tests():
    print("==================================================")
    print("TEST 1: SAFETY GATE (safety_score > 0.7)")
    print("==================================================")
    unsafe_donation = FakeDonation(
        food_name="Leftover Warm Fish",
        quantity=15.0,
        hours_until_expiry=2.0,
        safety_score=0.85,  # Unsafe! Above 0.7
        latitude=37.7749,
        longitude=-122.4194,
    )

    shelter = FakeShelter(
        name="Community Pantry",
        capacity=100.0,
        current_stock=20.0,
        latitude=37.7750,
        longitude=-122.4190,
    )

    result = find_and_create_match(unsafe_donation, [shelter])

    assert result is None, "Safety Gate FAILED: Unsafe donation was matched!"
    assert unsafe_donation.status == "rejected", "Status should be 'rejected'!"
    print("✅ PASS: Food with safety_score 0.85 was rejected and never matched.\n")

    print("==================================================")
    print("TEST 2: 3 FAKE SHELTERS — NEAREST WITH SPACE WINS")
    print("==================================================")
    # Donor location: Downtown San Francisco (37.7749, -122.4194)
    donor_lat = 37.7749
    donor_lon = -122.4194

    safe_donation = FakeDonation(
        food_name="Fresh Pasta & Baked Bread",
        quantity=25.0,          # Needs 25 kg of space
        hours_until_expiry=6.0, # 6 hours left
        safety_score=0.1,       # Very safe!
        latitude=donor_lat,
        longitude=donor_lon,
    )

    # 3 Shelters:
    # 1. Shelter A: Extremely close (~0.8 km), but FULL (0 kg available space)
    shelter_a = FakeShelter(
        name="Shelter A (Nearest, but FULL)",
        capacity=50.0,
        current_stock=50.0,    # Space left = 0 kg!
        latitude=37.7800,
        longitude=-122.4150,
    )

    # 2. Shelter B: Close (~2.5 km) and HAS SPACE (80 kg available space)
    shelter_b = FakeShelter(
        name="Shelter B (Nearby & Has Space)",
        capacity=100.0,
        current_stock=20.0,    # Space left = 80 kg!
        latitude=37.7600,
        longitude=-122.4100,
    )

    # 3. Shelter C: Far (~12.5 km) and HAS SPACE (90 kg available space)
    shelter_c = FakeShelter(
        name="Shelter C (Far Away & Has Space)",
        capacity=100.0,
        current_stock=10.0,    # Space left = 90 kg!
        latitude=37.7000,
        longitude=-122.4900,
    )

    fake_driver = FakeDriver(name="Alex Rivera", phone="+1-415-555-0144")

    # Calculate actual distances for clear proof
    dist_a = haversine_distance(donor_lat, donor_lon, shelter_a.latitude, shelter_a.longitude)
    dist_b = haversine_distance(donor_lat, donor_lon, shelter_b.latitude, shelter_b.longitude)
    dist_c = haversine_distance(donor_lat, donor_lon, shelter_c.latitude, shelter_c.longitude)

    print(f"Donor Position: ({donor_lat}, {donor_lon})")
    print(f"• Shelter A distance: {dist_a} km | Available space: {shelter_a.capacity - shelter_a.current_stock} kg")
    print(f"• Shelter B distance: {dist_b} km | Available space: {shelter_b.capacity - shelter_b.current_stock} kg")
    print(f"• Shelter C distance: {dist_c} km | Available space: {shelter_c.capacity - shelter_c.current_stock} kg")

    shelters = [shelter_a, shelter_b, shelter_c]
    match_result = find_and_create_match(safe_donation, shelters, drivers=[fake_driver])

    # Assertions
    assert match_result is not None, "Match failed when viable shelters exist!"
    winning_shelter = match_result["shelter"]
    print(f"\nResult: Winning shelter is '{winning_shelter.name}'!")

    # Proves Shelter B wins!
    assert winning_shelter.name == "Shelter B (Nearby & Has Space)", (
        f"Expected Shelter B to win, but got {winning_shelter.name}"
    )

    assert safe_donation.status == "matched", "Donation status should be 'matched'!"
    assert match_result["score"] >= 0.5, "Winning score must be >= 0.5!"

    print("\n✅ PASS: Nearest shelter with space (Shelter B) won the match!")
    print(f"   Final Winning Score: {match_result['score']}")
    print(f"   Score Breakdown: {match_result['score_breakdown']}")


if __name__ == "__main__":
    run_tests()
