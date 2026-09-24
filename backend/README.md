# Surplus-to-Shelter Backend

A beginner-friendly Python FastAPI backend for matching surplus food with nearby shelters and volunteer drivers.

---

## What was built

1. **`database.py`**:
   - Manages the database connection.
   - Defaults automatically to a local SQLite database (`surplus.db`) so you can run and test everything immediately without needing PostgreSQL or Supabase installed right away.
   - When you are ready to use Supabase, simply paste your PostgreSQL connection string into `backend/.env`.

2. **`models.py`**:
   - Defines the SQLAlchemy database tables:
     - `donors`: Restaurants or stores donating food.
     - `donations`: Surplus food details, hours until expiry, safety score, and status (`posted`, `matched`, `rejected`, `completed`).
     - `recipients`: Shelters with capacity and current stock.
     - `drivers`: Volunteer drivers with availability flags.
     - `matches`: Records connecting donations to shelters and drivers.

3. **`schemas.py`**:
   - Pydantic models to validate incoming JSON requests and format outgoing responses.

4. **`utils.py`**:
   - **Haversine formula**: Calculates distance (in kilometers) between two coordinates (latitude/longitude) on Earth without needing complex GIS extensions.
   - **Matching score algorithm**: Implements SPEC.md rules (40% time fit + 30% distance fit + 20% space available + 10% need level).

5. **`main.py`**:
   - FastAPI application providing all endpoints:
     - `POST /donations`: Submit a food donation. Unsafe food (`safety_score > 0.7`) is automatically rejected per SPEC.md. Safe food is posted and automatically matched if a shelter fits.
     - `GET /matches/nearby`: Discover shelters within 15 km, ranked by match score.
     - `POST /matches/accept`: Driver accepts a match.
     - `PATCH /matches/{id}/status`: Track delivery stages (`picked_up`, `delivered`, `cancelled`).

---

## How to run the server

1. Open your terminal and navigate to the backend folder:
   ```bash
   cd /Users/nakshatra11/Desktop/surplus-to-shelter/backend
   ```

2. Start the FastAPI server using the virtual environment:
   ```bash
   .venv/bin/uvicorn main:app --reload
   ```

3. Open your browser and visit:
   - **Interactive API Documentation & Testing**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - **Alternative ReDoc UI**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
