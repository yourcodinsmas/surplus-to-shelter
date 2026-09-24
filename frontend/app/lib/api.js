/**
 * Centralized API helper for Surplus-to-Shelter frontend.
 * Communicates with the FastAPI backend (reads NEXT_PUBLIC_API_URL with localhost:8000 fallback)
 * Falls back to sample data if backend is offline.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─── Sample fallback data ────────────────────────────────────────────────────

export const SAMPLE_MATCHES = [
  {
    id: 101, donation_id: 1, food_name: "Artisan Bread & Fresh Bagels",
    quantity: 18.5, donor_name: "Golden Gate Bakery",
    recipient_name: "Downtown Hope Shelter",
    recipient_address: "500 Market St, San Francisco",
    recipient_latitude: 37.7899, recipient_longitude: -122.4000,
    pickup_address: "1420 Irving St, San Francisco",
    pickup_latitude: 37.7634, pickup_longitude: -122.4682,
    driver_name: "Jordan Lee", driver_phone: "+91 9897313403",
    distance_km: 2.1, match_score: 0.94, status: "picked_up",
    created_at: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: 102, donation_id: 2, food_name: "Organic Veggie & Lentil Bowls",
    quantity: 32.0, donor_name: "Green Sprout Cafe",
    recipient_name: "Mission Community Pantry",
    recipient_address: "2400 Mission St, San Francisco",
    recipient_latitude: 37.7597, recipient_longitude: -122.4190,
    pickup_address: "350 California St, San Francisco",
    pickup_latitude: 37.7929, pickup_longitude: -122.4018,
    driver_name: "Sam Patel", driver_phone: "+1-415-555-0202",
    distance_km: 1.6, match_score: 0.96, status: "delivered",
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: 103, donation_id: 3, food_name: "Catering Trays: Roasted Chicken & Rice",
    quantity: 45.0, donor_name: "Tech Summit Catering",
    recipient_name: "Bay Area Food Bank",
    recipient_address: "900 Marin St, San Francisco",
    recipient_latitude: 37.7490, recipient_longitude: -122.3870,
    pickup_address: "750 Howard St, San Francisco",
    pickup_latitude: 37.7836, pickup_longitude: -122.4011,
    driver_name: null, driver_phone: null,
    distance_km: 3.8, match_score: 0.88, status: "matched",
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: 104, donation_id: 4, food_name: "Packaged Sandwiches & Salads",
    quantity: 24.0, donor_name: "Bistro 44",
    recipient_name: "Downtown Hope Shelter",
    recipient_address: "500 Market St, San Francisco",
    recipient_latitude: 37.7899, recipient_longitude: -122.4000,
    pickup_address: "88 Kearny St, San Francisco",
    pickup_latitude: 37.7885, pickup_longitude: -122.4042,
    driver_name: "Alex Rivera", driver_phone: "+1-415-555-0144",
    distance_km: 1.2, match_score: 0.92, status: "accepted",
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
];

export const SAMPLE_STATS = {
  mealsRescued: 1420, kgSaved: 710, co2AvoidedKg: 1775, activeMatches: 3,
};

// ─── API Functions ───────────────────────────────────────────────────────────

/** Submit food donation — calls POST /donations */
export async function submitDonation(donationData) {
  const res = await fetch(`${API_BASE_URL}/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(donationData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Fetch all enriched matches — calls GET /matches */
export async function fetchMatches() {
  try {
    const res = await fetch(`${API_BASE_URL}/matches`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.length > 0 ? data : SAMPLE_MATCHES;
  } catch {
    return SAMPLE_MATCHES;
  }
}

/** Fetch live dashboard stats — calls GET /stats */
export async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE_URL}/stats`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      mealsRescued: data.meals_rescued ?? SAMPLE_STATS.mealsRescued,
      kgSaved: data.kg_saved ?? SAMPLE_STATS.kgSaved,
      co2AvoidedKg: data.co2_avoided_kg ?? SAMPLE_STATS.co2AvoidedKg,
      activeMatches: data.active_matches ?? SAMPLE_STATS.activeMatches,
    };
  } catch {
    return SAMPLE_STATS;
  }
}

/** Find nearby shelters — calls GET /matches/nearby */
export async function fetchNearbyMatches(donationId, lat, lon, qty, hours, safety) {
  let url = `${API_BASE_URL}/matches/nearby?`;
  if (donationId) url += `donation_id=${donationId}`;
  else url += `lat=${lat}&lon=${lon}&quantity=${qty}&hours_until_expiry=${hours}&safety_score=${safety}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Driver accepts match — calls POST /matches/accept */
export async function acceptMatch(matchId, driverId = 1) {
  const res = await fetch(`${API_BASE_URL}/matches/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ match_id: matchId, driver_id: driverId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Update match status — calls PATCH /matches/{id}/status */
export async function updateMatchStatus(matchId, newStatus) {
  const res = await fetch(`${API_BASE_URL}/matches/${matchId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/** 1. AI Photo Intake — calls POST /ai/analyze-photo */
export async function analyzeFoodPhoto(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/ai/analyze-photo`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Photo analysis failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/** 3. AI Text Parsing — calls POST /ai/parse-text */
export async function parseFoodText(text) {
  const res = await fetch(`${API_BASE_URL}/ai/parse-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Text parsing failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/** 2. AI Safety Score — calls POST /ai/safety-score */
export async function calculateSafetyScore(hoursSincePosted, safeWindowHours, isCooked = true) {
  const res = await fetch(`${API_BASE_URL}/ai/safety-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hours_since_posted: hoursSincePosted,
      safe_window_hours: safeWindowHours,
      is_cooked: isCooked,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Safety calculation failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/** 4. Authentication: Login user — calls POST /auth/login */
export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/** 5. Authentication: Register user — calls POST /auth/register */
export async function registerUser(userData) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/** 6. Authentication: Fetch current profile — calls GET /auth/me */
export async function fetchCurrentUser(token) {
  const res = await fetch(`${API_BASE_URL}/auth/me?token=${encodeURIComponent(token)}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Session expired' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/** 7. Authentication: List demo accounts — calls GET /auth/demo-users */
export async function fetchDemoUsers() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/demo-users`, { cache: 'no-store' });
    if (!res.ok) throw new Error();
    return res.json();
  } catch {
    return [
      { email: "donor@restaurant.com", password: "donor123", name: "Chef Marco", role: "donor", org: "Green Leaf Bistro" },
      { email: "driver@rescue.org", password: "driver123", name: "Jordan Lee", role: "driver", org: "SF Volunteer Dispatch" },
      { email: "shelter@hope.org", password: "shelter123", name: "Sarah Jenkins", role: "shelter", org: "Downtown Hope Shelter" },
    ];
  }
}

/** 8. Fetch all shelters — calls GET /shelters */
export async function fetchShelters() {
  try {
    const res = await fetch(`${API_BASE_URL}/shelters`, { cache: 'no-store' });
    if (!res.ok) throw new Error();
    return res.json();
  } catch {
    return [
      { id: 1, name: "Downtown Hope Shelter", address: "500 Market St, San Francisco, CA", capacity: 150.0, current_stock: 30.0, latitude: 37.7899, longitude: -122.4000 },
      { id: 2, name: "Mission Community Pantry", address: "2400 Mission St, San Francisco, CA", capacity: 100.0, current_stock: 15.0, latitude: 37.7599, longitude: -122.4190 },
      { id: 3, name: "Bay Area Food Bank", address: "900 Marin St, San Francisco, CA", capacity: 300.0, current_stock: 80.0, latitude: 37.7495, longitude: -122.3855 },
    ];
  }
}

/** 9. Geocode address via Mapbox API with local SF neighborhood coordinates fallback */
export async function geocodeAddress(address) {
  if (!address || typeof address !== 'string') return { lat: 37.7850, lng: -122.4005 };

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  if (mapboxToken && mapboxToken.startsWith('pk.')) {
    try {
      const query = encodeURIComponent(`${address}, San Francisco, CA`);
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxToken}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          return { lat, lng };
        }
      }
    } catch {
      // Fall through to fallback
    }
  }

  // Reliable offline SF address coordinate lookup
  const lower = address.toLowerCase();
  if (lower.includes('irving') || lower.includes('sunset')) return { lat: 37.7634, lng: -122.4682 };
  if (lower.includes('california') || lower.includes('nob hill')) return { lat: 37.7929, lng: -122.4018 };
  if (lower.includes('howard') || lower.includes('soma')) return { lat: 37.7836, lng: -122.4011 };
  if (lower.includes('kearny') || lower.includes('chinatown')) return { lat: 37.7885, lng: -122.4042 };
  if (lower.includes('mission') || lower.includes('valencia')) return { lat: 37.7597, lng: -122.4190 };
  if (lower.includes('market')) return { lat: 37.7899, lng: -122.4000 };
  if (lower.includes('van ness') || lower.includes('civic')) return { lat: 37.7758, lng: -122.4194 };
  if (lower.includes('marin') || lower.includes('bayview')) return { lat: 37.7490, lng: -122.3870 };
  if (lower.includes('geary') || lower.includes('richmond')) return { lat: 37.7816, lng: -122.4285 };
  if (lower.includes('castro')) return { lat: 37.7609, lng: -122.4350 };
  if (lower.includes('columbus') || lower.includes('north beach')) return { lat: 37.7986, lng: -122.4074 };

  return { lat: 37.7850, lng: -122.4005 };
}


