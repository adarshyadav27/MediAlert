import chromadb

client = chromadb.PersistentClient(path="chroma_db")

collections = client.list_collections()

print("Collections:", collections)

for c in collections:
    print("Collection Name:", c.name)