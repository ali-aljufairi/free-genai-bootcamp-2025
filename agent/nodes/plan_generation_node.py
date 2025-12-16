"""
Learning plan generation node.
"""

import json
import logging
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate

from models.schemas import State, LearningPlan
from utils.prompt_templates import LEARNING_PLAN_TEMPLATE
from config import llm

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


def plan_generation_node(state: State):
    """
    Generate personalized learning plan based on analysis.
    
    Args:
        state: The current state with user_data, weaknesses, and learning_goal
        
    Returns:
        dict: Updated state with learning_plan
    """
    try:
        user_data = state.get("user_data", {})
        weaknesses = state.get("weaknesses")
        learning_goal = state.get("learning_goal")
        
        if not user_data:
            logger.warning("No user_data in state")
            return state
        
        profile = user_data.get("profile", {})
        progress = user_data.get("progress", {})
        analysis = user_data.get("analysis", {})
        
        current_jlpt_level = profile.get("current_jlpt_level", 5)
        daily_review_target = profile.get("daily_review_target", 20)
        
        logger.info("Generating learning plan using LLM")
        
        parser = JsonOutputParser(pydantic_object=LearningPlan)
        prompt = PromptTemplate(
            template=LEARNING_PLAN_TEMPLATE,
            input_variables=[
                "current_jlpt_level",
                "daily_review_target",
                "learning_goal",
                "progress_summary",
                "weaknesses",
                "user_analysis"
            ],
            partial_variables={
                "format_instructions": parser.get_format_instructions()
            },
        )
        
        chain = prompt | llm | parser
        learning_plan = chain.invoke({
            "current_jlpt_level": current_jlpt_level,
            "daily_review_target": daily_review_target,
            "learning_goal": learning_goal or "Improve overall Japanese language proficiency",
            "progress_summary": json.dumps(progress, default=str),
            "weaknesses": json.dumps(weaknesses, default=str) if weaknesses else "{}",
            "user_analysis": json.dumps(analysis, default=str) if analysis else "{}"
        })
        
        logger.info("Successfully generated learning plan")
        
        return {"learning_plan": learning_plan}
        
    except Exception as e:
        logger.error(f"Error in plan_generation_node: {str(e)}", exc_info=True)
        return state





