import os
import base64

from dotenv import load_dotenv
from groq import Groq
import chromadb
from sentence_transformers import SentenceTransformer

# ==========================================
# ENVIRONMENT

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError(
        "GROQ_API_KEY not found. Add it to your .env file as:\n"
        "GROQ_API_KEY=your_key_here"
    )

client = Groq(api_key=GROQ_API_KEY)

# ======================================
# IMAGE -> BASE64
# ======================================

def image_to_base64(image_file):

    if image_file is None:
        return None, None

    image_file.seek(0)

    image_bytes = image_file.read()

    encoded = base64.b64encode(image_bytes).decode("utf-8")

    mime_type = getattr(image_file, "type", None)

    if mime_type is None:
        mime_type = "image/jpeg"

    return encoded, mime_type


# ======================================
# IMAGE ANALYSIS
# ======================================

def analyze_image(
    image_file,
    question="Analyze this medical image in detail."
):

    encoded, mime_type = image_to_base64(image_file)

    response = client.chat.completions.create(

        model="meta-llama/llama-4-scout-17b-16e-instruct",

        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": question
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{encoded}"
                        }
                    }
                ]
            }
        ],

        temperature=0.4,
        max_tokens=1200

    )

    return response.choices[0].message.content