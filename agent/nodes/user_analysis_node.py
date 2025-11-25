"""
User analysis node for learning plan generation.
"""

import json
import logging
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate

from models.schemas import State
from utils.prompt_templates import USER_ANALYSIS_TEMPLATE
from utils.go_backend_client import get_user_profile, get_dashboard_stats
from config import llm

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


def user_analysis_node(state: State):
    """
    Fetch and analyze user progress data from Go backend API.
    
    Args:
        state: The current state with user_id and token
        
    Returns:
        dict: Updated state with user_data
    """
    try:
        user_id = state.get("user_id")
        token = state.get("token")
        
        if not user_id:
            logger.error("No user_id in state")
            return state
        
        if not token:
            logger.warning("No token in state, cannot fetch user data from Go backend")
            # Return minimal state for new users
            return {
                "user_data": {
                    "profile": {"current_jlpt_level": 5, "daily_review_target": 20},
                    "progress": {},
                    "weak_areas": {},
                    "srs_due_items": {},
                    "recent_activities": [],
                    "analytics": {},
                }
            }
        
        logger.info(f"Fetching user data for user_id: {user_id} from Go backend")
        
        # Fetch user profile from Go backend
        profile_data = get_user_profile(token)
        if not profile_data:
            logger.warning(f"No user data found for user_id: {user_id}")
            return {
                "user_data": {
                    "profile": {"current_jlpt_level": 5, "daily_review_target": 20},
                    "progress": {},
                    "weak_areas": {},
                    "srs_due_items": {},
                    "recent_activities": [],
                    "analytics": {},
                }
            }
        
        # Fetch dashboard stats
        dashboard_stats = get_dashboard_stats(token) or {}
        
        # Transform Go backend response to our format
        user_data = {
            "profile": {
                "current_jlpt_level": profile_data.get("settings", {}).get("current_jlpt_level", 5),
                "daily_review_target": profile_data.get("settings", {}).get("daily_review_target", 20),
                "email": profile_data.get("user", {}).get("email", ""),
                "display_name": profile_data.get("user", {}).get("display_name", ""),
            },
            "progress": {
                "kanji": {
                    "total_kanji_studied": 0,  # Will be filled from dashboard stats if available
                    "kanji_mastered": 0,
                },
                "vocabulary": {
                    "total_words_studied": dashboard_stats.get("total_words_studied", 0),
                    "words_mastered": 0,
                },
                "grammar": {
                    "grammar_points_studied": 0,
                },
            },
            "analytics": {
                "current_streak_days": dashboard_stats.get("study_streak_days", 0),
                "overall_accuracy": dashboard_stats.get("success_rate", 0),
                "total_study_sessions": dashboard_stats.get("total_study_sessions", 0),
            },
            "weak_areas": {},
            "srs_due_items": {
                "items_due": dashboard_stats.get("items_in_review", 0),
            },
            "recent_activities": [],
        }
        
        logger.info(f"Successfully fetched user data for user_id: {user_id}")
        
        # Use LLM to analyze user data
        parser = JsonOutputParser()
        prompt = PromptTemplate(
            template=USER_ANALYSIS_TEMPLATE,
            input_variables=["user_data"],
            partial_variables={
                "format_instructions": parser.get_format_instructions()
            },
        )
        
        chain = prompt | llm | parser
        analysis = chain.invoke({
            "user_data": json.dumps(user_data, default=str)
        })
        
        # Add analysis to user_data
        user_data["analysis"] = analysis
        
        return {"user_data": user_data}
        
    except Exception as e:
        logger.error(f"Error in user_analysis_node: {str(e)}", exc_info=True)
        return state



