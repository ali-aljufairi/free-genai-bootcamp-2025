"""
Resource recommendation node for Sorami features.
"""

import json
import logging
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate

from models.schemas import State
from utils.prompt_templates import RESOURCE_RECOMMENDATION_TEMPLATE
from config import llm

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


def resource_recommendation_node(state: State):
    """
    Recommend specific Sorami features and integrate external resources.
    
    Args:
        state: The current state with learning_plan, weaknesses, learning_resources, youtube_videos, and user_data
        
    Returns:
        dict: Updated state with recommendations
    """
    try:
        learning_plan = state.get("learning_plan")
        weaknesses = state.get("weaknesses")
        learning_resources = state.get("learning_resources", [])
        youtube_videos = state.get("youtube_videos", [])
        user_data = state.get("user_data", {})
        
        if not learning_plan:
            logger.warning("No learning_plan in state")
            return state
        
        srs_due_items = user_data.get("srs_due_items", {})
        
        logger.info("Generating resource recommendations using LLM")
        
        parser = JsonOutputParser()
        prompt = PromptTemplate(
            template=RESOURCE_RECOMMENDATION_TEMPLATE,
            input_variables=["learning_plan", "weaknesses", "srs_due_items", "learning_resources", "youtube_videos"],
            partial_variables={
                "format_instructions": parser.get_format_instructions()
            },
        )
        
        chain = prompt | llm | parser
        recommendations_data = chain.invoke({
            "learning_plan": json.dumps(learning_plan, default=str),
            "weaknesses": json.dumps(weaknesses, default=str) if weaknesses else "{}",
            "srs_due_items": json.dumps(srs_due_items, default=str),
            "learning_resources": json.dumps(learning_resources, default=str) if learning_resources else "[]",
            "youtube_videos": json.dumps(youtube_videos, default=str) if youtube_videos else "[]",
        })
        
        # Merge recommendations into learning plan
        if "recommended_features" in recommendations_data:
            learning_plan["recommended_features"] = recommendations_data["recommended_features"]
        
        # Add curated external resources and YouTube videos from LLM selection
        if "selected_external_resources" in recommendations_data:
            learning_plan["external_resources"] = recommendations_data["selected_external_resources"]
        elif learning_resources:
            # Fallback: use top resources if LLM didn't select any
            learning_plan["external_resources"] = [
                {
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "description": r.get("content", "")[:200] + "..." if r.get("content") else "",
                    "relevance_score": r.get("score", 0),
                }
                for r in learning_resources[:5]
            ]
        
        if "selected_youtube_videos" in recommendations_data:
            learning_plan["youtube_videos"] = recommendations_data["selected_youtube_videos"]
        elif youtube_videos:
            # Fallback: use top videos if LLM didn't select any
            learning_plan["youtube_videos"] = [
                {
                    "video_id": v.get("video_id", ""),
                    "title": v.get("title", ""),
                    "url": v.get("url", ""),
                    "description": v.get("description", "")[:200] + "..." if v.get("description") else "",
                    "channel_title": v.get("channel_title", ""),
                    "thumbnail": v.get("thumbnail", ""),
                }
                for v in youtube_videos[:5]
            ]
        
        logger.info("Successfully generated resource recommendations")
        
        return {
            "learning_plan": learning_plan,
            "recommendations": recommendations_data
        }
        
    except Exception as e:
        logger.error(f"Error in resource_recommendation_node: {str(e)}", exc_info=True)
        return state



