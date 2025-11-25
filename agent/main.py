#!/usr/bin/env python3
"""
Agent - AI-powered personalized learning plan generator
Streamlit web application (optional - main interface is FastAPI)
"""
import os
import streamlit as st
from dotenv import load_dotenv

# Note: Streamlit interface is optional - main interface is FastAPI
# from graph import run_learning_plan_generator, create_learning_plan_graph, visualize_graph

def check_api_keys():
    """Check if required API keys are set."""
    required_keys = ['GROQ_API_KEY']
    missing_keys = [key for key in required_keys if not os.environ.get(key)]
    return missing_keys

def main():
    """Main Streamlit application."""
    # Load environment variables
    load_dotenv()
    
    # Set up page configuration
    st.set_page_config(
        page_title="Learning Plan Generator - Sorami",
        page_icon="🎓",
        layout="wide"
    )
    
    # Application header
    st.title("🎓 Learning Plan Generator")
    st.subheader("AI-powered personalized Japanese learning plan generator")
    st.write("Generate personalized learning plans based on your progress and goals.")
    
    # Check if required API keys are set
    missing_keys = check_api_keys()
    if missing_keys:
        st.error(f"Missing required API keys: {', '.join(missing_keys)}")
        st.info("Please set these environment variables in a .env file or directly in your environment.")
        return
    
    # Sidebar
    with st.sidebar:
        st.header("About")
        st.write("""
        The Learning Plan Generator uses AI to analyze your learning progress,
        identify weaknesses, and create personalized study plans tailored to your goals.
        """)
        
        st.header("Features")
        st.write("- 📊 Progress analysis from your learning data")
        st.write("- 🎯 Weakness identification")
        st.write("- 📅 Personalized weekly study plans")
        st.write("- 🎓 Recommended Sorami features")
        st.write("- 📧 Email delivery of your plan")
        
        st.info("""
        **Note**: This Streamlit interface is optional. The main interface is through 
        the FastAPI endpoint at `/api/agent/plan/generate` which is integrated into 
        the Sorami web application.
        """)

if __name__ == "__main__":
    main()
