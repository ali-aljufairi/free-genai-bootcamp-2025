"""
Pydantic models for Learning Plan Generator application.
"""
from typing import List, Optional, Dict, Any
from typing_extensions import TypedDict
from pydantic import BaseModel, Field


# Learning Plan Schemas
class WeakArea(BaseModel):
    """Represents a weak area in learning."""
    category: str = Field(..., description="Category: kanji, vocabulary, or grammar")
    item_id: Optional[int] = Field(None, description="ID of the item")
    name: str = Field(..., description="Name or character of the item")
    accuracy: float = Field(..., description="Current accuracy percentage")
    jlpt_level: Optional[int] = Field(None, description="JLPT level")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")


class WeaknessAnalysis(BaseModel):
    """Analysis of user's weak areas."""
    kanji_weaknesses: List[WeakArea] = Field(default_factory=list, description="Weak kanji areas")
    vocabulary_weaknesses: List[WeakArea] = Field(default_factory=list, description="Weak vocabulary areas")
    grammar_weaknesses: List[WeakArea] = Field(default_factory=list, description="Weak grammar areas")
    summary: str = Field(..., description="Summary of overall weaknesses")
    priority_focus: str = Field(..., description="Highest priority area to focus on")


class DailyGoal(BaseModel):
    """Daily study goal."""
    day: int = Field(..., description="Day number (1-7 for weekly plan)")
    kanji_reviews: int = Field(default=0, description="Number of kanji to review")
    vocabulary_reviews: int = Field(default=0, description="Number of vocabulary words to review")
    grammar_practice: int = Field(default=0, description="Number of grammar exercises")
    jlpt_questions: int = Field(default=0, description="Number of JLPT questions to practice")
    estimated_time_minutes: int = Field(default=30, description="Estimated time in minutes")


class WeeklyFocus(BaseModel):
    """Weekly focus area."""
    week: int = Field(..., description="Week number")
    primary_focus: str = Field(..., description="Primary focus area: kanji, vocabulary, grammar, or jlpt")
    secondary_focus: Optional[str] = Field(None, description="Secondary focus area")
    goals: List[DailyGoal] = Field(..., description="Daily goals for this week")


class SoramiFeatureRecommendation(BaseModel):
    """Recommendation for using a Sorami feature."""
    feature_name: str = Field(..., description="Feature name: srs_review, jlpt_practice, kanji_study, grammar_study, word_builder")
    feature_url: str = Field(..., description="URL path to the feature")
    description: str = Field(..., description="Why this feature is recommended")
    priority: int = Field(default=1, description="Priority level (1-5, 1 is highest)")
    content_ids: Optional[List[int]] = Field(None, description="Specific content IDs to focus on")


class ExternalLearningResource(BaseModel):
    """External learning resource found via web search."""
    title: str = Field(..., description="Title of the resource")
    url: str = Field(..., description="URL of the resource")
    description: str = Field(..., description="Description or summary of the resource")
    relevance_score: Optional[float] = Field(None, description="Relevance score from search")


class YouTubeLearningVideo(BaseModel):
    """YouTube learning video recommendation."""
    video_id: str = Field(..., description="YouTube video ID")
    title: str = Field(..., description="Video title")
    url: str = Field(..., description="YouTube video URL")
    description: Optional[str] = Field(None, description="Video description")
    channel_title: Optional[str] = Field(None, description="Channel name")
    thumbnail: Optional[str] = Field(None, description="Thumbnail URL")


class ExternalLearningResource(BaseModel):
    """External learning resource found via web search."""
    title: str = Field(..., description="Title of the resource")
    url: str = Field(..., description="URL of the resource")
    description: str = Field(..., description="Description or summary of the resource")
    relevance_score: Optional[float] = Field(None, description="Relevance score from search")


class YouTubeLearningVideo(BaseModel):
    """YouTube learning video recommendation."""
    video_id: str = Field(..., description="YouTube video ID")
    title: str = Field(..., description="Video title")
    url: str = Field(..., description="YouTube video URL")
    description: Optional[str] = Field(None, description="Video description")
    channel_title: Optional[str] = Field(None, description="Channel name")
    thumbnail: Optional[str] = Field(None, description="Thumbnail URL")


class LearningPlan(BaseModel):
    """Personalized learning plan."""
    current_level_assessment: str = Field(..., description="Assessment of user's current JLPT level and progress")
    weak_areas_summary: str = Field(..., description="Summary of identified weak areas")
    short_term_goals: List[str] = Field(..., description="1-week goals")
    medium_term_goals: List[str] = Field(..., description="1-month goals")
    long_term_goals: List[str] = Field(..., description="3-month goals")
    weekly_plans: List[WeeklyFocus] = Field(..., description="Weekly study plans")
    recommended_features: List[SoramiFeatureRecommendation] = Field(..., description="Recommended Sorami features to use")
    external_resources: Optional[List[ExternalLearningResource]] = Field(default_factory=list, description="External learning resources found via web search")
    youtube_videos: Optional[List[YouTubeLearningVideo]] = Field(default_factory=list, description="Recommended YouTube learning videos")
    study_tips: List[str] = Field(default_factory=list, description="Personalized study tips")


class PlanRecommendation(BaseModel):
    """Complete learning plan recommendation."""
    learning_plan: LearningPlan
    weaknesses: WeaknessAnalysis
    next_steps: List[str] = Field(..., description="Immediate next steps for the user")


class UserProgressData(BaseModel):
    """User progress data summary."""
    user_id: int
    current_jlpt_level: int
    kanji_mastered: int
    kanji_studied: int
    vocabulary_mastered: int
    vocabulary_studied: int
    grammar_points_studied: int
    overall_accuracy: Optional[float] = None
    study_streak_days: int = 0


class State(TypedDict):
    """The state object used throughout the LangGraph workflow."""
    user_id: int
    token: Optional[str]  # JWT token for calling Go backend API
    learning_goal: Optional[str]  # Optional user-provided learning goal
    user_data: Dict[str, Any]  # Comprehensive user data from Go backend API
    weaknesses: Optional[WeaknessAnalysis]  # Identified weaknesses
    learning_resources: Optional[List[Dict[str, Any]]]  # External learning resources from Tavily
    youtube_videos: Optional[List[Dict[str, Any]]]  # YouTube learning videos
    learning_plan: Optional[LearningPlan]  # Generated learning plan
    recommendations: Optional[PlanRecommendation]  # Final recommendations
