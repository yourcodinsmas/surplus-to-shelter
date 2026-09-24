"""
Automated backend verification test.
Tests all endpoints specified in the requirements:
1. POST /donations
2. GET /matches/nearby
3. POST /matches/accept
4. PATCH /matches/{id}/status
"""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_complete_flow():
    print("\n--- 1. Testing Root Endpoint ---")
    res = client.get("/")
    assert res.status_code == 200
    print("✓ Root endpoint works:", res.json()["project"])

    print("\n--- 2. Testing POST /donations (Safe Food) ---")
    donation_data = {
        "donor_name": "Sunset Bakery",
        "donor_phone": "+1-415-555-0199",
        "food_name": "Fresh Croissants & Bagels",
        "quantity": 15.0,
        "hours_until_expiry": 8.0,
        "safety_score": 0.1,  # Safe (< 0.7)
        "latitude": 37.7749,
        "longitude": -122.4194,
    }
    res = client.post("/donations", json=donation_data)
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    donation = res.json()
    assert donation["status"] in ["posted", "matched"]
    donation_id = donation["id"]
    print(f"✓ Donation #{donation_id} created successfully with status: {donation['status']}")

    print("\n--- 3. Testing POST /donations (Hard Safety Rule: score > 0.7) ---")
    unsafe_donation_data = {
        "donor_name": "Suspicious Seafood",
        "donor_phone": "+1-415-555-0999",
        "food_name": "Leftover Sushi Buffet",
        "quantity": 20.0,
        "hours_until_expiry": 1.0,
        "safety_score": 0.85,  # Unsafe (> 0.7)
        "latitude": 37.7749,
        "longitude": -122.4194,
    }
    res = client.post("/donations", json=unsafe_donation_data)
    assert res.status_code == 201
    unsafe_donation = res.json()
    assert unsafe_donation["status"] == "rejected", "Unsafe food must be rejected!"
    print(f"✓ Safety Rule Verified: Safety score {unsafe_donation['safety_score']} was rejected!")

    print("\n--- 4. Testing GET /matches/nearby ---")
    res = client.get(f"/matches/nearby?donation_id={donation_id}")
    assert res.status_code == 200
    nearby_data = res.json()
    assert not nearby_data["is_rejected"]
    assert len(nearby_data["nearby_shelters"]) > 0
    top_shelter = nearby_data["nearby_shelters"][0]
    print(f"✓ Found {len(nearby_data['nearby_shelters'])} nearby shelter(s) within 15 km.")
    print(f"  Top Match: '{top_shelter['shelter_name']}' at {top_shelter['distance_km']} km (Score: {top_shelter['match_score']})")

    print("\n--- 5. Testing POST /matches/accept (Driver accepts match) ---")
    # Retrieve match ID
    matches_res = client.get("/matches")
    matches = matches_res.json()
    assert len(matches) > 0, "At least one match should exist from automatic matching"
    match_to_accept = matches[0]
    match_id = match_to_accept["id"]

    # Get available driver
    drivers_res = client.get("/drivers")
    drivers = drivers_res.json()
    driver_id = drivers[0]["id"]

    accept_data = {
        "match_id": match_id,
        "driver_id": driver_id,
    }
    res = client.post("/matches/accept", json=accept_data)
    assert res.status_code == 200
    accepted_match = res.json()
    assert accepted_match["status"] == "accepted"
    assert accepted_match["driver_id"] == driver_id
    print(f"✓ Match #{match_id} successfully accepted by Driver #{driver_id}")

    print("\n--- 6. Testing PATCH /matches/{id}/status (picked_up) ---")
    res = client.patch(f"/matches/{match_id}/status", json={"status": "picked_up"})
    assert res.status_code == 200
    assert res.json()["status"] == "picked_up"
    print(f"✓ Match #{match_id} status updated to 'picked_up'")

    print("\n--- 7. Testing PATCH /matches/{id}/status (delivered) ---")
    res = client.patch(f"/matches/{match_id}/status", json={"status": "delivered"})
    assert res.status_code == 200
    assert res.json()["status"] == "delivered"
    print(f"✓ Match #{match_id} status updated to 'delivered'")

    print("\n🎉 ALL BACKEND ENDPOINTS AND TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_complete_flow()
