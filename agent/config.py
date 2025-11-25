"""
Configuration settings for Agent application.
"""

import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from tavily import TavilyClient
from googleapiclient.discovery import build

# Load environment variables from .env file
load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY")
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
GMAIL_USER = os.environ.get("GMAIL_USER")
GMAIL_PASSWORD = os.environ.get("GMAIL_PASS")

# Go Backend URL (for user management and data fetching)
GO_BACKEND_URL = os.environ.get("GO_BACKEND_URL", "http://localhost:8080")

# PostgreSQL database configuration (optional - only needed if not using Go backend)
POSTGRES_HOST = os.environ.get("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.environ.get("POSTGRES_PORT", "5432")
POSTGRES_USER = os.environ.get("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "")
POSTGRES_DB = os.environ.get("POSTGRES_DB", "sorami")

# Email server settings
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

# Debug settings
# Set to False to disable logging via print statements
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"

# Initialize services
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=GROQ_API_KEY,
    temperature=0.6,
)

tavily_client = TavilyClient(api_key=TAVILY_API_KEY) if TAVILY_API_KEY else None

youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY) if YOUTUBE_API_KEY else None
