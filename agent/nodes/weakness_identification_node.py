"""
Weakness identification node for learning plan generation.
"""

import json
import logging
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate

from models.schemas import State, WeaknessAnalysis
from utils.prompt_templates import WEAKNESS_IDENTIFICATION_TEMPLATE
from config import llm

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


def weakness_identification_node(state: State):
    """
    Identify learning gaps and weak areas using LLM.
    
    Args:
        state: The current state with user_data
        
    Returns:
        dict: Updated state with weaknesses
    """
    try:
        user_data = state.get("user_data")
        if not user_data:
            logger.warning("No user_data in state")
            return state
        
        weak_areas = user_data.get("weak_areas", {})
        if not weak_areas:
            logger.info("No weak areas found in user data")
            return {
                "weaknesses": {
                    "kanji_weaknesses": [],
                    "vocabulary_weaknesses": [],
                    "grammar_weaknesses": [],
                    "summary": "No significant weaknesses identified. Continue with current study plan.",
                    "priority_focus": "vocabulary"
                }
            }
        
        logger.info("Analyzing weaknesses using LLM")
        
        parser = JsonOutputParser(pydantic_object=WeaknessAnalysis)
        prompt = PromptTemplate(
            template=WEAKNESS_IDENTIFICATION_TEMPLATE,
            input_variables=["user_data", "weak_areas"],
            partial_variables={
                "format_instructions": parser.get_format_instructions()
            },
        )
        
        chain = prompt | llm | parser
        weaknesses = chain.invoke({
            "user_data": json.dumps(user_data, default=str),
            "weak_areas": json.dumps(weak_areas, default=str)
        })
        
        logger.info("Successfully identified weaknesses")
        
        return {"weaknesses": weaknesses}
        
    except Exception as e:
        logger.error(f"Error in weakness_identification_node: {str(e)}", exc_info=True)
        return state












