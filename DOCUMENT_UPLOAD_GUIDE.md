# Document Upload Feature - Setup & Usage Guide

## Admin Credentials
```
Email: admin@bitsdubai.ac.ae
Password: admin@bits2024
```

## Setup Complete ✅

The backend is configured to accept document uploads from authenticated admins:

### Backend Endpoint
- **URL**: `POST http://localhost:3001/ingestion/upload`
- **Auth**: JWT (via HttpOnly cookie)
- **File Field**: `file` (multipart/form-data)
- **Supported Types**: PDF, TXT, MD
- **Max Size**: 50MB

### Processing Pipeline
1. File is uploaded → Parsed (PDF) or read (TXT/MD)
2. Text is chunked (1000 chars, 200 overlap)
3. Each chunk is embedded using Ollama (bge-m3 model)
4. Vectors are stored in Qdrant
5. Immediate success/failure response returned

## How to Use

### Via Frontend (Recommended)
1. Navigate to `http://localhost:3000/login`
2. Login with admin credentials above
3. Go to Admin Dashboard
4. Click "Upload Documents" button
5. Drag & drop or select PDF/TXT/MD files
6. Files will be processed immediately

### Via API (curl)
```bash
# 1. Login and get cookie
curl -c cookies.txt -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bitsdubai.ac.ae","password":"admin@bits2024"}'

# 2. Upload document
curl -b cookies.txt -X POST http://localhost:3001/ingestion/upload \
  -F "file=@/path/to/your/document.pdf"
```

## Troubleshooting

### 401 Unauthorized
**Cause**: Not logged in or cookie not sent
**Solution**: 
1. Verify you're logged in as admin
2. Check Browser DevTools → Application → Cookies
3. Ensure `access_token` cookie exists for localhost:3000
4. If missing, log out and log in again

### 403 Forbidden  
**Cause**: Logged in but not as admin
**Solution**: Use admin credentials, not student credentials

### "Unsupported file type"
**Cause**: File extension not recognized
**Solution**: Only upload .pdf, .txt, or .md files

### Processing takes too long
**Cause**: Large file or slow Ollama embedding generation
**Solution**: 
- Check Ollama is running (`docker ps` or `ollama ps`)
- Large PDFs (>10MB) may take 1-2 minutes
- Check backend logs for progress

## Backend Configuration

### Required Services
1. **MongoDB**: Port 27017 (for user/admin data)
2. **Qdrant**: Port 6333 (for vector storage)
3. **Ollama**: Port 11434 (for embeddings)
   - Must have `bge-m3` model pulled

### Environment Variables (.env)
```env
DATABASE_URL="mongodb://localhost:27017/bits-dubai"
JWT_SECRET="your-secret-key-change-in-production"
PORT=3001
FRONTEND_URL="http://localhost:3000"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_EMBEDDING_MODEL="bge-m3"
OLLAMA_LLM_MODEL="deepseekv3.2-cloud"
QDRANT_URL="http://localhost:6333"
QDRANT_COLLECTION="bits_dubai_knowledge_base"
```

## Technical Details

### File Processing Flow
```
┌─────────────┐
│ File Upload │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Parse & Extract │ ← pdf-parse for PDFs
│     Text        │   utf-8 decode for TXT/MD
└──────┬──────────┘
       │
       ▼
┌─────────────┐
│   Chunking  │ ← 1000 chars, 200 overlap
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Generate        │ ← Ollama bge-m3
│ Embeddings      │   (one request per chunk)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Store in Qdrant │ ← Batches of 50 points
│                 │   Auto-creates collection
└──────┬──────────┘
       │
       ▼
┌─────────────┐
│   Success!  │
└─────────────┘
```

### Files Involved
- **Controller**: `src/ingestion/ingestion.controller.ts`
- **Service**: `src/ingestion/ingestion.service.ts` 
- **Frontend UI**: `components/admin/DocumentUpload.tsx`
- **API Client**: `lib/api.ts` → `documentApi.upload()`

## Next Steps

Once documents are uploaded, they are automatically available for RAG queries:
1. Students/admins can ask questions
2. System generates embedding for question
3. Searches Qdrant for relevant chunks
4. Sends chunks to Ollama for answer generation
