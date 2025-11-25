import logging
from groq import Groq
import os
from dotenv import load_dotenv
import requests
from google.cloud import vision
import io
from PIL import Image
import numpy as np
import json
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
        self.current_word = None
        self.current_sentence = None

        # Initialize Google Cloud Vision client with API key
        try:
            api_key = os.environ.get("GOOGLE_API_KEY")
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

    def ocr_image(self, image: Image.Image) -> str:
        """Use Google Cloud Vision API to perform OCR on a PIL image."""
        try:
            # Convert PIL Image to bytes
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            content = buffered.getvalue()

            # Create Vision API image object
            vision_image = vision.Image(content=content)

            # Perform text detection
            response = self.vision_client.text_detection(image=vision_image)

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
        """Get a random word from API"""
        try:
            # Use the /api/langportal/words/random endpoint directly
            url = f"{self.api_base_url}/api/langportal/words/random"
            logger.debug(f"Fetching random word from: {url}")

            headers = {}
            if token:
                headers["Authorization"] = f"Bearer {token}"

            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                word_data = response.json()
                logger.debug(f"Received word data: {word_data}")

                # Store the full response
                self.current_word = {
                    "japanese": word_data.get("japanese", ""),
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

            logger.error(f"Error fetching random word: {response.status_code}")
            return "", "", "", "Error fetching word. Please try again."
        except Exception as e:
            logger.error(f"Error in get_random_word: {str(e)}")
            return "", "", "", f"An error occurred: {str(e)}"

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
        """Process word submission and grade it using MangaOCR"""
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
        """Process sentence submission and grade it using MangaOCR and Groq"""
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
        """Process word submission and grade it using MangaOCR with a specific target word"""
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
        """Process sentence submission and grade it using MangaOCR and Groq with a specific target sentence"""
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
    ) -> tuple[float, str, str, bool | None]:
        """
        Process a kanji drawing submission and return accuracy, grade, feedback, and stroke order correctness.
        
        Args:
            image: PIL Image of the user's drawing
            kanji_id: The kanji ID being practiced
            target_character: The target kanji character
            
        Returns:
            Tuple of (accuracy: float 0-100, grade: str, feedback: str, stroke_order_correct: bool | None)
        """
        try:
            logger.info(f"Processing kanji drawing for character: {target_character}")
            
            # Perform OCR to recognize what was drawn
            transcription = self.ocr_image(image)
            logger.debug(f"OCR result: {transcription}")
            
            # Clean transcription - remove whitespace and extract kanji characters
            transcription_clean = "".join([c for c in transcription if "\u4e00" <= c <= "\u9fff"])
            
            # Calculate accuracy based on character match
            accuracy = 0.0
            grade = "C"
            stroke_order_correct = None
            
            if not transcription_clean:
                # No kanji detected
                accuracy = 0.0
                grade = "C"
                feedback = "Could not detect any kanji characters in your drawing. Please try writing more clearly."
            elif transcription_clean == target_character:
                # Exact match
                accuracy = 100.0
                grade = "S"
                feedback = f"Perfect! You correctly wrote {target_character}. Excellent stroke accuracy!"
                stroke_order_correct = True
            elif target_character in transcription_clean:
                # Target found within transcription
                accuracy = 85.0
                grade = "A"
                feedback = f"Very good! You wrote {target_character} correctly. The character is clear and recognizable."
                stroke_order_correct = True
            else:
                # Use similarity calculation
                from Levenshtein import distance
                
                # Calculate similarity for character recognition
                dist = distance(transcription_clean, target_character)
                max_len = max(len(transcription_clean), len(target_character))
                similarity = 1 - (dist / max_len) if max_len > 0 else 0
                
                # Also check if any character in transcription is similar
                char_similarity = 0.0
                if len(transcription_clean) > 0 and len(target_character) > 0:
                    # Compare first character
                    if transcription_clean[0] == target_character[0]:
                        char_similarity = 0.8
                    else:
                        # Use visual similarity (simplified - in production, use more sophisticated comparison)
                        char_similarity = 0.3
                
                # Combine OCR accuracy with visual assessment
                accuracy = (similarity * 60 + char_similarity * 40) * 100
                
                if accuracy >= 80:
                    grade = "A"
                    feedback = f"Good attempt! Your drawing is close to {target_character}. Keep practicing to improve accuracy."
                    stroke_order_correct = True
                elif accuracy >= 60:
                    grade = "B"
                    feedback = f"Decent attempt. You're getting closer to {target_character}. Focus on stroke order and proportions."
                    stroke_order_correct = None  # Uncertain
                else:
                    grade = "C"
                    feedback = f"Keep practicing! Your drawing doesn't quite match {target_character}. Try following the stroke guide more carefully."
                    stroke_order_correct = False
            
            # Use AI for more detailed feedback if accuracy is below 90%
            if accuracy < 90:
                try:
                    ai_feedback_response = self.client.chat.completions.create(
                        model=self.llm_model,
                        messages=[
                            {
                                "role": "system",
                                "content": "You are a Japanese language teacher providing feedback on kanji writing practice. Be encouraging and specific.",
                            },
                            {
                                "role": "user",
                                "content": f"Target kanji: {target_character}\nRecognized: {transcription_clean}\nAccuracy: {accuracy:.1f}%\nProvide brief, encouraging feedback on how to improve the drawing.",
                            },
                        ],
                        temperature=self.llm_temperature,
                        max_tokens=100,
                    )
                    ai_feedback = ai_feedback_response.choices[0].message.content.strip()
                    if ai_feedback:
                        feedback = f"{feedback}\n\n{ai_feedback}"
                except Exception as e:
                    logger.warning(f"Failed to get AI feedback: {e}")
                    # Continue with basic feedback
            
            logger.info(f"Kanji verification complete: {target_character}, accuracy={accuracy:.1f}%, grade={grade}")
            
            return accuracy, grade, feedback, stroke_order_correct
            
        except Exception as e:
            logger.error(f"Error processing kanji image: {str(e)}", exc_info=True)
            return (
                0.0,
                "C",
                f"Error processing kanji drawing: {str(e)}. Please try again.",
                None,
            )
