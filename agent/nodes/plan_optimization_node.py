"""
Plan optimization node based on user preferences and study habits.
"""

import json
import logging
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate

from models.schemas import State
from utils.prompt_templates import PLAN_OPTIMIZATION_TEMPLATE
from config import llm

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


def plan_optimization_node(state: State):
    """
    Optimize learning plan based on user preferences and study habits.

    Args:
        state: The current state with learning_plan and user_data

    Returns:
        dict: Updated state with optimized learning_plan
    """
    try:
        learning_plan = state.get("learning_plan")
        user_data = state.get("user_data", {})

        if not learning_plan:
            logger.warning("No learning_plan in state")
            return state

        profile = user_data.get("profile", {})
        analytics = user_data.get("analytics", {})
        recent_activities = user_data.get("recent_activities", [])

        daily_review_target = profile.get("daily_review_target", 20)
        preferred_study_time = analytics.get("preferred_study_time", "Not specified")
        average_session_duration = analytics.get("average_session_duration_minutes", 30)

        logger.info("Optimizing learning plan using LLM")

        parser = JsonOutputParser()
        prompt = PromptTemplate(
            template=PLAN_OPTIMIZATION_TEMPLATE,
            input_variables=[
                "learning_plan",
                "daily_review_target",
                "preferred_study_time",
                "average_session_duration",
                "recent_activities",
            ],
            partial_variables={"format_instructions": parser.get_format_instructions()},
        )

        chain = prompt | llm | parser
        optimized_plan = chain.invoke(
            {
                "learning_plan": json.dumps(learning_plan, default=str),
                "daily_review_target": daily_review_target,
                "preferred_study_time": str(preferred_study_time),
                "average_session_duration": average_session_duration,
                "recent_activities": json.dumps(recent_activities, default=str),
            }
        )

        logger.info("Successfully optimized learning plan")

        return {"learning_plan": optimized_plan}

    except Exception as e:
        logger.error(f"Error in plan_optimization_node: {str(e)}", exc_info=True)
        # If optimization fails, return original plan
        return state







