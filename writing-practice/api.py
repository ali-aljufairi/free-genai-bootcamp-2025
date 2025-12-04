from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
from PIL import Image
import io
import logging
from core import JapaneseApp
from models import WordFeedback, SentenceFeedback, KanjiResponse, KanjiFeedback
import uvicorn
from auth import verify_bearer, get_user_id_from_claims
from utils.go_backend_client import get_random_kanji, save_kanji_trace

logger = logging.getLogger("fastapi_app")
logger.setLevel(logging.DEBUG)
fh = logging.FileHandler("app.log")
fh.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
logger.addHandler(fh)

# Create FastAPI app
api = FastAPI(title="Japanese Writing Practice API")

# Add CORS middleware
api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Japanese app
japanese_app = JapaneseApp()


# Define request models
class ImageSubmission(BaseModel):
    image: str  # Base64 encoded image
    target_word: str = None  # Optional target word for word feedback
    target_sentence: str = None  # Optional target sentence for sentence feedback


# Define response models
class RandomSentenceResponse(BaseModel):
    sentence: str
    english: str
    romaji: str
    word: str  # The word used to generate the sentence


class FeedbackResponse(BaseModel):
    transcription: str  # The OCR result of what was written
    target: str  # The target word/sentence
    grade: str  # The grade (S, A, B, C)
    feedback: str  # Detailed feedback


@api.get("/")
async def root():
    return {"message": "Japanese Writing Practice API"}


@api.get("/api/writing/random-sentence", response_model=RandomSentenceResponse)
async def get_random_sentence(
    authorization: str = Header(None),
    claims=Depends(verify_bearer),
):
    """Generate a random sentence using a random Japanese word"""
    try:
        # Extract token for Go backend calls
        token = None
        if authorization and authorization.lower().startswith("bearer "):
            token = authorization.split(" ", 1)[1]

        # First get a random word
        japanese, english, romaji, _ = japanese_app.get_random_word(token)

        if not japanese:
            logger.error("Failed to get random word")
            raise HTTPException(status_code=500, detail="Failed to get a random word")

        # Generate a sentence using this word
        word_data = (
            japanese_app.current_word
        )  # The word is stored in japanese_app.current_word
        sentence = japanese_app.generate_sentence(word_data)

        # Format response data
        sentence_data = (
            japanese_app.current_sentence_data
            if hasattr(japanese_app, "current_sentence_data")
            else None
        )

        if sentence_data:
            return RandomSentenceResponse(
                sentence=sentence_data.sentence,
                english=sentence_data.english,
                romaji=sentence_data.romaji,
                word=japanese,
            )
        else:
            return RandomSentenceResponse(
                sentence=sentence,
                english=f"Sentence with {english}",
                romaji=romaji,
                word=japanese,
            )
    except Exception as e:
        logger.error(f"Error generating random sentence: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error generating random sentence: {str(e)}"
        )


@api.get("/api/writing/random-word-sentence", response_model=RandomSentenceResponse)
async def get_random_word_sentence(
    authorization: str = Header(None),
    claims=Depends(verify_bearer),
):
    """Get a random word and generate a sentence using that word"""
    try:
        # Extract token for Go backend calls
        token = None
        if authorization and authorization.lower().startswith("bearer "):
            token = authorization.split(" ", 1)[1]

        # First get a random word
        japanese, english, romaji, _ = japanese_app.get_random_word(token)

        if not japanese:
            logger.error("Failed to get random word")
            raise HTTPException(status_code=500, detail="Failed to get a random word")

        # Generate a sentence using this word
        word_data = (
            japanese_app.current_word
        )  # The word is stored in japanese_app.current_word
        sentence = japanese_app.generate_sentence(word_data)

        # Format response data
        sentence_data = (
            japanese_app.current_sentence_data
            if hasattr(japanese_app, "current_sentence_data")
            else None
        )

        if sentence_data:
            return RandomSentenceResponse(
                sentence=sentence_data.sentence,
                english=sentence_data.english,
                romaji=sentence_data.romaji,
                word=japanese,
            )
        else:
            return RandomSentenceResponse(
                sentence=sentence,
                english=f"Sentence with {english}",
                romaji=romaji,
                word=japanese,
            )
    except Exception as e:
        logger.error(f"Error generating word and sentence: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error generating word and sentence: {str(e)}"
        )


@api.post("/api/writing/feedback-word", response_model=FeedbackResponse)
async def get_word_feedback(
    submission: ImageSubmission,
    authorization: str = Header(None),
    claims=Depends(verify_bearer),
):
    """Get feedback on a word writing submission"""
    try:
        # Extract token for Go backend calls (if needed in future)
        token = None
        if authorization and authorization.lower().startswith("bearer "):
            token = authorization.split(" ", 1)[1]

        # Decode base64 image
        image_data = base64.b64decode(submission.image)
        image = Image.open(io.BytesIO(image_data))

        # Process the image with the target word if provided
        transcription, target, grade, feedback = japanese_app.process_word_image(
            image, submission.target_word
        )

        return FeedbackResponse(
            transcription=transcription, target=target, grade=grade, feedback=feedback
        )
    except Exception as e:
        logger.error(f"Error processing word submission: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error processing submission: {str(e)}"
        )


@api.post("/api/writing/feedback-sentence", response_model=FeedbackResponse)
async def get_sentence_feedback(
    submission: ImageSubmission,
    authorization: str = Header(None),
    claims=Depends(verify_bearer),
):
    """Get feedback on a sentence writing submission"""
    try:
        # Extract token for Go backend calls
        token = None
        if authorization and authorization.lower().startswith("bearer "):
            token = authorization.split(" ", 1)[1]

        # Get user_id from Go backend
        user_id = get_user_id_from_claims(claims, token) if token else None

        # Decode base64 image
        image_data = base64.b64decode(submission.image)
        image = Image.open(io.BytesIO(image_data))

        # Process the image with the target sentence if providd
        result = japanese_app.process_sentence_image(image, submission.target_sentence)

        # Check if we're receiving the newer 5-tuple result or the older 4-tuple result
        if len(result) == 5:
            transcription, translation, grade, feedback, target = result
        else:
            transcription, translation, grade, feedback = result
            target = (
                submission.target_sentence or japanese_app.current_sentence
            )  # Use provided target if available

        # For sentence feedback, return the response with the target sentence
        return FeedbackResponse(
            transcription=transcription,
            target=target,  # The target sentence
            grade=grade,
            feedback=feedback,
        )
    except Exception as e:
        logger.error(f"Error processing sentence submission: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error processing submission: {str(e)}"
        )


@api.get("/api/writing/kanji/random", response_model=KanjiResponse)
async def get_random_kanji_for_practice(
    authorization: str = Header(None),
    claims=Depends(verify_bearer),
):
    """Get a random kanji with SVG stroke data for practice"""
    try:
        # Extract token for Go backend calls
        token = None
        if authorization and authorization.lower().startswith("bearer "):
            token = authorization.split(" ", 1)[1]

        if not token:
            raise HTTPException(status_code=401, detail="Missing bearer token")

        # Get user_id from Go backend (to potentially filter by user level)
        # This is optional - if Go backend is unavailable, we'll proceed without user filtering
        user_id = None
        jlpt_level = None

        try:
            user_id = get_user_id_from_claims(claims, token)

            # Get user profile to determine JLPT level (optional)
            from utils.go_backend_client import get_user_profile

            user_profile = get_user_profile(token)
            if user_profile and "settings" in user_profile:
                settings = user_profile.get("settings", {})
                jlpt_level = settings.get("current_jlpt_level")
        except Exception as e:
            # Log but don't fail - we can still get random kanji without user filtering
            logger.warning(f"Could not fetch user profile (non-critical): {e}")

        # Get random kanji from Go backend
        kanji_data = get_random_kanji(token, jlpt_level)

        if not kanji_data:
            raise HTTPException(
                status_code=503,
                detail="Kanji service is temporarily unavailable. Please ensure the Go backend is running on port 8080.",
            )

        # Convert to response model (KanjiResponse is the same as Kanji in models.py)
        return KanjiResponse(
            id=kanji_data.get("id"),
            character=kanji_data.get("character", ""),
            heisig_en=kanji_data.get("heisig_en"),
            meanings=kanji_data.get("meanings", []),
            detail=kanji_data.get("detail"),
            unicode=kanji_data.get("unicode", ""),
            onyomi=kanji_data.get("onyomi"),
            kunyomi=kanji_data.get("kunyomi"),
            jlpt=kanji_data.get("jlpt"),
            frequency=kanji_data.get("frequency"),
            components=kanji_data.get("components"),
            stroke_count=kanji_data.get("stroke_count"),
            strokes_svg=kanji_data.get("strokes_svg"),
            audio_path=kanji_data.get("audio_path"),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting random kanji: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error getting random kanji: {str(e)}"
        )


class KanjiImageSubmission(BaseModel):
    image: str  # Base64 encoded image
    kanji_id: int  # The kanji ID being practiced
    character: str  # The kanji character for verification


@api.post("/api/writing/kanji/feedback", response_model=KanjiFeedback)
async def get_kanji_feedback(
    submission: KanjiImageSubmission,
    authorization: str = Header(None),
    claims=Depends(verify_bearer),
):
    """Get feedback on a kanji drawing submission"""
    try:
        # Extract token for Go backend calls
        token = None
        if authorization and authorization.lower().startswith("bearer "):
            token = authorization.split(" ", 1)[1]

        if not token:
            raise HTTPException(status_code=401, detail="Missing bearer token")

        # Get user_id from Go backend
        user_id = get_user_id_from_claims(claims, token)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unable to identify user")

        # Decode base64 image
        image_data = base64.b64decode(submission.image)
        image = Image.open(io.BytesIO(image_data))

        # Process kanji drawing verification
        accuracy, grade, feedback, stroke_order_correct = (
            japanese_app.process_kanji_image(
                image, submission.kanji_id, submission.character
            )
        )

        # Save practice attempt to database via Go backend
        # Convert image to SVG string for storage (simplified - in production, might want actual SVG trace)
        trace_svg = (
            f"<svg><image href='data:image/png;base64,{submission.image}'/></svg>"
        )
        save_kanji_trace(token, submission.kanji_id, trace_svg, accuracy)

        return KanjiFeedback(
            kanji_id=submission.kanji_id,
            character=submission.character,
            accuracy=accuracy,
            grade=grade,
            feedback=feedback,
            stroke_order_correct=stroke_order_correct,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing kanji submission: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error processing submission: {str(e)}"
        )


# For direct execution
if __name__ == "__main__":
    uvicorn.run("api:api", host="0.0.0.0", port=8001, reload=True)
