# BITS Dubai ERP/LMS System

A comprehensive ERP and LMS system with RAG-powered LLM assistant for BITS Dubai University. This system integrates LightRAG for document-based queries and a custom backend for ERP/LMS functionality.

## Features

### Document Management (LightRAG)
- Upload and process documents (PDF, DOCX, TXT)
- Real-time document processing status
- Knowledge graph generation
- Document search and retrieval

### Public Academic Queries (Requires Login)
- **Open Electives**: "What are the open electives this semester?"
- **Academic Calendar**: "When do midsems start?"
- **Course Timetables**: "Where can I find the timetable for CS courses?"
- **Academic Policies**: "Explain the credit system at BITS", "What is the GPA calculation rule?"
- **Announcements**: "Where do I find announcements or academic calendar?"

### Private Queries (Student-Specific)
- **Grades**: "What are my grades for this semester?"
- **Payments**: "What is my payment status?"
- **Enrolled Courses**: "What courses am I enrolled in?"
- **Attendance**: "Show me my attendance records"
- **Academic Summary**: "Give me my academic summary"

### Student Dashboard
- Academic overview with GPA, courses, payments
- Recent grades display
- Enrolled courses list
- Payment status tracking
- Toggle between Chat and Dashboard views

## Tech Stack

### Frontend
- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - HTTP client

### Backend
- **NestJS** - Node.js framework
- **TypeORM** - ORM for database
- **SQLite** - Database (for development)
- **JWT** - Authentication
- **LightRAG Integration** - For document queries

### External Services
- **LightRAG API** - Running at `http://localhost:9621` for document-based RAG queries

## Project Structure

```
bits-dubai-rag/
├── frontend/          # Next.js frontend application
│   ├── app/          # Next.js app router
│   ├── components/   # React components
│   │   ├── admin/    # Admin components (DocumentUpload)
│   │   ├── chat/     # Chat interface components
│   │   └── ui/       # UI components
│   └── lib/          # Utilities and API clients
├── backend/          # NestJS backend application
│   ├── src/
│   │   ├── auth/     # Authentication module
│   │   ├── student/  # Student private data module
│   │   ├── public-data/ # Public academic data module
│   │   ├── query/    # Query classification and processing
│   │   ├── llm/      # LightRAG integration
│   │   └── entities/ # Database entities
│   └── dist/         # Compiled output
└── package.json      # Root package.json for monorepo
```

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **LightRAG Server** running at `http://localhost:9621`

## Setup Instructions

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

Or use the convenience script:
```bash
npm run install:all
```

### 2. Configure Environment Variables

#### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:9621
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

#### Backend (`backend/.env`)
```env
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
DATABASE_PATH=bits-dubai.db
LIGHTRAG_API_URL=http://localhost:9621
LIGHTRAG_TOKEN=
FRONTEND_URL=http://localhost:3000
```

### 3. Start LightRAG Server

Ensure your LightRAG server is running at `http://localhost:9621`. Refer to your LightRAG documentation for setup.

### 4. Run the Application

#### Development Mode (Both Frontend and Backend)

From root directory:
```bash
npm run dev
```

This will start:
- Frontend on `http://localhost:3000`
- Backend on `http://localhost:3001`

#### Or run separately:

**Backend:**
```bash
cd backend
npm run start:dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Build for Production

```bash
# Build both
npm run build

# Or separately
npm run build:frontend
npm run build:backend
```

## Default Credentials

### Student Login
- **Email**: `ansh.bandi@dubai.bits-pilani.ac.in`
- **Password**: `password123`

### Admin Login (Demo)
- **Email**: `admin@bitsdubai.ac.ae`
- **Password**: `bits@admin2024`

## Mock Data

The system comes with pre-seeded mock data including:
- 2 students with academic records
- 8 courses (CS, MATH, GS departments)
- Academic calendar events (midsem, endsem, registration dates)
- Course schedules and timetables
- Student grades, payments, enrollments, and attendance records

The database is automatically seeded on backend startup.

## API Architecture

### LightRAG API (`http://localhost:9621`)
- Document upload and management
- Document-based queries
- Knowledge graph operations
- Ollama emulation endpoints

### Backend API (`http://localhost:3001`)
- Authentication (`/auth/*`)
- Student data (`/student/*`) - Private queries
- Public data (`/public/*`) - Public academic queries
- Unified query (`/query`) - Routes queries to appropriate service

## Query Flow

1. **User submits query** → Frontend
2. **Query sent to backend** `/query` endpoint with JWT token
3. **Backend classifies query** (public/private/mixed)
4. **Data fetched**:
   - Private queries → Backend database
   - Public queries → Backend database
   - Document queries → LightRAG API
5. **Context provided to LightRAG** for response generation
6. **Response returned** to user

## Usage Examples

### Public Queries
- "What are the open electives this semester?"
- "When do midsems start?"
- "Where can I find the timetable for CS courses?"
- "Explain the credit system at BITS"

### Private Queries
- "What are my grades?"
- "Show me my payment information"
- "What courses am I enrolled in?"
- "What is my attendance for this semester?"

### Document Queries (via LightRAG)
- "What is machine learning?" (searches uploaded documents)
- "Explain neural networks" (from knowledge base)

## Development Notes

### Database
- Uses SQLite for development
- Database file: `bits-dubai.db` in backend directory
- Auto-seeded on startup
- Can be migrated to PostgreSQL/MySQL for production

### Authentication
- JWT-based authentication for backend
- LightRAG may have its own auth (check LightRAG config)
- Tokens stored in localStorage (frontend)

### Query Routing
- Authenticated users → Unified query API (backend)
- Unauthenticated users → Direct LightRAG API
- Backend routes to LightRAG for document queries
- Backend handles private/public academic queries

## Troubleshooting

### LightRAG Connection Issues
- Ensure LightRAG server is running at `http://localhost:9621`
- Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`
- Check `LIGHTRAG_API_URL` in backend `.env`

### Backend Connection Issues
- Ensure backend is running on port 3001
- Check `NEXT_PUBLIC_BACKEND_URL` in frontend `.env.local`
- Verify CORS settings in backend

### Database Issues
- Delete `bits-dubai.db` to reset database
- Restart backend to re-seed data

### Authentication Issues
- Clear localStorage and login again
- Check JWT token expiration (7 days default)

## Future Enhancements

- [ ] Real-time document processing notifications
- [ ] Advanced analytics and reporting
- [ ] Multi-semester support
- [ ] Course registration system
- [ ] Assignment submission system
- [ ] Integration with external student information systems

## License

This project is for educational/demonstration purposes.
