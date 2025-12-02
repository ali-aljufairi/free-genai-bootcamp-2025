"""
Email templates for Learning Plan Generator.
"""

LEARNING_PLAN_EMAIL_HTML_TEMPLATE = """
    <html>
    <head>
        <style>
            body {{
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #1a1a2e;
                color: #eaeaea;
            }}
            .email-container {{
                max-width: 600px;
                margin: 20px auto;
                background-color: #16213e;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
                overflow: hidden;
            }}
            .header {{
                background-color: #0f3460;
                color: #ffffff;
                padding: 20px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 24px;
            }}
            .content {{
                padding: 20px;
            }}
            .content h2 {{
                color: #eaeaea;
                font-size: 20px;
                margin-bottom: 10px;
                margin-top: 20px;
            }}
            .content h3 {{
                color: #c4c4c4;
                font-size: 18px;
                margin-bottom: 10px;
                margin-top: 15px;
            }}
            .content p {{
                color: #c4c4c4;
                font-size: 16px;
                line-height: 1.6;
            }}
            .content ul {{
                color: #c4c4c4;
                font-size: 16px;
                line-height: 1.8;
                padding-left: 20px;
            }}
            .content li {{
                margin-bottom: 8px;
            }}
            .highlight-box {{
                background-color: #0f3460;
                border-left: 4px solid #1a73e8;
                padding: 15px;
                margin: 15px 0;
                border-radius: 4px;
            }}
            .goal-section {{
                background-color: #1a1a2e;
                padding: 15px;
                margin: 10px 0;
                border-radius: 4px;
            }}
            .button {{
                display: inline-block;
                margin-top: 20px;
                background-color: #0f3460;
                color: #ffffff;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
            }}
            .button:hover {{
                background-color: #1a73e8;
                color: #ffffff;
            }}
            .footer {{
                text-align: center;
                font-size: 14px;
                color: #999999;
                padding: 10px 20px;
            }}
            .footer a {{
                color: #ffffff;
                text-decoration: none;
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>{heading}</h1>
            </div>
            <div class="content">
                <h2>Your Personalized Learning Plan</h2>
                <p>{introduction}</p>
                
                <div class="highlight-box">
                    <h3>Current Level Assessment</h3>
                    <p>{current_level_assessment}</p>
                </div>
                
                <h3>Areas for Improvement</h3>
                <p>{weak_areas_summary}</p>
                
                <h3>Your Learning Goals</h3>
                <div class="goal-section">
                    <h4>1 Week Goals:</h4>
                    <ul>
                        {short_term_goals}
                    </ul>
                </div>
                
                <div class="goal-section">
                    <h4>1 Month Goals:</h4>
                    <ul>
                        {medium_term_goals}
                    </ul>
                </div>
                
                <div class="goal-section">
                    <h4>3 Months Goals:</h4>
                    <ul>
                        {long_term_goals}
                    </ul>
                </div>
                
                <h3>Recommended Study Activities</h3>
                <p>{recommended_features}</p>
                
                <h3>Personalized Study Tips</h3>
                <ul>
                    {study_tips}
                </ul>
                
                <p style="margin-top: 30px;">
                    <a href="https://sorami.aljufairi.org/study" class="button" target="_blank">Start Your Study Session</a>
                </p>
            </div>
            <div class="footer">
                <p>
                    Want to learn more about Sorami? Visit our platform:
                    <a href="https://sorami.aljufairi.org/">Sorami</a>
                </p>
                <p>&copy; 2025 Sorami, All Rights Reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

LEARNING_PLAN_EMAIL_PROMPT = """
You are an expert email content writer for a Japanese language learning platform.

Generate an email with a personalized learning plan based on the following inputs:
- Current Level Assessment: {current_level_assessment}
- Weak Areas Summary: {weak_areas_summary}
- Short Term Goals: {short_term_goals}
- Medium Term Goals: {medium_term_goals}
- Long Term Goals: {long_term_goals}
- Recommended Features: {recommended_features}
- Study Tips: {study_tips}
- Learning Goal: {learning_goal}

Return your output in the following JSON format:
{format_instructions}

### Example Output:
{{
  "subject": "Your Personalized Japanese Learning Plan - Ready to Start!",
  "heading": "Your Personalized Learning Plan",
  "introduction": "Based on your progress and goals, we've created a customized study plan to help you improve your Japanese language skills.",
  "current_level_assessment": "You're currently at JLPT N4 level with strong vocabulary but need to focus on kanji recognition.",
  "weak_areas_summary": "Your main areas for improvement are kanji reading accuracy and grammar pattern recognition.",
  "short_term_goals": "<li>Review 50 kanji characters</li><li>Practice 30 vocabulary words</li><li>Complete 20 grammar exercises</li>",
  "medium_term_goals": "<li>Master 200 kanji characters</li><li>Improve grammar accuracy to 80%</li><li>Complete N3 practice questions</li>",
  "long_term_goals": "<li>Pass JLPT N3 exam</li><li>Master 500 kanji characters</li><li>Achieve conversational fluency</li>",
  "recommended_features": "We recommend starting with SRS Review for kanji practice, followed by JLPT Practice for grammar improvement.",
  "study_tips": "<li>Study for 30 minutes daily</li><li>Focus on kanji in the morning</li><li>Review grammar patterns weekly</li>"
}}

Now generate the email content based on the inputs provided.
"""







