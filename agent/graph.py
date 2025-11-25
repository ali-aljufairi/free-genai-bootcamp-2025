"""
LangGraph workflow definition for Learning Plan Generator.
"""

from langgraph.graph import StateGraph, START, END
from IPython.display import Image

from models.schemas import State
from nodes.user_analysis_node import user_analysis_node
from nodes.weakness_identification_node import weakness_identification_node
from nodes.learning_resources_search_node import learning_resources_search_node
from nodes.youtube_learning_videos_node import youtube_learning_videos_node
from nodes.plan_generation_node import plan_generation_node
from nodes.resource_recommendation_node import resource_recommendation_node
from nodes.plan_optimization_node import plan_optimization_node
from nodes.learning_plan_email_node import send_learning_plan_email_node


def create_learning_plan_graph():
    """
    Create and compile the Learning Plan Generator workflow graph.

    Returns:
        object: The compiled LangGraph workflow
    """
    # Build the LangGraph
    builder = StateGraph(State)

    # Add nodes
    builder.add_node("user_analysis", user_analysis_node)
    builder.add_node("weakness_identification", weakness_identification_node)
    builder.add_node("learning_resources_search", learning_resources_search_node)
    builder.add_node("youtube_videos_search", youtube_learning_videos_node)
    builder.add_node("plan_generation", plan_generation_node)
    builder.add_node("resource_recommendation", resource_recommendation_node)
    builder.add_node("plan_optimization", plan_optimization_node)
    builder.add_node("send_email", send_learning_plan_email_node)

    # Define edges to control flow between nodes
    builder.add_edge(START, "user_analysis")
    builder.add_edge("user_analysis", "weakness_identification")
    builder.add_edge("weakness_identification", "learning_resources_search")
    builder.add_edge("weakness_identification", "youtube_videos_search")
    builder.add_edge("learning_resources_search", "plan_generation")
    builder.add_edge("youtube_videos_search", "plan_generation")
    builder.add_edge("plan_generation", "resource_recommendation")
    builder.add_edge("resource_recommendation", "plan_optimization")
    builder.add_edge("plan_optimization", "send_email")
    builder.add_edge("send_email", END)

    # Compile the graph
    graph = builder.compile()
    return graph


def visualize_graph(graph):
    """
    Visualize the graph as a Mermaid diagram.

    Args:
        graph: The compiled graph

    Returns:
        Image: A visualization of the graph
    """
    return Image(graph.get_graph().draw_mermaid_png())


def run_learning_plan_generator(
    user_id: int, learning_goal: str | None = None, token: str | None = None
):
    """
    Run the Learning Plan Generator workflow.

    Args:
        user_id (int): The user's database ID
        learning_goal (str, optional): Optional learning goal from user
        token (str, optional): JWT token for calling Go backend API

    Returns:
        dict: The complete learning plan data including analysis, weaknesses, plan, and recommendations
    """
    graph = create_learning_plan_graph()

    # Initialize state
    initial_state = {
        "user_id": user_id,
        "learning_goal": learning_goal,
        "token": token,
    }

    # Track all state updates
    complete_data = {}

    # Execute the graph
    for event in graph.stream(input=initial_state, stream_mode="updates"):
        # Update our complete data with the latest state
        complete_data.update(event)

    # Debug: Log what we have
    import logging

    logger = logging.getLogger(__name__)
    logger.info(
        f"Complete data keys after graph execution: {list(complete_data.keys())}"
    )
    logger.info(f"Has learning_plan: {bool(complete_data.get('learning_plan'))}")
    logger.info(f"Has weaknesses: {bool(complete_data.get('weaknesses'))}")
    if complete_data.get("learning_plan"):
        logger.info(
            f"Learning plan keys: {list(complete_data['learning_plan'].keys())}"
        )

    # Build final response structure
    # Ensure weaknesses is always present (even if empty)
    weaknesses = complete_data.get("weaknesses")
    if not weaknesses:
        # Create default weaknesses structure if missing
        learning_plan = complete_data.get("learning_plan", {})
        weaknesses = {
            "kanji_weaknesses": [],
            "vocabulary_weaknesses": [],
            "grammar_weaknesses": [],
            "summary": learning_plan.get(
                "weak_areas_summary",
                "No significant weaknesses identified. Continue with current study plan.",
            ),
            "priority_focus": "vocabulary",
        }

    # Ensure learning_plan is always present
    learning_plan = complete_data.get("learning_plan", {})
    if not learning_plan:
        logger.warning("No learning_plan found in complete_data")

    final_response = {
        "user_data": complete_data.get("user_data", {}),
        "weaknesses": weaknesses,
        "learning_plan": learning_plan,
        "recommendations": complete_data.get("recommendations", {}),
        "email_sent": complete_data.get("email_sent", False),
        "email_recipient": complete_data.get("email_recipient"),
    }

    logger.info(f"Final response keys: {list(final_response.keys())}")
    logger.info(
        f"Final response has learning_plan: {bool(final_response.get('learning_plan'))}"
    )
    logger.info(
        f"Final response has weaknesses: {bool(final_response.get('weaknesses'))}"
    )

    # Add next steps based on the plan
    next_steps = []
    if complete_data.get("learning_plan"):
        plan = complete_data["learning_plan"]
        if plan.get("recommended_features"):
            for feature in plan["recommended_features"][:3]:  # Top 3 features
                next_steps.append(
                    f"Start {feature.get('feature_name', 'study session')}: {feature.get('description', '')}"
                )
        if plan.get("weekly_plans"):
            first_week = plan["weekly_plans"][0] if plan["weekly_plans"] else {}
            if first_week.get("goals"):
                first_day = first_week["goals"][0] if first_week["goals"] else {}
                if first_day:
                    next_steps.append(
                        f"Today's goal: Review {first_day.get('kanji_reviews', 0)} kanji, "
                        f"{first_day.get('vocabulary_reviews', 0)} vocabulary words"
                    )

    final_response["next_steps"] = next_steps

    return final_response
