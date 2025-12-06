"""
YouTube learning videos search node.
"""

import logging
from config import youtube
from models.schemas import State

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


def youtube_learning_videos_node(state: State):
    """
    Search for Japanese learning videos on YouTube based on user's weaknesses and goals.
    
    Args:
        state: The current state with weaknesses, learning_goal, and user_data
        
    Returns:
        dict: Updated state with youtube_videos
    """
    if not youtube:
        logger.warning("YouTube API not available, skipping video search")
        return {"youtube_videos": []}
    
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
                search_queries.append(f"Japanese kanji learning JLPT N{current_jlpt_level} tutorial")
                search_queries.append(f"kanji practice exercises N{current_jlpt_level}")
            elif priority_focus == "vocabulary":
                search_queries.append(f"Japanese vocabulary JLPT N{current_jlpt_level} words")
                search_queries.append(f"vocabulary building Japanese")
            elif priority_focus == "grammar":
                search_queries.append(f"Japanese grammar JLPT N{current_jlpt_level} lesson")
                search_queries.append(f"Japanese grammar patterns explained")
        
        # Add query based on learning goal
        if learning_goal:
            search_queries.append(f"Japanese learning {learning_goal} tutorial")
        
        # Add general JLPT level query
        search_queries.append(f"JLPT N{current_jlpt_level} study guide Japanese")
        
        # Search for videos
        all_videos = []
        for query in search_queries[:3]:  # Limit to 3 searches
            try:
                logger.info(f"Searching YouTube for: {query}")
                search_response = youtube.search().list(
                    q=query,
                    part="snippet",
                    type="video",
                    maxResults=3,
                    videoCategoryId="27",  # Education category
                    order="relevance"
                ).execute()
                
                video_items = search_response.get("items", [])
                for item in video_items:
                    video_id = item["id"]["videoId"]
                    snippet = item.get("snippet", {})
                    all_videos.append({
                        "video_id": video_id,
                        "title": snippet.get("title", ""),
                        "description": snippet.get("description", ""),
                        "thumbnail": snippet.get("thumbnails", {}).get("default", {}).get("url", ""),
                        "channel_title": snippet.get("channelTitle", ""),
                        "url": f"https://www.youtube.com/watch?v={video_id}",
                        "query": query,
                    })
            except Exception as e:
                logger.warning(f"Error searching YouTube for '{query}': {e}")
                continue
        
        # Remove duplicates based on video_id
        seen_ids = set()
        unique_videos = []
        for video in all_videos:
            video_id = video.get("video_id", "")
            if video_id and video_id not in seen_ids:
                seen_ids.add(video_id)
                unique_videos.append(video)
        
        logger.info(f"Found {len(unique_videos)} unique YouTube videos")
        
        return {"youtube_videos": unique_videos[:10]}  # Limit to top 10
        
    except Exception as e:
        logger.error(f"Error in youtube_learning_videos_node: {str(e)}", exc_info=True)
        return {"youtube_videos": []}
















