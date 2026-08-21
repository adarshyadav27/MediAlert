import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()

# Get API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError(
        "GROQ_API_KEY not found. Add it to your .env file."
    )

# Create Groq client
client = Groq(api_key=GROQ_API_KEY)

# List available models
models = client.models.list()

print("\nAvailable Models:\n")

for model in models.data:
    print(model.id)