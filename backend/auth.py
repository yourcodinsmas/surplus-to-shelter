"""
backend/auth.py

Authentication and password hashing utilities.
Uses Python's standard library (hashlib + secrets) so it is 100% stable,
zero external C-extension dependencies, and guaranteed to work on any machine.
"""

import hashlib
import secrets
import base64
import json
from typing import Optional, Dict, Any


def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with a cryptographically secure random salt."""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return f"{salt}:{hashed}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against the stored salt:hash string."""
    try:
        if not hashed_password or ":" not in hashed_password:
            return False
        salt, expected_hash = hashed_password.split(":", 1)
        actual_hash = hashlib.sha256((salt + plain_password).encode("utf-8")).hexdigest()
        return secrets.compare_digest(actual_hash, expected_hash)
    except Exception:
        return False


def create_token(user_id: int, email: str, role: str) -> str:
    """Creates a lightweight session token for API requests."""
    payload = {
        "uid": user_id,
        "email": email,
        "role": role,
        "salt": secrets.token_hex(8),
    }
    raw = json.dumps(payload).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8")


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes a session token."""
    try:
        raw = base64.urlsafe_b64decode(token.encode("utf-8"))
        return json.loads(raw.decode("utf-8"))
    except Exception:
        return None
