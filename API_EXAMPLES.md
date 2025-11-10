# LightRAG API Examples

Complete examples for all available APIs in LightRAG Server running at `http://localhost:9621`

**Base URL**: `http://localhost:9621`

**API Documentation**: `http://localhost:9621/docs` (Swagger UI) or `http://localhost:9621/redoc` (ReDoc)

---

## Table of Contents

1. [Document Management APIs](#document-management-apis)
2. [Query APIs](#query-apis)
3. [Graph Management APIs](#graph-management-apis)
4. [Ollama Emulation APIs](#ollama-emulation-apis)
5. [Authentication](#authentication)

---

## Document Management APIs

### 1. Upload Document

Upload a file (PDF, DOCX, TXT, etc.) to be processed and indexed.

**Endpoint**: `POST /documents/upload`

**Request**:
```bash
curl -X POST "http://localhost:9621/documents/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/document.pdf"
```

**Python Example**:
```python
import requests

url = "http://localhost:9621/documents/upload"
headers = {"Authorization": "Bearer YOUR_TOKEN"}

with open("document.pdf", "rb") as f:
    files = {"file": ("document.pdf", f, "application/pdf")}
    response = requests.post(url, headers=headers, files=files)
    print(response.json())
```

**Response**:
```json
{
  "status": "success",
  "message": "Document uploaded and queued for processing",
  "doc_id": "doc_abc123",
  "track_id": "track_xyz789"
}
```

---

### 2. Insert Text

Insert plain text directly into the RAG system.

**Endpoint**: `POST /documents/text`

**Request**:
```bash
curl -X POST "http://localhost:9621/documents/text" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is sample text to be indexed. It will be processed and added to the knowledge graph.",
    "doc_id": "custom_doc_123",
    "metadata": {
      "source": "manual_input",
      "category": "notes"
    }
  }'
```

**Python Example**:
```python
import requests

url = "http://localhost:9621/documents/text"
headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}

data = {
    "text": "This is sample text to be indexed.",
    "doc_id": "custom_doc_123",
    "metadata": {
        "source": "manual_input",
        "category": "notes"
    }
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

**Request Body Schema**:
```json
{
  "text": "string (required) - The text content to insert",
  "doc_id": "string (optional) - Custom document ID",
  "metadata": {
    "source": "string (optional)",
    "category": "string (optional)",
    "author": "string (optional)",
    "date": "string (optional)"
  }
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Text inserted successfully",
  "doc_id": "custom_doc_123"
}
```

---

### 3. Insert Multiple Texts

Insert multiple text entries in a single request.

**Endpoint**: `POST /documents/texts`

**Request**:
```bash
curl -X POST "http://localhost:9621/documents/texts" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      {
        "text": "First text entry",
        "doc_id": "doc_1"
      },
      {
        "text": "Second text entry",
        "doc_id": "doc_2",
        "metadata": {"category": "research"}
      }
    ]
  }'
```

**Python Example**:
```python
import requests

url = "http://localhost:9621/documents/texts"
headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}

data = {
    "texts": [
        {
            "text": "First text entry",
            "doc_id": "doc_1"
        },
        {
            "text": "Second text entry",
            "doc_id": "doc_2",
            "metadata": {"category": "research"}
        }
    ]
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

---

### 4. Scan for New Documents

Trigger background scanning of the input directory for new documents.

**Endpoint**: `POST /documents/scan`

**Request**:
```bash
curl -X POST "http://localhost:9621/documents/scan" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Python Example**:
```python
import requests

url = "http://localhost:9621/documents/scan"
headers = {"Authorization": "Bearer YOUR_TOKEN"}

response = requests.post(url, headers=headers)
print(response.json())
```

**Response**:
```json
{
  "status": "scanning_started",
  "message": "Scanning process has been initiated in the background",
  "track_id": "scan_20250729_170612_abc123"
}
```

---

### 5. Get Document Status

Get the processing status of a specific document.

**Endpoint**: `GET /documents/{doc_id}/status`

**Request**:
```bash
curl -X GET "http://localhost:9621/documents/doc_abc123/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Python Example**:
```python
import requests

doc_id = "doc_abc123"
url = f"http://localhost:9621/documents/{doc_id}/status"
headers = {"Authorization": "Bearer YOUR_TOKEN"}

response = requests.get(url, headers=headers)
print(response.json())
```

**Response**:
```json
{
  "doc_id": "doc_abc123",
  "status": "completed",
  "progress": 100,
  "message": "Document processed successfully",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:35:00Z"
}
```

**Status Values**:
- `pending` - Document is queued for processing
- `processing` - Document is currently being processed
- `completed` - Document processing completed successfully
- `failed` - Document processing failed
- `deleted` - Document has been deleted

---

### 6. List All Documents

Get a list of all documents in the system.

**Endpoint**: `GET /documents`

**Request**:
```bash
curl -X GET "http://localhost:9621/documents" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query Parameters**:
- `status` (optional): Filter by status (`pending`, `processing`, `completed`, `failed`)
- `limit` (optional): Maximum number of documents to return
- `offset` (optional): Number of documents to skip

**Python Example**:
```python
import requests

url = "http://localhost:9621/documents"
headers = {"Authorization": "Bearer YOUR_TOKEN"}
params = {
    "status": "completed",
    "limit": 10,
    "offset": 0
}

response = requests.get(url, headers=headers, params=params)
print(response.json())
```

**Response**:
```json
{
  "documents": [
    {
      "doc_id": "doc_abc123",
      "filename": "document.pdf",
      "status": "completed",
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:35:00Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

---

### 7. Delete Document

Delete a document and remove it from the knowledge graph.

**Endpoint**: `DELETE /documents/{doc_id}`

**Request**:
```bash
curl -X DELETE "http://localhost:9621/documents/doc_abc123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Python Example**:
```python
import requests

doc_id = "doc_abc123"
url = f"http://localhost:9621/documents/{doc_id}"
headers = {"Authorization": "Bearer YOUR_TOKEN"}

response = requests.delete(url, headers=headers)
print(response.json())
```

**Response**:
```json
{
  "status": "success",
  "message": "Document deleted successfully",
  "doc_id": "doc_abc123",
  "entities_deleted": 50,
  "relations_deleted": 30
}
```

---

### 8. Reprocess Failed Documents

Reprocess documents that previously failed.

**Endpoint**: `POST /documents/reprocess`

**Request**:
```bash
curl -X POST "http://localhost:9621/documents/reprocess" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doc_ids": ["doc_abc123", "doc_def456"]
  }'
```

**Python Example**:
```python
import requests

url = "http://localhost:9621/documents/reprocess"
headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}

data = {
    "doc_ids": ["doc_abc123", "doc_def456"]
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

**Response**:
```json
{
  "status": "reprocessing_started",
  "message": "Reprocessing started for 2 documents",
  "track_id": "reprocess_20250729_170612_abc123"
}
```

---

### 9. Get Pipeline Status

Get the status of document processing pipeline.

**Endpoint**: `GET /documents/pipeline_status`

**Request**:
```bash
curl -X GET "http://localhost:9621/documents/pipeline_status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Python Example**:
```python
import requests

url = "http://localhost:9621/documents/pipeline_status"
headers = {"Authorization": "Bearer YOUR_TOKEN"}

response = requests.get(url, headers=headers)
print(response.json())
```

**Response**:
```json
{
  "is_processing": true,
  "current_doc": "doc_abc123",
  "queue_size": 5,
  "processed_today": 10,
  "failed_today": 1
}
```

---

## Query APIs

### 1. Query (Standard)

Query the knowledge base and get a response.

**Endpoint**: `POST /query`

**Request**:
```bash
curl -X POST "http://localhost:9621/query" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is machine learning?",
    "mode": "hybrid",
    "top_k": 10,
    "include_references": true
  }'
```

**Python Example**:
```python
import requests

url = "http://localhost:9621/query"
headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}

data = {
    "query": "What is machine learning?",
    "mode": "hybrid",
    "top_k": 10,
    "include_references": True
}

response = requests.post(url, headers=headers, json=data)
result = response.json()
print("Response:", result["response"])
print("References:", result.get("references", []))
```

**Request Body Schema**:
```json
{
  "query": "string (required, min 3 chars) - The question to ask",
  "mode": "string (optional) - Query mode: 'local', 'global', 'hybrid', 'naive', 'mix', 'bypass' (default: 'mix')",
  "top_k": "integer (optional) - Number of top items to retrieve (default: varies by mode)",
  "chunk_top_k": "integer (optional) - Number of text chunks to retrieve",
  "max_entity_tokens": "integer (optional) - Max tokens for entity context",
  "max_relation_tokens": "integer (optional) - Max tokens for relation context",
  "max_total_tokens": "integer (optional) - Max total tokens for context",
  "conversation_history": [
    {
      "role": "user|assistant",
      "content": "message text"
    }
  ],
  "user_prompt": "string (optional) - Custom prompt template",
  "enable_rerank": "boolean (optional) - Enable reranking (default: true)",
  "include_references": "boolean (optional) - Include references in response (default: true)",
  "response_type": "string (optional) - Response format: 'Multiple Paragraphs', 'Single Paragraph', 'Bullet Points'",
  "only_need_context": "boolean (optional) - Return only context without response",
  "only_need_prompt": "boolean (optional) - Return only prompt without response"
}
```

**Response**:
```json
{
  "response": "Machine learning is a subset of artificial intelligence...",
  "references": [
    {
      "doc_id": "doc_abc123",
      "chunk_id": "chunk_xyz",
      "text": "Machine learning involves..."
    }
  ]
}
```

**Query Modes Explained**:
- `local`: Focuses on local entity relationships
- `global`: Uses global graph structure
- `hybrid`: Combines local and global approaches
- `naive`: Simple vector search only
- `mix`: Intelligent mixing of all modes (recommended)
- `bypass`: Direct LLM query without RAG

---

### 2. Query with Streaming

Get streaming responses for real-time updates.

**Endpoint**: `POST /query/stream`

**Request**:
```bash
curl -X POST "http://localhost:9621/query/stream" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Explain neural networks",
    "mode": "hybrid",
    "stream": true
  }'
```

**Python Example**:
```python
import requests
import json

url = "http://localhost:9621/query/stream"
headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}

data = {
    "query": "Explain neural networks",
    "mode": "hybrid",
    "stream": True
}

response = requests.post(url, headers=headers, json=data, stream=True)

for line in response.iter_lines():
    if line:
        decoded = line.decode('utf-8')
        if decoded.startswith('data: '):
            data_str = decoded[6:]  # Remove 'data: ' prefix
            try:
                chunk = json.loads(data_str)
                print(chunk.get("content", ""), end="", flush=True)
            except json.JSONDecodeError:
                pass
```

**Stream Response Format**:
```
data: {"content": "Neural", "done": false}
data: {"content": " networks", "done": false}
data: {"content": " are...", "done": true}
```

---

### 3. Query with Detailed Data

Get detailed query results including entities, relationships, and chunks.

**Endpoint**: `POST /query/data`

**Request**:
```bash
curl -X POST "http://localhost:9621/query/data" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the main concepts in this document?",
    "mode": "hybrid"
  }'
```

**Python Example**:
```python
import requests

url = "http://localhost:9621/query/data"
headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}

data = {
    "query": "What are the main concepts in this document?",
    "mode": "hybrid"
}

response = requests.post(url, headers=headers, json=data)
result = response.json()

print("Status:", result["status"])
print("Entities:", result["data"]["entities"])
print("Relationships:", result["data"]["relationships"])
print("Chunks:", result["data"]["chunks"])
```

**Response**:
```json
{
  "status": "success",
  "message": "Query executed successfully",
  "data": {
    "entities": [
      {
        "name": "Machine Learning",
        "description": "A method of data analysis...",
        "entity_type": "CONCEPT"
      }
    ],
    "relationships": [
      {
        "source": "Machine Learning",
        "target": "Artificial Intelligence",
        "description": "is a subset of",
        "weight": 0.95
      }
    ],
    "chunks": [
      {
        "chunk_id": "chunk_xyz",
        "text": "Machine learning is...",
        "doc_id": "doc_abc123"
      }
    ],
    "references": [
      {
        "doc_id": "doc_abc123",
        "chunk_id": "chunk_xyz"
      }
    ]
  },
  "metadata": {
    "mode": "hybrid",
    "keywords": ["machine learning", "AI"],
    "processing_time": 1.23
  }
}
```

---

## Graph Management APIs

### 1. Get Graph Labels

Get all available graph labels (entity types, relation types).

**Endpoint**: `GET /graph/label/list`

**Request**:
```bash
curl -X GET "http://localhost:9621/graph/label/list" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Python Example**:
```python
import requests

url = "http://localhost:9621/graph/label/list"
headers = {"Authorization": "Bearer YOUR_TOKEN"}

response = requests.get(url, headers=headers)
print(response.json())
```

**Response**:
```json
{
  "entity_labels": ["PERSON", "ORGANIZATION", "CONCEPT", "LOCATION"],
  "relation_labels": ["RELATED_TO", "PART_OF", "LOCATED_IN"]
}
```

---

### 2. Get Entity

Get details of a specific entity.

**Endpoint**: `GET /graph/entity/{entity_name}`

**Request**:
```bash
curl -X GET "http://localhost:9621/graph/entity/Machine%20Learning" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Python Example**:
```python
import requests
from urllib.parse import quote

entity_name = "Machine Learning"
url = f"http://localhost:9621/graph/entity/{quote(entity_name)}"
headers = {"Authorization": "Bearer YOUR_TOKEN"}

response = requests.get(url, headers=headers)
print(response.json())
```

**Response**:
```json
{
  "name": "Machine Learning",
  "description": "A method of data analysis...",
  "entity_type": "CONCEPT",
  "related_entities": [
    {
      "name": "Artificial Intelligence",
      "relation": "is a subset of"
    }
  ]
}
```

---

### 3. Search Entities

Search for entities by name or description.

**Endpoint**: `GET /graph/entity/search`

**Request**:
```bash
curl -X GET "http://localhost:9621/graph/entity/search?query=machine&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query Parameters**:
- `query` (required): Search query
- `limit` (optional): Maximum results (default: 20)

**Python Example**:
```python
import requests

url = "http://localhost:9621/graph/entity/search"
headers = {"Authorization": "Bearer YOUR_TOKEN"}
params = {"query": "machine", "limit": 10}

response = requests.get(url, headers=headers, params=params)
print(response.json())
```

---

### 4. Create Entity

Create a new entity in the knowledge graph.

**Endpoint**: `POST /graph/entity`

**Request**:
```bash
curl -X POST "http://localhost:9621/graph/entity" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_name": "Tesla",
    "entity_data": {
      "description": "Electric vehicle manufacturer",
      "entity_type": "ORGANIZATION"
    }
  }'
```

**Python Example**:
```python
import requests

url = "http://localhost:9621/graph/entity"
headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}

data = {
    "entity_name": "Tesla",
    "entity_data": {
        "description": "Electric vehicle manufacturer",
        "entity_type": "ORGANIZATION"
    }
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

---

### 5. Update Entity

Update an existing entity.

**Endpoint**: `PUT /graph/entity/{entity_name}`

**Request**:
```bash
curl -X PUT "http://localhost:9621/graph/entity/Tesla" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "updated_data": {
      "description": "Electric vehicle and clean energy company"
    },
    "allow_rename": false
  }'
```

**Python Example**:
```python
import requests
from urllib.parse import quote

entity_name = "Tesla"
url = f"http://localhost:9621/graph/entity/{quote(entity_name)}"
headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}

data = {
    "updated_data": {
        "description": "Electric vehicle and clean energy company"
    },
    "allow_rename": False
}

response = requests.put(url, headers=headers, json=data)
print(response.json())
```

---

### 6. Delete Entity

Delete an entity from the knowledge graph.

**Endpoint**: `DELETE /graph/entity/{entity_name}`

**Request**:
```bash
curl -X DELETE "http://localhost:9621/graph/entity/Tesla" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Python Example**:
```python
import requests
from urllib.parse import quote

entity_name = "Tesla"
url = f"http://localhost:9621/graph/entity/{quote(entity_name)}"
headers = {"Authorization": "Bearer YOUR_TOKEN"}

response = requests.delete(url, headers=headers)
print(response.json())
```

---

### 7. Merge Entities

Merge multiple entities into one.

**Endpoint**: `POST /graph/entity/merge`

**Request**:
```bash
curl -X POST "http://localhost:9621/graph/entity/merge" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entities_to_change": ["Elon Msk", "Ellon Musk"],
    "entity_to_change_into": "Elon Musk"
  }'
```

**Python Example**:
```python
import requests

url = "http://localhost:9621/graph/entity/merge"
headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}

data = {
    "entities_to_change": ["Elon Msk", "Ellon Musk"],
    "entity_to_change_into": "Elon Musk"
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

---

### 8. Create Relationship

Create a relationship between two entities.

**Endpoint**: `POST /graph/relation`

**Request**:
```bash
curl -X POST "http://localhost:9621/graph/relation" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_entity": "Elon Musk",
    "target_entity": "Tesla",
    "relation_data": {
      "description": "Elon Musk is the CEO of Tesla",
      "keywords": "CEO, founder",
      "weight": 1.0
    }
  }'
```

**Python Example**:
```python
import requests

url = "http://localhost:9621/graph/relation"
headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}

data = {
    "source_entity": "Elon Musk",
    "target_entity": "Tesla",
    "relation_data": {
        "description": "Elon Musk is the CEO of Tesla",
        "keywords": "CEO, founder",
        "weight": 1.0
    }
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

---

### 9. Update Relationship

Update an existing relationship.

**Endpoint**: `PUT /graph/relation`

**Request**:
```bash
curl -X PUT "http://localhost:9621/graph/relation" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_id": "entity_123",
    "target_id": "entity_456",
    "updated_data": {
      "description": "Updated relationship description",
      "weight": 0.9
    }
  }'
```

---

### 10. Delete Relationship

Delete a relationship between entities.

**Endpoint**: `DELETE /graph/relation`

**Request**:
```bash
curl -X DELETE "http://localhost:9621/graph/relation?source_id=entity_123&target_id=entity_456" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query Parameters**:
- `source_id` (required): Source entity ID
- `target_id` (required): Target entity ID

---

## Ollama Emulation APIs

These APIs emulate Ollama's API format for compatibility.

### 1. Chat (Ollama Format)

Chat with the model using Ollama-compatible format. This endpoint emulates Ollama's API but routes queries through LightRAG's RAG system.

**Important Notes**:
- **Model Name**: Use `"lightrag:latest"` (the LightRAG emulated model name). You can pass any model name for compatibility, but it's ignored - the response will always show `"lightrag:latest"`.
- **Actual LLM**: The underlying LLM model (`deepseek-v3.1:671b-cloud` in your config) is used internally but not exposed in the API response.
- **Query Modes**: You can use query prefixes to control behavior:
  - `/local query` - Local entity-based retrieval
  - `/global query` - Global graph-based retrieval
  - `/hybrid query` - Hybrid retrieval
  - `/mix query` - Mixed mode (default)
  - `/bypass query` - Direct LLM query without RAG

**Endpoint**: `POST /api/chat`

**Request**:
```bash
curl -X POST "http://localhost:9621/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "lightrag:latest",
    "messages": [
      {
        "role": "user",
        "content": "What is RAG?"
      }
    ],
    "stream": false
  }'
```

**Python Example**:
```python
import requests

url = "http://localhost:9621/api/chat"
headers = {"Content-Type": "application/json"}

data = {
    "model": "lightrag:latest",  # Use LightRAG model name (any name works but this is recommended)
    "messages": [
        {
            "role": "user",
            "content": "What is RAG?"
        }
    ],
    "stream": False
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

**Example with Query Mode Prefix**:
```python
import requests

url = "http://localhost:9621/api/chat"
headers = {"Content-Type": "application/json"}

data = {
    "model": "lightrag:latest",
    "messages": [
        {
            "role": "user",
            "content": "/hybrid Explain machine learning using information from the knowledge base"
        }
    ],
    "stream": False
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

**Response**:
```json
{
  "model": "lightrag:latest",
  "created_at": "2024-01-15T00:00:00Z",
  "message": {
    "role": "assistant",
    "content": "RAG stands for Retrieval-Augmented Generation..."
  },
  "done": true
}
```

**Note**: The response always shows `"lightrag:latest"` as the model name, regardless of what you pass in the request. The actual underlying LLM model (`deepseek-v3.1:671b-cloud` in your configuration) is used internally but not exposed in the API response.

---

### 2. Generate (Ollama Format)

Generate text using Ollama-compatible format. This endpoint bypasses RAG and directly uses the underlying LLM.

**Note**: Use `"lightrag:latest"` as the model name (or any name - it's ignored for compatibility).

**Endpoint**: `POST /api/generate`

**Request**:
```bash
curl -X POST "http://localhost:9621/api/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "lightrag:latest",
    "prompt": "Explain quantum computing",
    "stream": false
  }'
```

---

### 3. List Models (Ollama Format)

List available models.

**Endpoint**: `GET /api/tags`

**Request**:
```bash
curl -X GET "http://localhost:9621/api/tags"
```

**Response**:
```json
{
  "models": [
    {
      "name": "lightrag:latest",
      "model": "lightrag:latest",
      "size": 7365960935,
      "digest": "sha256:lightrag",
      "modified_at": "2024-01-15T00:00:00Z",
      "details": {
        "parent_model": "",
        "format": "gguf",
        "family": "lightrag",
        "families": ["lightrag"],
        "parameter_size": "13B",
        "quantization_level": "Q4_0"
      }
    }
  ]
}
```

**Note**: This endpoint returns the LightRAG emulated model name (`lightrag:latest`), not the actual underlying LLM model name. The actual LLM model (`deepseek-v3.1:671b-cloud` in your configuration) is used internally but is abstracted away by the LightRAG emulation layer.

---

## Authentication

### Get Auth Status

Check authentication status and get a token.

**Endpoint**: `GET /auth-status`

**Request**:
```bash
curl -X GET "http://localhost:9621/auth-status"
```

**Response** (if auth disabled):
```json
{
  "auth_configured": false,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "auth_mode": "disabled"
}
```

**Response** (if auth enabled):
```json
{
  "auth_configured": true,
  "message": "Please login to get access token"
}
```

### Login

Login to get an access token (if auth is enabled).

**Endpoint**: `POST /auth/login`

**Request**:
```bash
curl -X POST "http://localhost:9621/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

## Complete Python Example Script

```python
#!/usr/bin/env python3
"""
Complete example script for LightRAG API usage
"""

import requests
import json
from typing import Optional

BASE_URL = "http://localhost:9621"
TOKEN = None  # Set your token here or get from /auth-status

def get_auth_headers() -> dict:
    """Get authentication headers"""
    if TOKEN:
        return {"Authorization": f"Bearer {TOKEN}"}
    return {}

def upload_document(file_path: str) -> dict:
    """Upload a document"""
    url = f"{BASE_URL}/documents/upload"
    headers = get_auth_headers()
    
    with open(file_path, "rb") as f:
        files = {"file": (file_path.split("/")[-1], f)}
        response = requests.post(url, headers=headers, files=files)
        return response.json()

def insert_text(text: str, doc_id: Optional[str] = None) -> dict:
    """Insert text directly"""
    url = f"{BASE_URL}/documents/text"
    headers = {**get_auth_headers(), "Content-Type": "application/json"}
    
    data = {"text": text}
    if doc_id:
        data["doc_id"] = doc_id
    
    response = requests.post(url, headers=headers, json=data)
    return response.json()

def query(query_text: str, mode: str = "hybrid") -> dict:
    """Query the knowledge base"""
    url = f"{BASE_URL}/query"
    headers = {**get_auth_headers(), "Content-Type": "application/json"}
    
    data = {
        "query": query_text,
        "mode": mode,
        "include_references": True
    }
    
    response = requests.post(url, headers=headers, json=data)
    return response.json()

def get_document_status(doc_id: str) -> dict:
    """Get document processing status"""
    url = f"{BASE_URL}/documents/{doc_id}/status"
    headers = get_auth_headers()
    
    response = requests.get(url, headers=headers)
    return response.json()

def list_documents(status: Optional[str] = None) -> dict:
    """List all documents"""
    url = f"{BASE_URL}/documents"
    headers = get_auth_headers()
    params = {}
    if status:
        params["status"] = status
    
    response = requests.get(url, headers=headers, params=params)
    return response.json()

# Example usage
if __name__ == "__main__":
    # 1. Upload a document
    print("Uploading document...")
    upload_result = upload_document("document.pdf")
    print(f"Upload result: {json.dumps(upload_result, indent=2)}")
    
    # 2. Insert text
    print("\nInserting text...")
    text_result = insert_text("This is a test document about AI and machine learning.")
    print(f"Insert result: {json.dumps(text_result, indent=2)}")
    
    # 3. Query
    print("\nQuerying knowledge base...")
    query_result = query("What is machine learning?")
    print(f"Query response: {query_result['response']}")
    print(f"References: {len(query_result.get('references', []))} found")
    
    # 4. Check document status
    if 'doc_id' in upload_result:
        print(f"\nChecking document status...")
        status = get_document_status(upload_result['doc_id'])
        print(f"Status: {status['status']}")
    
    # 5. List all documents
    print("\nListing all documents...")
    documents = list_documents()
    print(f"Total documents: {documents.get('total', 0)}")
```

---

## Notes

1. **Authentication**: If authentication is disabled, you can use the guest token from `/auth-status` endpoint
2. **Cloud LLM**: Your server is configured to use `deepseek-v3.1:671b-cloud` model
3. **Timeout**: The server has a 6000 second (100 minute) timeout for LLM operations
4. **Streaming**: Use `/query/stream` for real-time responses
5. **Error Handling**: Always check response status codes and handle errors appropriately

---

### 11. Get Knowledge Graph

Get the entire knowledge graph or a subgraph.

**Endpoint**: `GET /graphs`

**Query Parameters**:
- `limit` (optional): Maximum number of nodes to return
- `entity_types` (optional): Filter by entity types (comma-separated)
- `relation_types` (optional): Filter by relation types (comma-separated)

**Request**:
```bash
curl -X GET "http://localhost:9621/graphs?limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Python Example**:
```python
import requests

url = "http://localhost:9621/graphs"
headers = {"Authorization": "Bearer YOUR_TOKEN"}
params = {"limit": 100, "entity_types": "PERSON,ORGANIZATION"}

response = requests.get(url, headers=headers, params=params)
print(response.json())
```

---

### 12. Check Entity Exists

Check if an entity exists in the graph.

**Endpoint**: `GET /graph/entity/exists`

**Query Parameters**:
- `entity_name` (required): Name of the entity to check

**Request**:
```bash
curl -X GET "http://localhost:9621/graph/entity/exists?entity_name=Tesla" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 13. Get Popular Labels

Get the most popular entity and relation labels.

**Endpoint**: `GET /graph/label/popular`

**Request**:
```bash
curl -X GET "http://localhost:9621/graph/label/popular" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 14. Search Labels

Search for labels by name.

**Endpoint**: `GET /graph/label/search`

**Query Parameters**:
- `query` (required): Search query
- `limit` (optional): Maximum results

**Request**:
```bash
curl -X GET "http://localhost:9621/graph/label/search?query=person&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 15. Get Document Status Counts

Get counts of documents by status.

**Endpoint**: `GET /documents/status_counts`

**Request**:
```bash
curl -X GET "http://localhost:9621/documents/status_counts" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**:
```json
{
  "pending": 5,
  "processing": 2,
  "completed": 100,
  "failed": 3,
  "total": 110
}
```

---

### 16. Get Paginated Documents

Get documents with pagination support.

**Endpoint**: `POST /documents/paginated`

**Request**:
```bash
curl -X POST "http://localhost:9621/documents/paginated" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "page": 1,
    "page_size": 20,
    "status": "completed"
  }'
```

**Python Example**:
```python
import requests

url = "http://localhost:9621/documents/paginated"
headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}

data = {
    "page": 1,
    "page_size": 20,
    "status": "completed"
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

---

### 17. Get Track Status

Get the status of a background task by track_id.

**Endpoint**: `GET /documents/track_status/{track_id}`

**Request**:
```bash
curl -X GET "http://localhost:9621/documents/track_status/scan_20250729_170612_abc123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 18. Clear Cache

Clear the LLM cache.

**Endpoint**: `POST /documents/clear_cache`

**Request**:
```bash
curl -X POST "http://localhost:9621/documents/clear_cache" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 19. Health Check

Check server health status.

**Endpoint**: `GET /health`

**Request**:
```bash
curl -X GET "http://localhost:9621/health"
```

**Response**:
```json
{
  "status": "healthy",
  "version": "0244",
  "core_version": "0.2.44"
}
```

---

### 20. Get API Version

Get the API version.

**Endpoint**: `GET /api/version`

**Request**:
```bash
curl -X GET "http://localhost:9621/api/version"
```

**Response**:
```json
{
  "version": "0244"
}
```

---

### 21. Get Running Models

Get information about currently running models (Ollama format).

**Endpoint**: `GET /api/ps`

**Request**:
```bash
curl -X GET "http://localhost:9621/api/ps"
```

---

## Additional Resources

- **Swagger UI**: http://localhost:9621/docs
- **ReDoc**: http://localhost:9621/redoc
- **OpenAPI Spec**: http://localhost:9621/openapi.json

