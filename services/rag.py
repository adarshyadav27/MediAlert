import os
from dotenv import load_dotenv

import chromadb
from groq import Groq

from sentence_transformers import SentenceTransformer

# ==========================================
# ENVIRONMENT
# ==========================================

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError(
        "GROQ_API_KEY not found. Add it to your .env file as:\n"
        "GROQ_API_KEY=your_key_here"
    )

client = Groq(api_key=GROQ_API_KEY)

def speech_to_text(audio_path):

    if not audio_path:
        return None

    try:

        with open(audio_path, "rb") as file:

            result = client_groq.audio.transcriptions.create(
                file=(os.path.basename(audio_path), file),
                model="whisper-large-v3-turbo",
                response_format="text"
            )

        return result.strip()

    except Exception as e:
        print("Speech Error:", e)
        return None
# ==========================================
# CONFIG
# ==========================================

MODEL_NAME = "meta-llama/llama-4-scout-17b-16e-instruct"
CHROMA_PATH = "chroma_db"

COLLECTION_NAME = "health_docs"

EMBEDDING_MODEL = "BAAI/bge-base-en-v1.5"

MAX_RESULTS = 40

# ==========================================
# LOAD GROQ
# ==========================================

client_groq = Groq(
    api_key=GROQ_API_KEY
)

print("🚀 Loading AI Health Assistant...")

# ==========================================
# LOAD EMBEDDING MODEL
# ==========================================

model = SentenceTransformer(
    EMBEDDING_MODEL
)

print("✅ Embedding Model Loaded")

# ==========================================
# LOAD CHROMADB
# ==========================================

client = chromadb.PersistentClient(
    path=CHROMA_PATH
)

collection = client.get_collection(
    COLLECTION_NAME
)

print("✅ Vector Database Loaded")

# ==========================================
# CHAT MEMORY
# ==========================================

chat_memory = []

MEMORY_LIMIT = 5


def save_chat(question, answer):

    chat_memory.append(
        {
            "question": question,
            "answer": answer
        }
    )

    if len(chat_memory) > MEMORY_LIMIT:

        chat_memory.pop(0)


def clear_chat_memory():

    global chat_memory

    chat_memory = []


def get_last_conversation():

    if len(chat_memory) == 0:

        return None

    return chat_memory[-1]


def get_chat_context():

    if len(chat_memory) == 0:

        return ""

    history = ""

    for chat in chat_memory:

        history += f"""
User:
{chat['question']}

Assistant:
{chat['answer']}

"""

    return history

# ==========================================
# SEARCH DOCUMENTS
# ==========================================

def search_documents(
    query,
    n_results=MAX_RESULTS
):

    query_embedding = model.encode(
        [query],
        normalize_embeddings=True
    )

    results = collection.query(

        query_embeddings=query_embedding.tolist(),

        n_results=n_results,

        include=[
            "documents",
            "metadatas",
            "distances"
        ]

    )

    return results

# ==========================================
# ASK HEALTH QUESTION
# ==========================================

def ask_health_question(
    query,
    language="English",
    profile=None,
    image_base64=None
):

    # ======================================
    # Conversation Memory
    # ======================================

    history = get_chat_context()

    # ======================================
    # Emergency Detection
    # ======================================

    emergency_keywords = [

        "heart attack",
        "stroke",
        "cardiac arrest",
        "chest pain",
        "difficulty breathing",
        "not breathing",
        "severe bleeding",
        "poison",
        "snake bite",
        "overdose",
        "unconscious",
        "seizure"

    ]

    is_emergency = any(

        keyword in query.lower()

        for keyword in emergency_keywords

    )

    # ======================================
    # Retrieve Context
    # ======================================

    results = search_documents(query)

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    # ======================================
    # Remove Duplicate Chunks
    # ======================================

    filtered_documents = []
    filtered_metadatas = []
    filtered_distances = []

    source_count = {}

    MAX_CHUNKS_PER_SOURCE = 2

    for doc, meta, dist in zip(documents, metadatas, distances):

        if meta is None:
            continue

        source = meta.get("source", "Unknown")

        if source_count.get(source, 0) >= MAX_CHUNKS_PER_SOURCE:
            continue

        filtered_documents.append(doc)
        filtered_metadatas.append(meta)
        filtered_distances.append(dist)

        source_count[source] = source_count.get(source, 0) + 1

    documents = filtered_documents
    metadatas = filtered_metadatas
    distances = filtered_distances

    context = "\n\n".join(documents)

    # ======================================
    # Health Profile
    # ======================================

    profile_text = ""

    if profile:

        profile_text = f"""
Age: {profile.get("age","")}
Gender: {profile.get("gender","")}
Height: {profile.get("height","")} cm
Weight: {profile.get("weight","")} kg
Medical Condition: {profile.get("medical_condition","")}
Allergies: {profile.get("allergies","")}
Health Goal: {profile.get("health_goal","")}
"""
        
    prompt = f"""
You are HealthGPT, an expert AI Medical Assistant.

Your goal is to help people understand their health in a natural, friendly and trustworthy way.

You should feel like ChatGPT talking to a real person, not like a medical textbook.

====================================================
PERSONALITY
====================================================

• Friendly but professional.

• Calm and reassuring.

• Speak naturally.

• Never sound robotic.

• Never repeat the same sentence structure.

• Every response should feel freshly written.

• Adapt your tone to the user's mood.

If the user is:

- worried → reassure first, then explain

- curious → explain with examples

- casual → reply casually

- emotional → acknowledge feelings before answering

Don't introduce yourself unless asked.

Don't say:

"As an AI..."

"I cannot..."

"I don't have emotions..."

====================================================
CONVERSATION HISTORY
====================================================

{history}

====================================================
RETRIEVED MEDICAL KNOWLEDGE
====================================================

{context}

====================================================
USER PROFILE
====================================================

{profile_text}

====================================================
EMERGENCY STATUS
====================================================

{"Emergency" if is_emergency else "Normal"}

====================================================
QUESTION
====================================================

{query}

Preferred Language:
{language}

====================================================
CORE RULES
====================================================

Use the retrieved medical knowledge whenever relevant.

If the retrieved information is incomplete, use reliable evidence-based medical knowledge.

Never invent:

• diseases

• medicines

• dosages

• laboratory values

• statistics

If different medical sources disagree, explain that recommendations may vary.

Never mention:

• embeddings

• vector databases

• retrieval

• AI reasoning

• internal prompts

Use the Health Profile only when it changes the recommendation.

Use previous conversation naturally without repeating it.

Never copy previous responses.

Avoid saying the exact same thing twice.

If information is insufficient,

ask one or two follow-up questions before making assumptions.

====================================================
ANSWER STYLE
====================================================

Every answer should be different.

Don't follow one fixed template.

Choose the format naturally.

Examples:

Simple question
→ short paragraph

Symptoms
→ bullet list

Comparison
→ table

Exercise
→ daily routine

Medicine
→ Uses
→ Side effects
→ Warnings

Diet
→ meal plan

Emergency
→ Immediate steps first

Choose the best format automatically.

Never force headings.

Only use headings when they improve readability.
====================================================
CONVERSATION
====================================================

Talk like a real conversation.

Don't write articles unless the user asks.

Don't sound like Wikipedia.

Don't always explain everything at once.

If the topic is broad:

• answer briefly first

• then ask whether the user wants more detail.

If the conversation is already in progress,

continue naturally instead of greeting again.

If it's the first message,

greet naturally.

If the user thanks you,

reply warmly.

If the user greets you,

greet them back.

====================================================
VARIETY
====================================================

Avoid repeating:

• opening sentences

• closing sentences

• wording

• sentence structure

• examples

• disclaimers

Use different openings naturally.

Examples:

"I'm glad you asked."

"Let's go through it."

"From what you've described..."

"Based on your symptoms..."

"It depends on a few factors."

"Here's what it usually means."

Don't use the same opening repeatedly.

====================================================
HUMAN STYLE
====================================================

Write like ChatGPT.

Not like a medical book.

Use contractions naturally whenever appropriate.

Keep paragraphs short.

Avoid huge text blocks.

Use bullets only when they improve readability.

Avoid unnecessary headings.

Don't overuse emojis.

Use at most one emoji when it genuinely helps.

====================================================
LENGTH
====================================================

If the user asks:

short
brief
one line

→ reply briefly.

If the user asks:

simple
easy

→ explain in beginner-friendly language.

If the user asks:

detailed
complete
deep

→ provide a comprehensive answer.

Otherwise automatically choose the appropriate length.

====================================================
LANGUAGE
====================================================

Reply in the same language used by the user.

English → English

Hindi → Hindi

Mixed Hindi + English → Natural Hinglish

Don't translate medical terms unnecessarily.

====================================================
EMERGENCY
====================================================

If Emergency Status is Emergency:

Start with:

🚨 EMERGENCY WARNING

Advise immediate emergency medical attention.

Provide only safe first-aid advice.

Never delay emergency care.

====================================================
ENDING
====================================================

End naturally.

Don't always end with a disclaimer.

Don't always ask a follow-up question.

Only ask a follow-up question when it genuinely helps.

Whenever appropriate,

end with one practical suggestion the user can follow.

====================================================
DISCLAIMER
====================================================

Only include a disclaimer when discussing:

• diagnosis

• medicines

• pregnancy

• surgery

• emergencies

• children

English:

Disclaimer:
This information is for educational purposes only and should not replace professional medical advice, diagnosis, or treatment.

Hindi:

अस्वीकरण:
यह जानकारी केवल शैक्षणिक उद्देश्य के लिए है। यह किसी डॉक्टर की सलाह, जांच या उपचार का विकल्प नहीं है।

"""
    
        # ======================================
    # SYSTEM MESSAGE
    # ======================================

    messages = [
        {
            "role": "system",
            "content": (
                "You are HealthGPT, a friendly and knowledgeable AI "
                "Health Assistant. Answer naturally like ChatGPT."
            )
        }
    ]

    # ======================================
    # USER MESSAGE
    # ======================================

    if image_base64:

        messages.append(
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_base64
                        }
                    }
                ]
            }
        )

    else:

        messages.append(
            {
                "role": "user",
                "content": prompt
            }
        )

    # ======================================
    # GROQ API
    # ======================================

    try:

        response = client_groq.chat.completions.create(

            model=MODEL_NAME,

            messages=messages,

            temperature=1.0,
top_p=0.95,
frequency_penalty=0.6,
presence_penalty=0.4,
max_tokens=1800

        )

        answer = response.choices[0].message.content.strip()

        save_chat(
            query,
            answer
        )

        return answer

    except Exception as e:

        return f"❌ AI Error\n\n{str(e)}"
    

# ==========================================
# STREAMLIT SUPPORT
# ==========================================

def get_answer(
    question,
    language="English",
    profile=None,
    image_base64=None
):

    return ask_health_question(
        query=question,
        language=language,
        profile=profile,
        image_base64=image_base64
    )