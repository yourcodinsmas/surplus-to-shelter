"""
backend/ai_service.py

AI Integration using Google Gemini Vision & Text Understanding:
1. AI PHOTO INTAKE:
   Analyzes surplus food photo using Gemini Vision.
   Instruction: "Look at this food photo. Return ONLY JSON:
   {item_name, category, estimated_quantity, unit, perishability_class, safe_window_hours}"
2. AI SAFETY SCORE:
   Gives cooked food a higher risk score as hours pass.
   Score = hours_since_posted / safe_window.
   If score > 0.7, block matching (our safety rule).
3. AI TEXT PARSING:
   Extracts food item, quantity, and hours from free-form text
   (e.g., "30 samosas from party, good for 4 hrs").

Resilient Design:
If any AI call fails or is unconfigured, fallback extractors ensure
the form still works smoothly without breaking the flow.
"""

import os
import re
import json
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()


def _get_gemini_client():
    """Initializes Google GenAI client using GEMINI_API_KEY from .env."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"⚠️ Could not initialize Google GenAI Client: {e}")
        return None


def _clean_json_response(raw_text: str) -> dict:
    """Extracts and parses JSON object from model output, handling markdown fences."""
    text = raw_text.strip()
    # Strip markdown code blocks like ```json ... ```
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    
    # Locate outer curly braces
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start : end + 1]

    return json.loads(text)


def analyze_food_photo(image_bytes: bytes, mime_type: str = "image/jpeg") -> Dict[str, Any]:
    """
    1. AI PHOTO INTAKE:
    Inspects food image using Gemini Vision.
    Returns:
      {
        "item_name": str,
        "category": str,
        "estimated_quantity": float,
        "unit": str,
        "perishability_class": str,
        "safe_window_hours": float,
        "source": "gemini" | "fallback"
      }
    """
    instruction = (
        "Look at this food photo. Return ONLY JSON: "
        "{item_name, category, estimated_quantity, unit, perishability_class, safe_window_hours}"
    )

    client = _get_gemini_client()
    if client:
        from google.genai import types

        # Models to try: first gemini-2.0-flash / gemini-3.5-flash-lite / gemini-3.6-flash
        models_to_try = ["gemini-2.0-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-flash-latest"]

        for model_name in models_to_try:
            try:
                image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
                res = client.models.generate_content(
                    model=model_name,
                    contents=[image_part, instruction],
                )
                if res and res.text:
                    parsed = _clean_json_response(res.text)
                    parsed["source"] = f"gemini ({model_name})"
                    # Ensure numeric types
                    parsed["estimated_quantity"] = float(parsed.get("estimated_quantity") or 10.0)
                    parsed["safe_window_hours"] = float(parsed.get("safe_window_hours") or 6.0)
                    return parsed
            except Exception as e:
                # Continue trying next model
                continue

    # Fallback if AI call is unavailable or fails (preserves flow)
    return {
        "item_name": "Fresh Prepared Food Assortment",
        "category": "Prepared Meals",
        "estimated_quantity": 15.0,
        "unit": "kg",
        "perishability_class": "medium",
        "safe_window_hours": 6.0,
        "source": "fallback",
    }


def parse_donation_text(text: str) -> Dict[str, Any]:
    """
    3. AI TEXT PARSING:
    Extracts quantity, food description, and safe hours from natural language.
    Example: "30 samosas from party, good for 4 hrs"
    -> item_name: "Samosas from party", estimated_quantity: 30.0, hours_until_expiry: 4.0
    """
    prompt = (
        f'Extract food details from this donor message. Return ONLY JSON with keys: '
        f'item_name (string), estimated_quantity (number), hours_until_expiry (number), '
        f'category (string), is_cooked (boolean), safe_window_hours (number).\n'
        f'Text: "{text}"'
    )

    client = _get_gemini_client()
    if client:
        for model_name in ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-2.0-flash", "gemini-flash-latest"]:
            try:
                res = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                if res and res.text:
                    parsed = _clean_json_response(res.text)
                    parsed["source"] = f"gemini ({model_name})"
                    parsed["estimated_quantity"] = float(parsed.get("estimated_quantity") or 10.0)
                    parsed["hours_until_expiry"] = float(parsed.get("hours_until_expiry") or 6.0)
                    parsed["safe_window_hours"] = float(parsed.get("safe_window_hours") or parsed["hours_until_expiry"])
                    return parsed
            except Exception:
                continue

    # Resilient regex fallback if Gemini call fails
    return _heuristic_text_parse(text)


def _heuristic_text_parse(text: str) -> Dict[str, Any]:
    """Regex fallback to extract quantity, hours, and description from text."""
    # Find hours (e.g. "for 4 hrs", "good for 6 hours", "4 hr")
    hours_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)", text, re.IGNORECASE)
    hours = float(hours_match.group(1)) if hours_match else 6.0

    # Find quantity (e.g. "30 samosas", "15 kg", "20 meals")
    qty_match = re.search(r"\b(\d+(?:\.\d+)?)\s*(?:kg|meals?|boxes?|portions?|trays?|pcs?|pieces?)?\b", text, re.IGNORECASE)
    qty = float(qty_match.group(1)) if qty_match else 10.0

    is_cooked = any(w in text.lower() for w in ["samosa", "curry", "rice", "chicken", "cooked", "party", "soup", "pasta", "pizza", "buffet"])

    return {
        "item_name": text.strip() or "Surplus Food Batch",
        "estimated_quantity": qty,
        "hours_until_expiry": hours,
        "safe_window_hours": hours,
        "category": "Prepared Food" if is_cooked else "General Surplus",
        "is_cooked": is_cooked,
        "source": "heuristic_fallback",
    }


def calculate_safety_score(
    hours_since_posted: float,
    safe_window_hours: float,
    is_cooked: bool = True,
) -> Dict[str, Any]:
    """
    2. AI SAFETY SCORE:
    A simple function that gives cooked food a higher risk score as hours pass.
    Score = hours_since_posted / safe_window.
    If score > 0.7, block matching (our safety rule).
    """
    if safe_window_hours <= 0:
        return {
            "safety_score": 1.0,
            "is_safe": False,
            "is_blocked": True,
            "message": "Safe window is 0. Unsafe for consumption.",
        }

    # Cooked food poses higher bacterial growth risk as hours pass,
    # so risk accelerates 25% faster than non-perishable goods.
    risk_factor = 1.25 if is_cooked else 1.0

    raw_score = (hours_since_posted / safe_window_hours) * risk_factor
    score = round(min(1.0, max(0.0, raw_score)), 2)

    is_blocked = score > 0.7

    return {
        "safety_score": score,
        "hours_since_posted": hours_since_posted,
        "safe_window_hours": safe_window_hours,
        "is_cooked": is_cooked,
        "is_safe": not is_blocked,
        "is_blocked": is_blocked,
        "message": (
            f"Safety score {score:.2f} > 0.7. Food matching BLOCKED per safety rule."
            if is_blocked
            else f"Safety score {score:.2f} <= 0.7. Safe for matching."
        ),
    }
