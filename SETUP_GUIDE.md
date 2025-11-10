# Quick Setup Guide

## Prerequisites

1. **Node.js** (v18+)
2. **Ollama** installed and running

## Step-by-Step Setup

### 1. Install Ollama

```bash
# macOS
brew install ollama

# Or download from https://ollama.ai
```

### 2. Start Ollama and Pull Model

```bash
# Start Ollama (usually auto-starts)
ollama serve

# Pull a model (choose one)
ollama pull llama3.2
# OR
ollama pull mistral
# OR
ollama pull qwen
```

### 3. Install Project Dependencies

```bash
# From project root
npm run install:all
```

### 4. Configure Environment

**Backend** (`backend/.env`):
```env
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
DATABASE_PATH=bits-dubai.db
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 5. Start the Application

```bash
# From project root - starts both frontend and backend
npm run dev
```

Or separately:
```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

### 7. Login

**Student:**
- Email: `ansh.bandi@dubai.bits-pilani.ac.in`
- Password: `password123`

**Admin (Demo):**
- Email: `admin@bitsdubai.ac.ae`
- Password: `bits@admin2024`

## Testing Queries

### Public Queries (Try these after login)
- "What are the open electives this semester?"
- "When do midsems start?"
- "Where can I find the timetable for CS courses?"
- "Explain the credit system at BITS"
- "What is the GPA calculation rule?"

### Private Queries
- "What are my grades?"
- "Show me my payment information"
- "What courses am I enrolled in?"
- "What is my attendance for this semester?"

## Troubleshooting

### Ollama Not Working
1. Check if Ollama is running: `ollama list`
2. Verify model is pulled: `ollama list`
3. Test Ollama: `ollama run llama3.2 "Hello"`

### Database Issues
- Delete `backend/bits-dubai.db` to reset
- Restart backend to re-seed

### Port Conflicts
- Change `PORT` in `backend/.env`
- Update `NEXT_PUBLIC_API_URL` in `frontend/.env.local`

### CORS Errors
- Ensure `FRONTEND_URL` in backend `.env` matches frontend URL
- Check browser console for specific CORS errors

## Next Steps

1. Explore the student dashboard
2. Try different query types
3. Check the API endpoints in browser dev tools
4. Review the code structure in `backend/src` and `frontend/app`

