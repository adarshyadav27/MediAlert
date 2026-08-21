from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import chromadb
import os

print("✅ Libraries Loaded")

# ==========================
# LOAD PDF
# ==========================

def load_pdf(pdf_path):

    reader = PdfReader(pdf_path)

    pages = []

    for page_number, page in enumerate(reader.pages, start=1):

        page_text = page.extract_text()

        if page_text:

            pages.append(
                {
                    "text": page_text,
                    "page": page_number
                }
            )

    return pages

# ==========================
# CREATE CHUNKS
# ==========================

def create_chunks(text, chunk_size=800, overlap=200):

    chunks = []

    start = 0

    while start < len(text):

        end = start + chunk_size

        chunk = text[start:end].strip()

        if chunk:

            chunks.append(chunk)

        start += (chunk_size - overlap)

    return chunks

# ==========================
# LOAD ALL PDFs
# ==========================

pdf_folder = "data"

all_chunks = []

all_metadatas = []

for file in os.listdir(pdf_folder):

    if file.endswith(".pdf"):

        print("📄 Loading:", file)

        pdf_path = os.path.join(pdf_folder, file)

        pages = load_pdf(pdf_path)

        for page in pages:

            page_chunks = create_chunks(page["text"])

            for chunk in page_chunks:

                all_chunks.append(chunk)

                all_metadatas.append(
                    {
                        "source": file,
                        "page": page["page"]
                    }
                )

print("✅ All PDFs Loaded")

chunks = all_chunks

print("Total Chunks:", len(chunks))

print("Metadata:", len(all_metadatas))

print(chunks[0][:300])

# ==========================
# EMBEDDING MODEL
# ==========================

print("\n🧠 Loading Embedding Model...")

model = SentenceTransformer("BAAI/bge-base-en-v1.5")
print("✅ Model Loaded")

# ==========================
# CREATE EMBEDDINGS
# ==========================

print("\n🔄 Creating Embeddings...")

embeddings = model.encode(

    chunks,

    show_progress_bar=True,

    normalize_embeddings=True,

    batch_size=64

)

print("✅ Embeddings Created")

print("Embedding Dimension:", len(embeddings[0]))

print("Total Embeddings:", len(embeddings))

# ==========================
# CHROMADB
# ==========================

print("\n📦 Creating ChromaDB...")

client = chromadb.PersistentClient(path="chroma_db")

try:
    client.delete_collection("health_docs")
except:
    pass

collection = client.create_collection("health_docs")

# ==========================
# STORE DATA
# ==========================

BATCH_SIZE = 500

for start in range(0, len(chunks), BATCH_SIZE):

    end = min(start + BATCH_SIZE, len(chunks))

    collection.add(

        ids=[str(i) for i in range(start, end)],

        documents=chunks[start:end],

        embeddings=embeddings[start:end].tolist(),

        metadatas=all_metadatas[start:end]

    )

    print(f"✅ Stored {end}/{len(chunks)} chunks")

print("\n🎉 Vector Database Created Successfully")

print("📚 Total PDFs :", len(os.listdir(pdf_folder)))

print("🧩 Total Chunks :", len(chunks))

print("✅ Metadata Stored")

print("🚀 ChromaDB Ready")

