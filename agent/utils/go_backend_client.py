"""
Go Backend API client for fetching user data.
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
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to call Go backend API: {e}")
        return None


def get_dashboard_stats(token: str) -> Optional[Dict[str, Any]]:
    """
    Get dashboard stats from Go backend API.
    
    Args:
        token: JWT bearer token
        
    Returns:
        Dashboard stats or None if error
    """
    try:
        go_backend_url = get_go_backend_url()
        
        # Get quick stats
        stats_response = requests.get(
            f"{go_backend_url}/api/langportal/dashboard/quick-stats",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=5,
        )
        
        stats = {}
        if stats_response.status_code == 200:
            stats = stats_response.json()
        
        # Get study progress
        progress_response = requests.get(
            f"{go_backend_url}/api/langportal/dashboard/study_progress",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=5,
        )
        
        if progress_response.status_code == 200:
            stats.update(progress_response.json())
        
        return stats if stats else None
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to call Go backend API for dashboard stats: {e}")
        return None







