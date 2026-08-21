import os

from dotenv import load_dotenv


load_dotenv()


class Config:

    SECRET_KEY = os.getenv(
        "SECRET_KEY",
        "medialert-development-key"
    )

    GROQ_API_KEY = os.getenv(
        "GROQ_API_KEY"
    )

    GOOGLE_API_KEY = os.getenv(
        "GOOGLE_API_KEY"
    )

    CHROMA_PATH = os.getenv(
        "CHROMA_PATH",
        "./chroma_db"
    )

    DATA_PATH = os.getenv(
        "DATA_PATH",
        "./data"
    )