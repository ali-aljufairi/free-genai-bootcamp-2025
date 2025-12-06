"""
Learning resources search node using Tavily.
"""

import logging
import tavily
from config import tavily_client
from models.schemas import State

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


def learning_resources_search_node(state: State):
    """
    Search for Japanese learning resources using Tavily based on user's weaknesses and goals.
    
    Args:
        state: The current state with weaknesses, learning_goal, and user_data
        
    Returns:
        dict: Updated state with learning_resources
    """
    if not tavily_client:
        logger.warning("Tavily client not available, skipping resource search")
        return {"learning_resources": []}
    
    try:
        weaknesses = state.get("weaknesses", {})
        learning_goal = state.get("learning_goal")
        user_data = state.get("user_data", {})
        profile = user_data.get("profile", {})
        current_jlpt_level = profile.get("current_jlpt_level", 5)
        
        # Build search queries based on weaknesses and goals
        search_queries = []
        
        # Add queries based on weak areas
        priority_focus = weaknesses.get("priority_focus", "")
        if priority_focus:
            if priority_focus == "kanji":
                search_queries.append(f"Japanese kanji learning resources JLPT N{current_jlpt_level} practice")
                search_queries.append(f"best kanji study methods JLPT N{current_jlpt_level}")
            elif priority_focus == "vocabulary":
                search_queries.append(f"Japanese vocabulary learning JLPT N{current_jlpt_level} words")
                search_queries.append(f"vocabulary building techniques Japanese")
            elif priority_focus == "grammar":
                search_queries.append(f"Japanese grammar practice JLPT N{current_jlpt_level}")
                search_queries.append(f"Japanese grammar patterns study guide")
        
        # Add query based on learning goal
        if learning_goal:
            search_queries.append(f"Japanese learning {learning_goal} resources")
        
        # Add general JLPT level query
        search_queries.append(f"JLPT N{current_jlpt_level} study guide resources")
        
        # Search for resources
        all_resources = []
        for query in search_queries[:3]:  # Limit to 3 searches to avoid rate limits
            try:
                logger.info(f"Searching Tavily for: {query}")
                response = tavily_client.search(query=query, max_results=3)
                
                if "results" in response and response["results"]:
                    for result in response["results"]:
                        all_resources.append({
                            "title": result.get("title", ""),
                            "url": result.get("url", ""),
                            "content": result.get("content", ""),
                            "score": result.get("score", 0),
                            "query": query,
                        })
            except Exception as e:
                logger.warning(f"Error searching Tavily for '{query}': {e}")
                continue
        
        # Remove duplicates based on URL
        seen_urls = set()
        unique_resources = []
        for resource in all_resources:
            url = resource.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_resources.append(resource)
        
        logger.info(f"Found {len(unique_resources)} unique learning resources")
        
        return {"learning_resources": unique_resources[:10]}  # Limit to top 10
        
    except tavily.InvalidAPIKeyError:
        logger.error("Invalid Tavily API key")
        return {"learning_resources": []}
    except tavily.UsageLimitExceededError:
        logger.error("Tavily usage limit exceeded")
        return {"learning_resources": []}
    except Exception as e:
        logger.error(f"Error in learning_resources_search_node: {str(e)}", exc_info=True)
        return {"learning_resources": []}
















