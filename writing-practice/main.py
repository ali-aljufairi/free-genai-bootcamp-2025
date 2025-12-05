import streamlit as st
import os
from dotenv import load_dotenv
from core import JapaneseApp
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    filename="app.log",
)

load_dotenv()

if "app" not in st.session_state:
    st.session_state.app = JapaneseApp()

if "current_word" not in st.session_state:
    st.session_state.current_word = None

if "current_sentence" not in st.session_state:
    st.session_state.current_sentence = None

st.set_page_config(
    page_title="Japanese Learning Practice", page_icon="✍️", layout="wide"
)

st.markdown(
    """
    <style>
    .big-font {
        font-size: 40px !important;
        font-family: 'Noto Sans JP', sans-serif !important;
    }
    /* Tab styling for dark theme */
    .stTabs [data-baseweb="tab-list"] {
        gap: 24px;
        background-color: #1E1E1E !important;
        padding: 10px 20px;
        border-radius: 8px;
    }
    .stTabs [data-baseweb="tab"] {
        height: 50px;
        padding: 0 24px;
        background-color: #2E2E2E !important;
        color: #FFFFFF !important;
        border-radius: 4px;
        border: 1px solid #333333 !important;
    }
    .stTabs [data-baseweb="tab"]:hover {
        background-color: #3E3E3E !important;
        border-color: #444444 !important;
    }
    .stTabs [data-baseweb="tab"][aria-selected="true"] {
        background-color: #4E4E4E !important;
        border-color: #555555 !important;
    }
    /* Button styling for dark theme */
    .stButton button {
        background-color: #1E1E1E !important;
        color: #FFFFFF !important;
        border: 1px solid #333333 !important;
    }
    .stButton button:hover {
        background-color: #2E2E2E !important;
        border-color: #444444 !important;
    }
    .stButton button:active {
        background-color: #3E3E3E !important;
    }
    </style>
""",
    unsafe_allow_html=True,
)

# Main title
st.title("Japanese Learning Practice ✍️")

# Create tabs
tab1, tab2 = st.tabs(["Word Practice", "Sentence Practice"])

# Word Practice Tab
with tab1:
    col1, col2 = st.columns(2)

    with col1:
        if st.button("Get New Word", key="word_gen"):
            try:
                japanese, english, romaji, instruction = (
                    st.session_state.app.get_random_word()
                )
                st.session_state.current_word = {
                    "japanese": japanese,
                    "english": english,
                    "romaji": romaji,
                    "instruction": instruction,
                }
                logging.info(f"Retrieved new word: {st.session_state.current_word}")
            except Exception as e:
                logging.error(f"Error getting random word: {str(e)}")
                st.error(f"Error getting new word: {str(e)}")

        if st.session_state.current_word:
            st.markdown(
                f'<p class="big-font">{st.session_state.current_word["japanese"]}</p>',
                unsafe_allow_html=True,
            )
            st.text_input(
                "English", value=st.session_state.current_word["english"], disabled=True
            )
            st.text_input(
                "Reading", value=st.session_state.current_word["romaji"], disabled=True
            )
            st.text_input(
                "Instructions",
                value=st.session_state.current_word["instruction"],
                disabled=True,
            )

    with col2:
        input_method = st.radio(
            "Select input method:",
            ("Upload Image", "Draw on Canvas"),
            key="word_input_method",
        )
        if input_method == "Upload Image":
            file_input = st.file_uploader(
                "Upload your handwritten word",
                type=["png", "jpg", "jpeg"],
                key="word_image",
            )
        else:
            from components import draw_japanese_canvas

            canvas_result = draw_japanese_canvas(key="word_canvas")
            file_input = canvas_result is not None

        submit_button = st.button("Submit", key="word_submit")
        if submit_button and file_input:
            try:
                logging.info("Processing submission")
                # Process input based on method
                if input_method == "Upload Image":
                    # Save the uploaded file temporarily
                    image_path = f"temp_word_{file_input.name}"
                    with open(image_path, "wb") as f:
                        f.write(file_input.getbuffer())
                    logging.info(f"Saved temporary file: {image_path}")

                    try:
                        transcription, target, grade, feedback = (
                            st.session_state.app.grade_word_submission(image_path)
                        )
                        logging.info(
                            f"Grading results - Transcription: {transcription}, Target: {target}, Grade: {grade}"
                        )
                    except Exception as e:
                        logging.error(f"Error during grading: {str(e)}")
                        st.error(f"Error during grading: {str(e)}")
                        if os.path.exists(image_path):
                            os.remove(image_path)
                        raise

                    # Move feedback to col1
                    with col1:
                        st.markdown("### Feedback")
                        st.text_input(
                            "Your Writing", value=transcription, disabled=True
                        )
                        st.text_input("Target Word", value=target, disabled=True)
                        st.text_input("Grade", value=grade, disabled=True)
                        st.text_area("Feedback", value=feedback, disabled=True)

                    if os.path.exists(image_path):
                        os.remove(image_path)
                else:
                    # Canvas handling
                    if canvas_result is not None:
                        try:
                            logging.info("Processing canvas submission")
                            transcription, target, grade, feedback = (
                                st.session_state.app.grade_word_canvas_submission(
                                    canvas_result
                                )
                            )
                            logging.info(
                                f"Canvas grading results - Transcription: {transcription}, Target: {target}, Grade: {grade}"
                            )

                            with col1:
                                st.markdown("### Feedback")
                                st.text_input(
                                    "Your Writing", value=transcription, disabled=True
                                )
                                st.text_input(
                                    "Target Word", value=target, disabled=True
                                )
                                st.text_input("Grade", value=grade, disabled=True)
                                st.text_area("Feedback", value=feedback, disabled=True)
                        except Exception as e:
                            logging.error(f"Error processing canvas: {str(e)}")
                            st.error(f"Error processing canvas: {str(e)}")
                    else:
                        st.error("Canvas is empty. Please draw your word.")
            except Exception as e:
                logging.error(f"Unexpected error in submission handling: {str(e)}")
                st.error(f"An unexpected error occurred: {str(e)}")

# Sentence Practice Tab
with tab2:
    col1, col2 = st.columns(2)

    with col1:
        if st.button("Generate New Sentence", key="sentence_gen"):
            sentence, english, _, romaji = (
                st.session_state.app.get_random_word_and_sentence()
            )
            st.session_state.current_sentence = {
                "sentence": sentence,
                "english": english.replace("English: ", ""),
                "romaji": romaji.replace("Reading: ", ""),
            }

        if st.session_state.current_sentence:
            st.markdown(
                f'<p class="big-font">{st.session_state.current_sentence["sentence"]}</p>',
                unsafe_allow_html=True,
            )
            st.markdown("### Word Information")
            st.text_input(
                "Reading",
                value=st.session_state.current_sentence["romaji"],
                disabled=True,
            )
            st.text_input(
                "English",
                value=st.session_state.current_sentence["english"],
                disabled=True,
            )

    with col2:
        input_method_sentence = st.radio(
            "Select input method:",
            ("Upload Image", "Draw on Canvas"),
            key="sentence_input_method",
        )
        if input_method_sentence == "Upload Image":
            sentence_file_input = st.file_uploader(
                "Upload your handwritten sentence",
                type=["png", "jpg", "jpeg"],
                key="sentence_image",
            )
        else:
            from components import draw_japanese_canvas

            canvas_result = draw_japanese_canvas(key="sentence_canvas")
            sentence_file_input = canvas_result is not None

        submit_button = st.button("Submit", key="sentence_submit")
        if submit_button and sentence_file_input:
            if input_method_sentence == "Upload Image":
                image_path = f"temp_sentence_{sentence_file_input.name}"
                with open(image_path, "wb") as f:
                    f.write(sentence_file_input.getbuffer())
                try:
                    transcription, translation, grade, feedback = (
                        st.session_state.app.grade_sentence_submission(image_path)
                    )
                except Exception as e:
                    st.error(f"Error during grading: {e}")
                    os.remove(image_path)
                    raise
                st.markdown("### Feedback")
                st.text_area("Transcription", value=transcription, disabled=True)
                st.text_area("Translation", value=translation, disabled=True)
                st.text_input("Grade", value=grade, disabled=True)
                st.text_area("Feedback", value=feedback, disabled=True)
                os.remove(image_path)
            else:
                if canvas_result is not None:
                    try:
                        transcription, translation, grade, feedback = (
                            st.session_state.app.grade_sentence_canvas_submission(
                                canvas_result
                            )
                        )
                        st.markdown("### Feedback")
                        st.text_area(
                            "Transcription", value=transcription, disabled=True
                        )
                        st.text_area("Translation", value=translation, disabled=True)
                        st.text_input("Grade", value=grade, disabled=True)
                        st.text_area("Feedback", value=feedback, disabled=True)
                    except Exception as e:
                        st.error(f"Error during grading: {e}")
                else:
                    st.error("Canvas is empty. Please draw your sentence.")
