"""
Email node for Learning Plan Generator.
"""

import os
import logging
from jinja2 import Environment, FileSystemLoader, select_autoescape

from models.schemas import State
from utils.storage_utils import store_output
from utils.email_utils import send_email
from config import GMAIL_USER, GMAIL_PASSWORD

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


def send_learning_plan_email_node(state: State):
    """
    Generate and send email with learning plan.
    
    Args:
        state: The current state with learning_plan and user_data
        
    Returns:
        dict: Empty dict if email is sent successfully
    """
    try:
        learning_plan = state.get("learning_plan")
        user_data = state.get("user_data", {})
        user_id = state.get("user_id")
        learning_goal = state.get("learning_goal")
        
        if not learning_plan:
            logger.warning("No learning_plan in state, skipping email")
            return {}
        
        # Get user email from user_data (already fetched from Go backend)
        if not user_id:
            logger.warning("No user_id in state, skipping email")
            return {}
        
        # Extract email from user_data (from Go backend API)
        recipient_email = None
        if user_data and user_data.get("profile"):
            recipient_email = user_data["profile"].get("email")
        
        if not recipient_email:
            logger.warning(f"No email found in user_data for user_id {user_id}, skipping email")
            return {}
        
        # Check if email configuration is available
        if not GMAIL_USER or not GMAIL_PASSWORD:
            logger.warning("Email configuration not available, skipping email send")
            return {"email_sent": False, "reason": "Email configuration not available"}
        
        logger.info(f"Preparing to send learning plan email to {recipient_email}")
        
        # Load Jinja2 template
        template_dir = os.path.join(os.path.dirname(__file__), "..", "utils", "email_templates")
        env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )
        template = env.get_template('learning_plan_email.html')
        
        # Prepare template data
        template_data = {
            "subject": f"Your Personalized Japanese Learning Plan - Ready to Start!",
            "heading": "Your Personalized Learning Plan",
            "introduction": f"Based on your progress and goals, we've created a customized study plan to help you improve your Japanese language skills.{% if learning_goal %} Your goal: {learning_goal}.{% endif %}",
            "current_level_assessment": learning_plan.get("current_level_assessment", ""),
            "weak_areas_summary": learning_plan.get("weak_areas_summary", ""),
            "short_term_goals": learning_plan.get("short_term_goals", []),
            "medium_term_goals": learning_plan.get("medium_term_goals", []),
            "long_term_goals": learning_plan.get("long_term_goals", []),
            "recommended_features": learning_plan.get("recommended_features", []),
            "study_tips": learning_plan.get("study_tips", []),
            "external_resources": learning_plan.get("external_resources", []),
            "youtube_videos": learning_plan.get("youtube_videos", []),
        }
        
        # Render HTML content using Jinja2 template
        html_content = template.render(**template_data)
        
        # Store the email output before sending
        output_data = {
            "user_id": user_id,
            "email_recipient": recipient_email,
            "learning_goal": learning_goal,
            "learning_plan": learning_plan,
            "email_content": {
                "subject": template_data["subject"],
                "heading": template_data["heading"],
                "html_content": html_content,
            },
        }
        
        # Store the output data
        stored_file_path = store_output(
            output_data, recipient_email, output_type="learning_plan"
        )
        logger.info(f"Learning plan data stored at: {stored_file_path}")
        
        # Send the email
        email_sent = send_email(
            recipient_email,
            subject=template_data["subject"],
            body=html_content,
        )
        
        if email_sent:
            logger.info(f"Learning plan email sent successfully to {recipient_email}")
            return {"email_sent": True, "email_recipient": recipient_email}
        else:
            logger.error(f"Failed to send learning plan email to {recipient_email}")
            return {"email_sent": False}
        
    except Exception as e:
        logger.error(f"Error in send_learning_plan_email_node: {str(e)}", exc_info=True)
        return {"email_sent": False, "error": str(e)}

