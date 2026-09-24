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
    quantity: 18.5, donor_name: "Kanha Sweets & Bakery",
    recipient_name: "C-Scheme Care Shelter",
    recipient_address: "C-Scheme, Ashok Nagar, Jaipur, Rajasthan 302001",
    recipient_latitude: 26.9124, recipient_longitude: 75.8010,
    pickup_address: "MI Road, Jaipur, Rajasthan 302001",
    pickup_latitude: 26.9189, pickup_longitude: 75.8080,
    driver_name: "Jordan Lee", driver_phone: "+91 9897313403",
    distance_km: 1.4, match_score: 0.96, status: "picked_up",
    created_at: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: 102, donation_id: 2, food_name: "Organic Veggie & Lentil Bowls",
    quantity: 32.0, donor_name: "LMB Restaurant & Sweets",
    recipient_name: "Malviya Nagar Community Shelter",
    recipient_address: "Malviya Nagar, Jaipur, Rajasthan 302017",
    recipient_latitude: 26.8571, recipient_longitude: 75.8127,
    pickup_address: "Johari Bazaar, Jaipur, Rajasthan 302003",
    pickup_latitude: 26.9200, pickup_longitude: 75.8270,
    driver_name: "Rahul Sharma", driver_phone: "+91 98290 12345",
    distance_km: 7.2, match_score: 0.91, status: "delivered",
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: 103, donation_id: 3, food_name: "Catering Trays: Paneer Butter Masala & Pulao",
    quantity: 45.0, donor_name: "Jaipur Palace Banquets",
    recipient_name: "Vaishali Nagar Food Relief",
    recipient_address: "Vaishali Nagar, Jaipur, Rajasthan 302021",
    recipient_latitude: 26.9068, recipient_longitude: 75.7420,
    pickup_address: "Tonk Road, Jaipur, Rajasthan 302018",
    pickup_latitude: 26.8785, pickup_longitude: 75.8042,
    driver_name: null, driver_phone: null,
    distance_km: 7.1, match_score: 0.88, status: "matched",
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: 104, donation_id: 4, food_name: "Packaged Sandwiches & Fresh Fruit Platters",
    quantity: 24.0, donor_name: "Tapri Central",
    recipient_name: "Mansarovar Community Pantry",
    recipient_address: "Mansarovar, Jaipur, Rajasthan 302020",
    recipient_latitude: 26.8688, recipient_longitude: 75.7645,
    pickup_address: "C-Scheme, Jaipur, Rajasthan 302001",
    pickup_latitude: 26.9124, pickup_longitude: 75.8010,
    driver_name: "Alex Rivera", driver_phone: "+91 98290 99887",
    distance_km: 6.2, match_score: 0.93, status: "accepted",
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
      { id: 1, name: "Malviya Nagar Community Shelter", address: "Malviya Nagar, Jaipur, Rajasthan 302017", capacity: 150.0, current_stock: 30.0, latitude: 26.8571, longitude: 75.8127 },
      { id: 2, name: "C-Scheme Care Shelter", address: "C-Scheme, Ashok Nagar, Jaipur, Rajasthan 302001", capacity: 120.0, current_stock: 20.0, latitude: 26.9124, longitude: 75.8010 },
      { id: 3, name: "Vaishali Nagar Food Relief", address: "Vaishali Nagar, Jaipur, Rajasthan 302021", capacity: 200.0, current_stock: 45.0, latitude: 26.9068, longitude: 75.7420 },
      { id: 4, name: "Mansarovar Community Pantry", address: "Mansarovar, Jaipur, Rajasthan 302020", capacity: 180.0, current_stock: 40.0, latitude: 26.8688, longitude: 75.7645 },
    ];
  }
}

/** 9. Geocode address via Mapbox API with local Jaipur, Rajasthan coordinates fallback */
export async function geocodeAddress(address) {
  if (!address || typeof address !== 'string') return { lat: 26.9124, lng: 75.7873 };

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  if (mapboxToken && mapboxToken.startsWith('pk.')) {
    try {
      const queryStr = address.toLowerCase().includes('jaipur') ? address : `${address}, Jaipur, Rajasthan, India`;
      const query = encodeURIComponent(queryStr);
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

  // Reliable offline Jaipur address coordinate lookup
  const lower = address.toLowerCase();
  if (lower.includes('malviya nagar') || lower.includes('malviya')) return { lat: 26.8571, lng: 75.8127 };
  if (lower.includes('c-scheme') || lower.includes('cscheme') || lower.includes('ashok nagar')) return { lat: 26.9124, lng: 75.8010 };
  if (lower.includes('vaishali nagar') || lower.includes('vaishali')) return { lat: 26.9068, lng: 75.7420 };
  if (lower.includes('mansarovar')) return { lat: 26.8688, lng: 75.7645 };
  if (lower.includes('raja park')) return { lat: 26.8976, lng: 75.8270 };
  if (lower.includes('mi road') || lower.includes('mirza ismail')) return { lat: 26.9189, lng: 75.8080 };
  if (lower.includes('tonk road')) return { lat: 26.8785, lng: 75.8042 };
  if (lower.includes('jhotwara')) return { lat: 26.9660, lng: 75.7535 };
  if (lower.includes('hawa mahal') || lower.includes('badi chaupar')) return { lat: 26.9239, lng: 75.8267 };
  if (lower.includes('civil lines')) return { lat: 26.9079, lng: 75.7891 };
  if (lower.includes('vidhyadhar nagar') || lower.includes('vidhyadhar')) return { lat: 26.9632, lng: 75.7766 };
  if (lower.includes('bani park')) return { lat: 26.9312, lng: 75.7925 };
  if (lower.includes('sitapura')) return { lat: 26.7820, lng: 75.8240 };
  if (lower.includes('sanganer')) return { lat: 26.8188, lng: 75.7770 };
  if (lower.includes('johari') || lower.includes('bazaar')) return { lat: 26.9200, lng: 75.8270 };
  if (lower.includes('gopalpura')) return { lat: 26.8637, lng: 75.7898 };

  return { lat: 26.9124, lng: 75.7873 };
}


