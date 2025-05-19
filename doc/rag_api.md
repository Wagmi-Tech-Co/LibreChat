# kavramlar 

RAG_API – Python FastAPI ile yapılmış bir araç; ana görevi, Vector Database ve Embedding Model ile LibreChat arasında bir tünel kurmak.

Embedding Model – eğitilmiş bir AI modeli; temel görev dosyaları vektör sayılarına dönüştürmek.

PostgreSQL/pgvector: vektör destekleyen bir database.



---

## Architecture

```text
┌────────────┐      drag & drop fıle        ┌───────────────┐
│  Front‑end │      ─────────────────────►  │  LibreChat BE │
└────────────┘                              └───────────────┘
                                               POST /embed
                                                    ▼
                                      ┌───────────────────────┐
                                      │      RAG_API          │
                                      └─────────┬─────────────┘
                                                │ 
                                                ▼
                                        embeddings(AI model)
                                                                                                                      │ 
                                                ▼
                                      ┌───────────────────────┐
                                      │ PostgreSQL + pgvector │
                                      └───────────────────────┘
```

* **LibreChat** validates MIME & size limits, persists the file on disk, then calls **RAG\_API**.
* **RAG\_API** streams the file, splits it into chunks, produces embeddings with the provider specified in `EMBEDDINGS_PROVIDER`, and stores them in `pgvector`.
* During chat, the user’s query is embedded; top‑k similar chunks are fetched and appended to the prompt.

---

## How It Works

1. **Upload** — Front‑end calls `POST /api/files` with multipart form data.
2. **Validation** — Back‑end checks `supportedMimeTypes`, `serverFileSizeLimit`, and `fileLimit`.
3. **Persistence** — File is saved to `<LIBRECHAT_ROOT>/uploads/` and metadata to MongoDB.
4. **Vectorisation** — LibreChat `POST`s `{file_id}` to `RAG_API_URL/upload`.
5. **Chunking** — RAG\_API splits the document (default 1 000 tokens, 200 overlap).
6. **Embedding** — Each chunk is transformed into a 384‑dimensional vector.
9. **Prompt Assembly** — Retrieved text + user input is sent to the LLM.

---

## Tech Stack

| Layer          | Technology                                                     |
| -------------- | -------------------------------------------------------------- |
| **UI**         | React (LibreChat front‑end)                                    |
| **RAG**        | Python 3.11 · FastAPI · LangChain                              |
| **DB**         | PostgreSQL 16 + pgvector 0.7                                   |
| **Embeddings** | HuggingFace `sentence-transformers/all‑MiniLM‑L6‑v2`  |
                                    |

---

## Setup & Deployment




### 2. Database

```sql
CREATE DATABASE rag;
\c rag;
CREATE EXTENSION vector;
```

### 3. Environment

Create `.env` f:

```


# RAG_API/.env
EMBEDDINGS_PROVIDER=huggingface
HF_TOKEN=
EMBEDDINGS_MODEL=sentence-transformers/all-MiniLM-L6-v2

VECTOR_DB_TYPE=pgvector
POSTGRES_DB=harisdb
POSTGRES_USER=haris
POSTGRES_PASSWORD=haris
DB_HOST=localhost
DB_PORT=5432
RAG_PORT=8000
RAG_HOST=0.0.0.0
```


---








---

## Supported File Types

now we supporting just *pdf* but A list of Regular Expressions specifying what MIME types are allowed for upload. This can be customized to restrict file types.

---



---

## Extending the System

| Idea                       | Notes                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| **Alternative Embeddings** | `all-mpnet-base-v2`, OpenAI `text-embedding-3-small`, or local `nomic-embed-text` via Ollama |
                     |




