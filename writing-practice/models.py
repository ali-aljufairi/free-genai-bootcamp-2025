"""
Pydantic models for structured data in the Japanese learning application.
"""

from pydantic import BaseModel
from typing import Optional


class Sentence(BaseModel):
    """
    Model for generated Japanese sentences
    """

    sentence: str
    english: str
    kanji: Optional[str] = ""  # Make kanji optional with default empty string
    romaji: str


class WordFeedback(BaseModel):
    """
    Model for word writing feedback
    """

    transcription: str
    target: str
    grade: str
    feedback: str


class SentenceFeedback(BaseModel):
    """
    Model for sentence writing feedback
    """

    transcription: str
    translation: str
    grade: str
    feedback: str


class KanjiResponse(BaseModel):
    """
    Model for kanji data response
    """

    id: int
    character: str
    heisig_en: Optional[str] = None
    meanings: list[str]
    detail: Optional[str] = None
    unicode: str
    onyomi: Optional[str] = None
    kunyomi: Optional[str] = None
    jlpt: Optional[int] = None
    frequency: Optional[int] = None
    components: Optional[str] = None
    stroke_count: Optional[int] = None
    strokes_svg: Optional[str] = None
    audio_path: Optional[str] = None


class KanjiFeedback(BaseModel):
    """
    Model for kanji drawing feedback
    """

    kanji_id: int
    character: str
    accuracy: float  # 0-100
    grade: str  # S, A, B, C
    feedback: str
    stroke_order_correct: Optional[bool] = None
    recognized_text: Optional[str] = None
    ocr_confidence: Optional[float] = None
    detection_mode: Optional[str] = None
