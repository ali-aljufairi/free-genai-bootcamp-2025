import logging
from groq import Groq
import os
from dotenv import load_dotenv
import requests
from google.cloud import vision
import io
from PIL import Image, ImageOps
import numpy as np
import json
from typing import Any
from messages import (
    SENTENCE_SYSTEM_MESSAGE,
    SENTENCE_USER_TEMPLATE,
    TRANSLATION_SYSTEM_MESSAGE,
    TRANSLATION_USER_TEMPLATE,
    GRADING_SYSTEM_MESSAGE,
    GRADING_USER_TEMPLATE,
)
from models import Sentence, WordFeedback, SentenceFeedback

# Load environment variables
load_dotenv()

# Setup logging
logger = logging.getLogger("japanese_app")
logger.setLevel(logging.DEBUG)
fh = logging.FileHandler("app.log")
fh.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
logger.addHandler(fh)

INK_PIXEL_THRESHOLD = 245
EMPTY_CANVAS_INK_RATIO_THRESHOLD = 0.003
LANCZOS = getattr(Image, "Resampling", Image).LANCZOS


def parse_bool_env(value: str | None, default: bool = False) -> bool:
    """Parse boolean environment variables consistently."""
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def is_cjk_ideograph(char: str) -> bool:
    """Return True when a character is in Kanji/CJK ideograph ranges."""
    code = ord(char)
    cjk_ranges = (
        (0x3400, 0x4DBF),   # CJK Unified Ideographs Extension A
        (0x4E00, 0x9FFF),   # CJK Unified Ideographs
        (0xF900, 0xFAFF),   # CJK Compatibility Ideographs
        (0x20000, 0x2A6DF), # CJK Unified Ideographs Extension B
        (0x2A700, 0x2B73F), # CJK Unified Ideographs Extension C
        (0x2B740, 0x2B81F), # CJK Unified Ideographs Extension D
        (0x2B820, 0x2CEAF), # CJK Unified Ideographs Extension E/F
        (0x2CEB0, 0x2EBEF), # CJK Unified Ideographs Extension G/I
        (0x30000, 0x3134F), # CJK Unified Ideographs Extension G/H
    )
    return any(start <= code <= end for start, end in cjk_ranges)


def extract_cjk_text(text: str) -> str:
    """Extract only CJK ideographs from OCR output."""
    return "".join(char for char in text if is_cjk_ideograph(char))


def flatten_to_white_background(image: Image.Image) -> Image.Image:
    """Normalize images to RGB with a white background (handles transparency)."""
    if image.mode in ("RGBA", "LA") or (
        image.mode == "P" and "transparency" in image.info
    ):
        base = Image.new("RGBA", image.size, (255, 255, 255, 255))
        base.alpha_composite(image.convert("RGBA"))
        return base.convert("RGB")
    if image.mode == "RGB":
        return image.copy()
    return image.convert("RGB")


def preprocess_kanji_for_ocr(image: Image.Image) -> Image.Image:
    """Build a high-contrast OCR-friendly image variant for handwritten kanji."""
    normalized = flatten_to_white_background(image)
    grayscale = ImageOps.grayscale(normalized)
    contrasted = ImageOps.autocontrast(grayscale)
    thresholded = contrasted.point(lambda px: 255 if px > 190 else 0, mode="L")
    return thresholded.resize(
        (thresholded.width * 2, thresholded.height * 2),
        resample=LANCZOS,
    )


def calculate_ink_ratio(image: Image.Image) -> float:
    """Estimate how much of the canvas contains ink."""
    grayscale = ImageOps.grayscale(flatten_to_white_background(image))
    array = np.asarray(grayscale, dtype=np.uint8)
    if array.size == 0:
        return 0.0
    ink_pixels = np.count_nonzero(array < INK_PIXEL_THRESHOLD)
    return ink_pixels / float(array.size)


def rank_ocr_candidate(cjk_text: str, target_character: str) -> tuple[int, int]:
    """Rank OCR candidates: exact > contains > single-char > longest span."""
    if not cjk_text:
        return (0, 0)
    if target_character and cjk_text == target_character:
        return (4, len(cjk_text))
    if target_character and target_character in cjk_text:
        return (3, len(cjk_text))
    if len(cjk_text) == 1:
        return (2, 1)
    return (1, len(cjk_text))


def select_best_kanji_candidate(
    candidates: list[dict[str, str]],
    target_character: str,
) -> dict[str, Any]:
    """Select the best OCR candidate from multiple OCR passes."""
    best_candidate: dict[str, Any] = {
        "variant": "none",
        "raw_text": "",
        "cjk_text": "",
        "rank": (0, 0),
        "ocr_confidence": 0.0,
    }

    for candidate in candidates:
        cjk_text = extract_cjk_text(candidate.get("raw_text", ""))
        rank = rank_ocr_candidate(cjk_text, target_character)
        if rank > best_candidate["rank"]:
            best_candidate = {
                "variant": candidate.get("variant", "unknown"),
                "raw_text": candidate.get("raw_text", ""),
                "cjk_text": cjk_text,
                "rank": rank,
                "ocr_confidence": 0.0,
            }

    rank_level = best_candidate["rank"][0]
    if rank_level == 4:
        best_candidate["ocr_confidence"] = 0.99
    elif rank_level == 3:
        best_candidate["ocr_confidence"] = 0.9
    elif rank_level == 2:
        best_candidate["ocr_confidence"] = 0.7
    elif rank_level == 1:
        best_candidate["ocr_confidence"] = 0.55
    elif best_candidate["raw_text"]:
        best_candidate["ocr_confidence"] = 0.1
    else:
        best_candidate["ocr_confidence"] = 0.0

    return best_candidate


def score_kanji_attempt(
    target_character: str,
    transcription_clean: str,
    ink_ratio: float,
) -> dict[str, Any]:
    """Deterministically score a kanji attempt before optional AI feedback."""
    if ink_ratio < EMPTY_CANVAS_INK_RATIO_THRESHOLD:
        return {
            "accuracy": 0.0,
            "grade": "C",
            "feedback": "Canvas appears empty. Please draw the kanji and submit again.",
            "stroke_order_correct": None,
            "detection_mode": "empty_canvas",
            "should_use_ai_feedback": False,
        }

    if not transcription_clean:
        return {
            "accuracy": 15.0,
            "grade": "C",
            "feedback": (
                "Could not confidently recognize a kanji character. "
                "Try darker, larger strokes with clearer spacing."
            ),
            "stroke_order_correct": False,
            "detection_mode": "no_cjk_detected",
            "should_use_ai_feedback": False,
        }

    if transcription_clean == target_character:
        return {
            "accuracy": 100.0,
            "grade": "S",
            "feedback": (
                f"Perfect! You correctly wrote {target_character}. "
                "Excellent stroke accuracy!"
            ),
            "stroke_order_correct": True,
            "detection_mode": "exact_match",
            "should_use_ai_feedback": False,
        }

    if target_character in transcription_clean:
        return {
            "accuracy": 88.0,
            "grade": "A",
            "feedback": (
                f"Very good! You wrote {target_character} correctly. "
                "The character is clear and recognizable."
            ),
            "stroke_order_correct": True,
            "detection_mode": "contains_target",
            "should_use_ai_feedback": False,
        }

    from Levenshtein import distance

    dist = distance(transcription_clean, target_character)
    max_len = max(len(transcription_clean), len(target_character))
    similarity = 1 - (dist / max_len) if max_len > 0 else 0
    char_similarity = (
        0.75
        if target_character and transcription_clean and transcription_clean[0] == target_character[0]
        else 0.2
    )
    accuracy = max(
        25.0,
        min(92.0, (similarity * 0.65 + char_similarity * 0.35) * 100),
    )

    if accuracy >= 80:
        return {
            "accuracy": accuracy,
            "grade": "A",
            "feedback": (
                f"Good attempt! Your drawing is close to {target_character}. "
                "Keep practicing to improve accuracy."
            ),
            "stroke_order_correct": True,
            "detection_mode": "high_similarity",
            "should_use_ai_feedback": True,
        }

    if accuracy >= 60:
        return {
            "accuracy": accuracy,
            "grade": "B",
            "feedback": (
                f"Decent attempt. You're getting closer to {target_character}. "
                "Focus on stroke order and proportions."
            ),
            "stroke_order_correct": None,
            "detection_mode": "medium_similarity",
            "should_use_ai_feedback": True,
        }

    return {
        "accuracy": accuracy,
        "grade": "C",
        "feedback": (
            f"Keep practicing! Your drawing doesn't quite match {target_character}. "
            "Try following the stroke guide more carefully."
        ),
        "stroke_order_correct": False,
        "detection_mode": "low_similarity",
        "should_use_ai_feedback": False,
    }


class JapaneseApp:
    def __init__(self):
        # Load environment variables with defaults
        self.client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        self.api_base_url = os.environ.get("API_BASE_URL", "http://localhost:8080")
        self.api_v1_path = os.environ.get("API_V1_PATH", "/api/v1")
        self.words_random_endpoint = os.environ.get(
            "WORDS_RANDOM_ENDPOINT", "/words/random"
        )
        self.llm_model = os.environ.get("LLM_MODEL", "llama-3.1-8b-instant")
        self.llm_temperature = float(os.environ.get("LLM_TEMPERATURE", "0.3"))
        self.llm_max_tokens = int(os.environ.get("LLM_MAX_TOKENS", "100"))
        self.kanji_ocr_v2_enabled = parse_bool_env(
            os.environ.get("KANJI_OCR_V2_ENABLED"),
            default=True,
        )
        self.kanji_ocr_debug = parse_bool_env(
            os.environ.get("KANJI_OCR_DEBUG"),
            default=False,
        )
        self.current_word = None
        self.current_sentence = None

        # Initialize Google Cloud Vision client with API key
        try:
            api_key = os.environ.get("GOOGLE_API_KEY", "").strip()
            if not api_key:
                raise ValueError("GOOGLE_API_KEY environment variable is not set")

            self.vision_client = vision.ImageAnnotatorClient(
                client_options={"api_key": api_key}
            )
            logger.info(
                "Google Cloud Vision client initialized successfully with API key"
            )
        except Exception as e:
            logger.error(f"Failed to initialize Google Cloud Vision client: {str(e)}")
            raise RuntimeError(
                "Failed to initialize Google Cloud Vision client. Please check your API key."
            )

    def ocr_image(
        self,
        image: Image.Image,
        language_hints: list[str] | None = None,
    ) -> str:
        """Use Google Cloud Vision API to perform OCR on a PIL image."""
        try:
            # Convert PIL Image to bytes
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            content = buffered.getvalue()

            # Create Vision API image object
            vision_image = vision.Image(content=content)

            # Perform text detection
            request_kwargs: dict[str, Any] = {"image": vision_image}
            if language_hints:
                request_kwargs["image_context"] = vision.ImageContext(
                    language_hints=language_hints
                )
            response = self.vision_client.text_detection(**request_kwargs)

            if response.error.message:
                logger.error(f"Vision API error: {response.error.message}")
                return ""

            # Get the full text annotation
            if response.text_annotations:
                return response.text_annotations[0].description.strip()

            return ""
        except Exception as e:
            logger.error(f"Error in OCR processing: {str(e)}")
            return ""

    def grade_submission(self, transcription: str, target: str) -> tuple[str, str]:
        """Grade the submission based on transcription and target text."""
        try:
            # Clean and normalize both texts
            transcription = transcription.strip()
            target = target.strip()

            # Exact match
            if transcription == target:
                return "S", "Perfect! Your writing matches exactly."

            # Check for partial matches
            if target in transcription:
                return "A", "Good job! The target text was found within your writing."

            # Use Levenshtein distance for similarity
            from Levenshtein import distance

            dist = distance(transcription, target)
            max_len = max(len(transcription), len(target))
            similarity = 1 - (dist / max_len)

            if similarity >= 0.8:
                return (
                    "A",
                    f"Very close! Your writing is {similarity:.0%} similar to the target.",
                )
            elif similarity >= 0.6:
                return (
                    "B",
                    f"Good attempt! Your writing is {similarity:.0%} similar to the target.",
                )
            else:
                return (
                    "C",
                    f"Keep practicing! Your writing is {similarity:.0%} similar to the target.",
                )

        except Exception as e:
            logger.error(f"Error in grading: {str(e)}")
            return "C", "Error in grading. Please try again."

    def process_word_image(
        self, image: Image.Image, target_word=None
    ) -> tuple[str, str, str, str]:
        """Process a word submission image and return feedback."""
        try:
            # Use target word if provided, otherwise use current word
            target = target_word or (
                self.current_word.get("japanese") if self.current_word else ""
            )
            if not target:
                raise ValueError("No target word provided")

            # Perform OCR
            transcription = self.ocr_image(image)
            if not transcription:
                return (
                    "",
                    target,
                    "C",
                    "Could not recognize any text. Please try writing more clearly.",
                )

            # Grade the submission
            grade, feedback = self.grade_submission(transcription, target)

            return transcription, target, grade, feedback

        except Exception as e:
            logger.error(f"Error processing word image: {str(e)}")
            return "", target, "C", f"Error processing submission: {str(e)}"

    def process_sentence_image(
        self, image: Image.Image, target_sentence=None
    ) -> tuple[str, str, str, str]:
        """Process a sentence submission image and return feedback."""
        try:
            # Use target sentence if provided, otherwise use current sentence
            target = target_sentence or (
                self.current_sentence_data.sentence
                if hasattr(self, "current_sentence_data")
                else ""
            )
            if not target:
                raise ValueError("No target sentence provided")

            # Perform OCR
            transcription = self.ocr_image(image)
            if not transcription:
                return (
                    "",
                    target,
                    "C",
                    "Could not recognize any text. Please try writing more clearly.",
                )

            # Grade the submission
            grade, feedback = self.grade_submission(transcription, target)

            return transcription, target, grade, feedback

        except Exception as e:
            logger.error(f"Error processing sentence image: {str(e)}")
            return "", target, "C", f"Error processing submission: {str(e)}"

    def get_random_word(self, token: str | None = None):
        """Get a random word from API
        
        Raises:
            requests.exceptions.Timeout: If the API request times out
            requests.exceptions.ConnectionError: If there's a connection error
            ValueError: If the API returns an error response or invalid data
            Exception: For other unexpected errors
        """
        try:
            # Use the /api/langportal/words/random endpoint directly
            url = f"{self.api_base_url}/api/langportal/words/random"
            logger.debug(f"Fetching random word from: {url}")

            headers = {}
            if token:
                headers["Authorization"] = f"Bearer {token}"

            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                word_data = response.json()
                logger.debug(f"Received word data: {word_data}")

                # Validate that we received valid word data
                japanese = word_data.get("japanese", "")
                if not japanese:
                    # Check if we have kana as fallback
                    if not word_data.get("kana", ""):
                        logger.error("Received word data with no japanese or kana fields")
                        raise ValueError("API returned word with no readable form (both japanese and kana are empty)")

                # Store the full response
                self.current_word = {
                    "japanese": japanese or word_data.get("kana", ""),
                    "english": word_data.get("english", ""),
                    "romaji": word_data.get("romaji", ""),
                    "parts": word_data.get("parts", {"type": "noun"}),
                    "id": word_data.get("id", 0),
                }

                return (
                    self.current_word.get("japanese", ""),
                    self.current_word.get("english", ""),
                    self.current_word.get("romaji", ""),
                    "Write this word in Japanese characters",
                )
            else:
                # Extract error details from response
                error_detail = f"HTTP {response.status_code}"
                error_message = f"Failed to fetch random word from API"
                try:
                    error_data = response.json()
                    error_detail = error_data.get("error", error_data.get("detail", error_detail))
                    error_message = f"{error_message}: {error_detail}"
                except:
                    error_detail = response.text if response.text else error_detail
                    error_message = f"{error_message}: {error_detail}"
                
                logger.error(f"Error fetching random word: {error_message} (Status: {response.status_code})")
                raise ValueError(error_message)
        except requests.exceptions.Timeout as e:
            error_msg = f"Timeout fetching random word from API (URL: {url})"
            logger.error(error_msg)
            raise requests.exceptions.Timeout(error_msg) from e
        except requests.exceptions.ConnectionError as e:
            error_msg = f"Connection error fetching random word from API (URL: {url}): {str(e)}"
            logger.error(error_msg)
            raise requests.exceptions.ConnectionError(error_msg) from e
        except (ValueError, requests.exceptions.Timeout, requests.exceptions.ConnectionError):
            # Re-raise these exceptions as-is
            raise
        except Exception as e:
            error_msg = f"Unexpected error in get_random_word (URL: {url}): {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise Exception(error_msg) from e

    def generate_sentence(self, word):
        """Generate a sentence using Groq API with JSON mode"""
        logger.debug(f"Generating sentence for word: {word.get('japanese', '')}")
        try:
            # Prepare the Sentence model schema
            sentence_schema = json.dumps(Sentence.model_json_schema(), indent=2)

            # Updated system message with more explicit instructions
            system_message = (
                SENTENCE_SYSTEM_MESSAGE
                + f"""
The JSON object must exactly follow this schema: {sentence_schema}

Here's a specific example of the expected format:
{{
  "sentence": "彼女は学生です。", 
  "english": "She is a student.",
  "kanji": "学生",  
  "romaji": "kanojo wa gakusei desu."
}}

Make sure all fields are filled with appropriate values. If there are no kanji characters, still include the field with an empty string.
"""
            )

            # Using JSON mode with the Groq API
            response = self.client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": system_message},
                    {
                        "role": "user",
                        "content": SENTENCE_USER_TEMPLATE.format(
                            word=word.get("japanese", "")
                        ),
                    },
                ],
                temperature=self.llm_temperature,
                response_format={"type": "json_object"},
            )

            # Parse the JSON response
            content = response.choices[0].message.content.strip()
            logger.debug(f"Raw Groq response: {content}")

            # Parse to Pydantic model to validate structure
            sentence_data = Sentence.model_validate_json(content)
            logger.info(f"Generated sentence: {sentence_data.sentence}")

            # Store the full sentence data
            self.current_sentence_data = sentence_data

            return sentence_data.sentence
        except Exception as e:
            logger.error(f"Error generating sentence: {str(e)}")

            # Attempt to create a fallback sentence if the JSON generation fails
            try:
                # Fallback to regular text generation without JSON mode
                fallback_response = self.client.chat.completions.create(
                    model=self.llm_model,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a Japanese language teacher. Generate a simple Japanese sentence using the provided word.",
                        },
                        {
                            "role": "user",
                            "content": f"Create a very simple sentence using the Japanese word '{word.get('japanese', '')}'. Return only the sentence in Japanese without any explanation.",
                        },
                    ],
                    temperature=self.llm_temperature,
                    max_tokens=50,
                )

                fallback_sentence = fallback_response.choices[0].message.content.strip()
                logger.info(f"Generated fallback sentence: {fallback_sentence}")

                # Create a basic sentence object with the fallback
                self.current_sentence_data = Sentence(
                    sentence=fallback_sentence,
                    english=f"Sentence with {word.get('english', '')}",
                    kanji=word.get("japanese", ""),
                    romaji=word.get("romaji", ""),
                )

                return fallback_sentence
            except Exception as fallback_error:
                logger.error(
                    f"Error generating fallback sentence: {str(fallback_error)}"
                )
                return "Error generating sentence. Please try again."

    def get_random_word_and_sentence(self):
        """Get a random word and generate a sentence"""
        logger.debug("Getting random word and generating sentence")

        # Try to get a random word
        kanji, english, reading, _ = self.get_random_word()

        # If we couldn't get a word from the API, create a default one to ensure functionality
        if not kanji:
            logger.warning("Failed to get random word from API, using fallback word")
            # Use a fallback word so we can still generate a sentence
            self.current_word = {
                "japanese": "日本語",
                "english": "Japanese language",
                "romaji": "nihongo",
            }
            kanji = self.current_word["japanese"]
            english = self.current_word["english"]
            reading = self.current_word["romaji"]

        # Generate sentence using JSON mode
        self.current_sentence = self.generate_sentence(self.current_word)

        # Return data from the stored sentence data
        if hasattr(self, "current_sentence_data"):
            return (
                self.current_sentence_data.sentence,
                f"English: {self.current_sentence_data.english}",
                f"Kanji: {self.current_sentence_data.kanji}",
                f"Reading: {self.current_sentence_data.romaji}",
            )
        else:
            # Fallback to the old format if JSON parsing failed
            return (
                self.current_sentence,
                f"English: {english}",
                f"Kanji: {kanji}",
                f"Reading: {reading}",
            )

    def grade_word_submission(self, image):
        """Process a word submission and grade it using OCR and rubric feedback."""
        try:
            logger.info(f"Processing image type: {type(image)}")
            logger.info(
                f"Image size: {image.size if hasattr(image, 'size') else 'unknown'}"
            )
            logger.info("Performing OCR with Google Vision API")
            transcription = self.ocr_image(image)
            logger.info(f"OCR Transcription result: {transcription}")
            logger.info(f"Current word data: {self.current_word}")

            # Compare with current word
            grade = "C"
            feedback = ""

            if transcription == self.current_word.get("japanese"):
                grade = "S"
                feedback = "Perfect match! Excellent writing."
            elif transcription in [
                self.current_word.get("japanese"),
                self.current_word.get("romaji"),
            ]:
                grade = "A"
                feedback = "Very good! The characters are clear and correct."
            else:
                # Use Groq for detailed feedback
                response = self.client.chat.completions.create(
                    model=self.llm_model,
                    messages=[
                        {
                            "role": "system",
                            "content": GRADING_SYSTEM_MESSAGE,
                        },
                        {
                            "role": "user",
                            "content": f"Target word: {self.current_word.get('japanese')}\nSubmission: {transcription}\nProvide brief feedback on accuracy and writing quality.",
                        },
                    ],
                    temperature=self.llm_temperature,
                    max_tokens=self.llm_max_tokens,
                )
                feedback = response.choices[0].message.content.strip()
                grade = "B" if "good" in feedback.lower() else "C"

            return transcription, self.current_word.get("japanese", ""), grade, feedback

        except Exception as e:
            logger.error(f"Error in grade_submission: {str(e)}", exc_info=True)
            return (
                f"Error processing submission: {str(e)}",
                self.current_word.get("japanese", "Error getting target word"),
                "C",
                f"An error occurred during OCR processing: {str(e)}",
            )

    def grade_sentence_submission(self, image):
        """Process a sentence submission and grade it using OCR and Groq."""
        try:
            logger.info("Performing OCR with Google Vision API")
            transcription = self.ocr_image(image)
            logger.debug(f"Transcription result: {transcription}")

            # Get literal translation
            logger.info("Getting literal translation")
            translation_response = self.client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": TRANSLATION_SYSTEM_MESSAGE},
                    {
                        "role": "user",
                        "content": TRANSLATION_USER_TEMPLATE.format(text=transcription),
                    },
                ],
                temperature=self.llm_temperature,
            )
            translation = translation_response.choices[0].message.content.strip()
            logger.debug(f"Translation: {translation}")

            # Get grading and feedback
            logger.info("Getting grade and feedback")
            grading_response = self.client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": GRADING_SYSTEM_MESSAGE},
                    {
                        "role": "user",
                        "content": GRADING_USER_TEMPLATE.format(
                            target_sentence=self.current_sentence,
                            submission=transcription,
                            translation=translation,
                        ),
                    },
                ],
                temperature=self.llm_temperature,
            )

            feedback = grading_response.choices[0].message.content.strip()
            # Parse grade and feedback from response
            grade = "C"  # Default grade
            if "Grade: S" in feedback:
                grade = "S"
            elif "Grade: A" in feedback:
                grade = "A"
            elif "Grade: B" in feedback:
                grade = "B"

            # Extract just the feedback part
            feedback = feedback.split("Feedback:")[-1].strip()

            logger.info(f"Grading complete: {grade}")
            logger.debug(f"Feedback: {feedback}")

            return transcription, translation, grade, feedback

        except Exception as e:
            logger.error(f"Error in grade_submission: {str(e)}")
            return (
                "Error processing submission",
                "Error processing submission",
                "C",
                f"An error occurred: {str(e)}",
            )

    def grade_word_canvas_submission(self, canvas_image: any):
        """Process the canvas drawing (numpy array) for word practice"""
        try:
            if canvas_image is None:
                raise ValueError("No canvas data provided")

            # Ensure we have valid image data
            if not isinstance(canvas_image, np.ndarray):
                raise ValueError("Invalid canvas data type")

            # Convert numpy array to PIL Image
            image = Image.fromarray(canvas_image.astype("uint8"))
            return self.process_word_image(image)
        except Exception as e:
            logger.error(f"Error processing canvas submission: {str(e)}")
            raise ValueError(f"Invalid canvas image data: {e}")

    def grade_sentence_canvas_submission(self, canvas_image: any):
        """Process the canvas drawing (numpy array) for sentence practice"""
        try:
            if canvas_image is None:
                raise ValueError("No canvas data provided")

            # Ensure we have valid image data
            if not isinstance(canvas_image, np.ndarray):
                raise ValueError("Invalid canvas data type")

            # Convert numpy array to PIL Image
            image = Image.fromarray(canvas_image.astype("uint8"))
            return self.process_sentence_image(image)
        except Exception as e:
            logger.error(f"Error processing canvas submission: {str(e)}")
            raise ValueError(f"Invalid canvas image data: {e}")

    def grade_word_submission_with_target(self, image, target_word=None):
        """Process a word submission with an explicit target word."""
        try:
            logger.info(f"Processing image type: {type(image)}")
            logger.info(
                f"Image size: {image.size if hasattr(image, 'size') else 'unknown'}"
            )
            logger.info("Performing OCR with Google Vision API")
            transcription = self.ocr_image(image)
            logger.info(f"OCR Transcription result: {transcription}")

            # Use provided target_word if available, otherwise fall back to current_word
            if target_word:
                logger.info(f"Using provided target word: {target_word}")
                japanese_target = target_word
            elif self.current_word:
                logger.info(f"Using current word: {self.current_word}")
                japanese_target = self.current_word.get("japanese", "")
            else:
                logger.warning("No target word available")
                japanese_target = "No target word available"

            # Compare with target word
            grade = "C"
            feedback = ""

            if transcription == japanese_target:
                grade = "S"
                feedback = "Perfect match! Excellent writing."
            elif (
                transcription
                and japanese_target
                and (transcription.lower() == japanese_target.lower())
            ):
                grade = "A"
                feedback = "Very good! The characters are clear and correct."
            else:
                # Use Groq for detailed feedback
                response = self.client.chat.completions.create(
                    model=self.llm_model,
                    messages=[
                        {
                            "role": "system",
                            "content": GRADING_SYSTEM_MESSAGE,
                        },
                        {
                            "role": "user",
                            "content": f"Target word: {japanese_target}\nSubmission: {transcription}\nProvide brief feedback on accuracy and writing quality.",
                        },
                    ],
                    temperature=self.llm_temperature,
                    max_tokens=self.llm_max_tokens,
                )
                feedback = response.choices[0].message.content.strip()
                grade = "B" if "good" in feedback.lower() else "C"

            return transcription, japanese_target, grade, feedback
        except Exception as e:
            logger.error(
                f"Error in grade_submission_with_target: {str(e)}", exc_info=True
            )
            return (
                f"Error processing submission: {str(e)}",
                target_word
                or self.current_word.get("japanese", "Error getting target word"),
                "C",
                f"An error occurred during OCR processing: {str(e)}",
            )

    def grade_sentence_submission_with_target(self, image, target_sentence=None):
        """Process a sentence submission with an explicit target sentence."""
        try:
            logger.info("Performing OCR with Google Vision API")
            transcription = self.ocr_image(image)
            logger.debug(f"Transcription result: {transcription}")

            # Use provided target_sentence if available, otherwise fall back to current_sentence
            if target_sentence:
                logger.info(f"Using provided target sentence: {target_sentence}")
                target = target_sentence
            elif self.current_sentence:
                logger.info(f"Using current sentence: {self.current_sentence}")
                target = self.current_sentence
            else:
                logger.warning("No target sentence available")
                target = "No target sentence available"

            # Get literal translation
            logger.info("Getting literal translation")
            translation_response = self.client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": TRANSLATION_SYSTEM_MESSAGE},
                    {
                        "role": "user",
                        "content": TRANSLATION_USER_TEMPLATE.format(text=transcription),
                    },
                ],
                temperature=self.llm_temperature,
            )
            translation = translation_response.choices[0].message.content.strip()
            logger.debug(f"Translation: {translation}")

            # Get grading and feedback
            logger.info("Getting grade and feedback")
            grading_response = self.client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": GRADING_SYSTEM_MESSAGE},
                    {
                        "role": "user",
                        "content": GRADING_USER_TEMPLATE.format(
                            target_sentence=target,
                            submission=transcription,
                            translation=translation,
                        ),
                    },
                ],
                temperature=self.llm_temperature,
            )

            feedback = grading_response.choices[0].message.content.strip()
            # Parse grade and feedback from response
            grade = "C"  # Default grade
            if "Grade: S" in feedback:
                grade = "S"
            elif "Grade: A" in feedback:
                grade = "A"
            elif "Grade: B" in feedback:
                grade = "B"

            # Extract just the feedback part
            feedback = feedback.split("Feedback:")[-1].strip()

            logger.info(f"Grading complete: {grade}")
            logger.debug(f"Feedback: {feedback}")

            return transcription, translation, grade, feedback, target
        except Exception as e:
            logger.error(f"Error in grade_sentence_submission_with_target: {str(e)}")
            return (
                "Error processing submission",
                "Error processing submission",
                "C",
                f"An error occurred: {str(e)}",
                target_sentence
                or self.current_sentence
                or "Error getting target sentence",
            )

    def process_kanji_image(
        self, image: Image.Image, kanji_id: int, target_character: str
    ) -> tuple[float, str, str, bool | None, str, float | None, str]:
        """
        Process a kanji drawing submission and return score plus OCR diagnostics.
        
        Args:
            image: PIL Image of the user's drawing
            kanji_id: The kanji ID being practiced
            target_character: The target kanji character
            
        Returns:
            Tuple of:
              - accuracy (0-100)
              - grade (S/A/B/C)
              - feedback
              - stroke_order_correct (bool | None)
              - recognized_text (cleaned OCR text)
              - ocr_confidence (0.0-1.0)
              - detection_mode (scoring branch identifier)
        """
        try:
            target_character = target_character.strip()
            normalized_image = flatten_to_white_background(image)
            ink_ratio = calculate_ink_ratio(normalized_image)

            ocr_variants: list[tuple[str, Image.Image]] = [("original", normalized_image)]
            if self.kanji_ocr_v2_enabled:
                grayscale = ImageOps.grayscale(normalized_image)
                ocr_variants.extend(
                    [
                        ("autocontrast", ImageOps.autocontrast(grayscale)),
                        ("preprocessed", preprocess_kanji_for_ocr(normalized_image)),
                    ]
                )

            ocr_candidates: list[dict[str, str]] = []
            for variant_name, variant_image in ocr_variants:
                raw_text = self.ocr_image(variant_image, language_hints=["ja"])
                ocr_candidates.append({"variant": variant_name, "raw_text": raw_text})

            best_candidate = select_best_kanji_candidate(ocr_candidates, target_character)
            transcription_clean = best_candidate["cjk_text"]
            ocr_confidence = float(best_candidate["ocr_confidence"])
            scoring = score_kanji_attempt(target_character, transcription_clean, ink_ratio)

            accuracy = float(scoring["accuracy"])
            grade = str(scoring["grade"])
            feedback = str(scoring["feedback"])
            stroke_order_correct = scoring["stroke_order_correct"]
            detection_mode = str(scoring["detection_mode"])

            # AI feedback is only helpful for medium-confidence attempts.
            if scoring["should_use_ai_feedback"]:
                try:
                    ai_feedback_response = self.client.chat.completions.create(
                        model=self.llm_model,
                        messages=[
                            {
                                "role": "system",
                                "content": (
                                    "You are a Japanese language teacher providing feedback "
                                    "on kanji writing practice. Be concise, encouraging, and specific."
                                ),
                            },
                            {
                                "role": "user",
                                "content": (
                                    f"Target kanji: {target_character}\n"
                                    f"Recognized: {transcription_clean}\n"
                                    f"Accuracy: {accuracy:.1f}%\n"
                                    "Give two short improvement tips."
                                ),
                            },
                        ],
                        temperature=self.llm_temperature,
                        max_tokens=90,
                    )
                    ai_feedback = ai_feedback_response.choices[0].message.content.strip()
                    if ai_feedback:
                        feedback = f"{feedback}\n\n{ai_feedback}"
                except Exception as e:
                    logger.warning(f"Failed to get AI feedback: {e}")

            log_payload: dict[str, Any] = {
                "kanji_id": kanji_id,
                "target_character": target_character,
                "image_mode": normalized_image.mode,
                "image_size": list(normalized_image.size),
                "ink_ratio": round(ink_ratio, 6),
                "selected_variant": best_candidate["variant"],
                "recognized_text": transcription_clean,
                "ocr_confidence": round(ocr_confidence, 3),
                "accuracy": round(accuracy, 2),
                "grade": grade,
                "detection_mode": detection_mode,
                "candidate_count": len(ocr_candidates),
            }
            if self.kanji_ocr_debug:
                log_payload["candidates"] = [
                    {
                        "variant": c["variant"],
                        "raw_text": c["raw_text"],
                        "cjk_text": extract_cjk_text(c["raw_text"]),
                    }
                    for c in ocr_candidates
                ]
            logger.info(
                "Kanji verification complete: %s",
                json.dumps(log_payload, ensure_ascii=False),
            )

            return (
                accuracy,
                grade,
                feedback,
                stroke_order_correct,
                transcription_clean,
                ocr_confidence,
                detection_mode,
            )
            
        except Exception as e:
            logger.error(f"Error processing kanji image: {str(e)}", exc_info=True)
            return (
                0.0,
                "C",
                f"Error processing kanji drawing: {str(e)}. Please try again.",
                None,
                "",
                None,
                "error",
            )
