"""
Go Backend API client for fetching user data and kanji information.
"""

import os
import logging
import requests
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


def get_go_backend_url() -> str:
    """Get Go backend URL from environment."""
    return os.getenv("GO_BACKEND_URL", "http://localhost:8080")


def get_user_profile(token: str) -> Optional[Dict[str, Any]]:
    """
    Get user profile from Go backend API.
    
    Args:
        token: JWT bearer token
        
    Returns:
        User profile data or None if error
    """
    try:
        go_backend_url = get_go_backend_url()
        response = requests.get(
            f"{go_backend_url}/api/langportal/users/me",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=5,
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Go backend returned status {response.status_code}: {response.text}")
            return None
    except requests.exceptions.ConnectionError as e:
        logger.warning(f"Go backend not available at {get_go_backend_url()}. Is it running? Error: {e}")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to call Go backend API: {e}")
        return None


def get_kanji_by_id(kanji_id: int, token: str) -> Optional[Dict[str, Any]]:
    """
    Get kanji data by ID from Go backend API.
    
    Args:
        kanji_id: The kanji ID
        token: JWT bearer token
        
    Returns:
        Kanji data with SVG strokes or None if error
    """
    try:
        go_backend_url = get_go_backend_url()
        response = requests.get(
            f"{go_backend_url}/api/langportal/kanji/{kanji_id}",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=5,
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Go backend returned status {response.status_code} for kanji {kanji_id}: {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to call Go backend API for kanji {kanji_id}: {e}")
        return None


def get_random_kanji(token: str, jlpt_level: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """
    Get random kanji from Go backend API.
    
    Args:
        token: JWT bearer token
        jlpt_level: Optional JLPT level filter (1-5)
        
    Returns:
        Random kanji data with SVG strokes or None if error
    """
    try:
        go_backend_url = get_go_backend_url()
        
        # Build query parameters
        params = {}
        if jlpt_level:
            params["jlpt"] = jlpt_level
        params["has_svg"] = "true"  # Only get kanji with SVG data
        
        # Use the dedicated random endpoint
        response = requests.get(
            f"{go_backend_url}/api/langportal/kanji/random",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            params=params,
            timeout=5,
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Go backend returned status {response.status_code}: {response.text}")
            return None
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Failed to connect to Go backend at {get_go_backend_url()}. Is it running? Error: {e}")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to call Go backend API for random kanji: {e}")
        return None


def save_kanji_trace(
    token: str,
    kanji_id: int,
    trace_svg: str,
    accuracy: float
) -> Optional[Dict[str, Any]]:
    """
    Save kanji practice attempt to database via Go backend.
    Note: This endpoint may not exist yet in the Go backend.
    For now, this is a placeholder that logs the attempt.
    
    Args:
        token: JWT bearer token
        kanji_id: The kanji ID that was practiced
        trace_svg: SVG representation of user's drawing
        accuracy: Accuracy score (0-100)
        
    Returns:
        Saved trace data or None if error
    """
    try:
        go_backend_url = get_go_backend_url()
        response = requests.post(
            f"{go_backend_url}/api/langportal/kanji/{kanji_id}/trace",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "trace_svg": trace_svg,
                "accuracy": accuracy,
            },
            timeout=5,
        )
        
        if response.status_code in [200, 201]:
            return response.json()
        elif response.status_code == 404:
            # Endpoint doesn't exist yet - log but don't fail
            logger.info(f"Kanji trace endpoint not available yet (404). Practice attempt logged: kanji_id={kanji_id}, accuracy={accuracy:.1f}%")
            return None
        else:
            logger.warning(f"Go backend returned status {response.status_code} for kanji trace: {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        # Don't fail the request if trace saving fails
        logger.warning(f"Failed to save kanji trace (non-critical): {e}")
        return None

