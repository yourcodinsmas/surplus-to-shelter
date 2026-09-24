import os
import re
import urllib.parse
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables from .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def get_clean_database_url(raw_url: str | None) -> str:
    """
    Cleans up database connection strings.
    Handles common beginner issues:
    - Literal [brackets] copied from Supabase templates (e.g. [YOUR-PASSWORD])
    - Special characters like '@' inside the password that break URI parsing
    """
    if not raw_url or not raw_url.strip():
        return "sqlite:///./surplus.db"

    url = raw_url.strip()

    # If it's a PostgreSQL URL, ensure password brackets are removed and special chars URL-encoded
    pg_match = re.match(r"^(postgresql(?:\+\w+)?://)([^:]+):(.*)@([^@]+)$", url)
    if pg_match:
        proto, user, pwd, host_part = pg_match.groups()
        # Remove literal brackets if user kept [password] from template
        if pwd.startswith("[") and pwd.endswith("]"):
            pwd = pwd[1:-1]
        # URL encode password so special characters (like '@') don't break connection
        encoded_pwd = urllib.parse.quote(pwd)
        return f"{proto}{user}:{encoded_pwd}@{host_part}"

    return url


db_url = get_clean_database_url(DATABASE_URL)

try:
    if db_url.startswith("sqlite"):
        engine = create_engine(db_url, connect_args={"check_same_thread": False})
    else:
        # Try connecting to external database (e.g. Supabase PostgreSQL)
        engine = create_engine(db_url, pool_pre_ping=True)
        # Test connection immediately
        with engine.connect() as test_conn:
            pass
        print(f" Connected to database: {db_url.split('@')[-1]}")
except Exception as e:
    print(f"⚠️ Could not connect to remote database ({e}).")
    print("👉 Falling back to local SQLite database (surplus.db) for smooth offline testing.")
    db_url = "sqlite:///./surplus.db"
    engine = create_engine(db_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """
    Dependency that provides a database session for each incoming request,
    and automatically closes it when the request is done.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
