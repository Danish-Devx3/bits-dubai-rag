# System Architecture

## Overview

This ERP/LMS system uses a monorepo structure with separate frontend and backend applications, integrated with Ollama for LLM-powered query responses.

## Architecture Diagram

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
│   Port: 3000    │
└────────┬────────┘
         │
         │ HTTP/REST + JWT
         │
┌────────▼────────┐
│   Backend       │
│   (NestJS)      │
│   Port: 3001    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│SQLite │ │Ollama │
│  DB   │ │ LLM   │
└───────┘ └───────┘
```

## Component Architecture

### Frontend (Next.js)

**Structure:**
- `app/` - Next.js App Router pages
- `components/` - Reusable React components
- `lib/` - API clients and utilities

**Key Features:**
- JWT-based authentication
- Chat interface for queries
- Student dashboard
- Admin panel (basic)

### Backend (NestJS)

**Modules:**

1. **Auth Module** (`src/auth/`)
   - JWT authentication
   - Login endpoint
   - Token validation

2. **Student Module** (`src/student/`)
   - Private data endpoints
   - Grades, payments, enrollments
   - Attendance records
   - Academic summary

3. **Public Data Module** (`src/public-data/`)
   - Academic calendar
   - Course catalog
   - Timetables
   - Policies and FAQs

4. **Query Module** (`src/query/`)
   - Query classification (public/private/mixed)
   - Query processing
   - Context aggregation

5. **LLM Module** (`src/llm/`)
   - Ollama integration
   - Response generation
   - Context formatting

6. **Database Module** (`src/database/`)
   - TypeORM configuration
   - Database seeding
   - Entity management

## Data Flow

### Public Query Flow

```
User Query → Frontend → Backend Query Service
                                    ↓
                          Query Classification
                                    ↓
                          Public Data Service
                                    ↓
                          Fetch from Database
                                    ↓
                          Format Context
                                    ↓
                          Ollama LLM
                                    ↓
                          Generate Response
                                    ↓
                          Return to Frontend
```

### Private Query Flow

```
User Query → Frontend → Backend Query Service
                                    ↓
                          Query Classification
                                    ↓
                          Student Service (with Auth)
                                    ↓
                          Fetch Student-Specific Data
                                    ↓
                          Format Context
                                    ↓
                          Ollama LLM
                                    ↓
                          Generate Response
                                    ↓
                          Return to Frontend
```

## Query Classification

The system uses keyword-based classification:

**Private Keywords:**
- "my grades", "my gpa", "my payment", "my attendance", etc.

**Public Keywords:**
- "open electives", "midsem dates", "timetable", "credit system", etc.

**Classification Logic:**
1. Check for private keywords → PRIVATE
2. Check for public keywords → PUBLIC
3. Both present → MIXED
4. Default → PUBLIC

## MCP-like Server Configuration

### What is MCP?

MCP (Model Context Protocol) is a protocol for providing context to LLMs. Our system implements an MCP-like pattern:

### Implementation

1. **Context Provider Pattern**
   - Each query type has a dedicated service
   - Services fetch relevant data from database
   - Data is formatted as context for LLM

2. **Access Control**
   - Private queries require authentication
   - Student ID extracted from JWT token
   - Data filtered by authenticated user

3. **Context Formatting**
   ```typescript
   {
     grades: [...],
     payments: [...],
     enrollments: [...],
     // etc.
   }
   ```

4. **LLM Integration**
   - Context passed to Ollama
   - System prompt defines role and guidelines
   - User query + context → LLM response

### Why Not Full MCP?

- MCP is typically for external tool integration
- Our system uses direct database access
- Simpler architecture for this use case
- Can be extended to full MCP later if needed

## Ollama Configuration

### Setup

1. **Install Ollama**
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Start Ollama**
   ```bash
   ollama serve
   # Usually auto-starts on system boot
   ```

3. **Pull Models**
   ```bash
   ollama pull llama3.2
   # or
   ollama pull mistral
   # or
   ollama pull qwen
   ```

### Configuration in Backend

**Environment Variables:**
```env
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

**Usage:**
```typescript
const ollama = new Ollama({
  host: process.env.OLLAMA_HOST
});

const response = await ollama.chat({
  model: process.env.OLLAMA_MODEL,
  messages: [...]
});
```

### Model Selection

**Recommended Models:**
- `llama3.2` - Good balance of speed and quality
- `mistral` - Fast and efficient
- `qwen` - Good for structured data
- `llama3` - Higher quality, slower

**Choosing a Model:**
1. Consider response time requirements
2. Test with your specific queries
3. Balance quality vs. speed
4. Check model size (RAM requirements)

## Database Schema

### Entities

1. **Student** - Student information
2. **Course** - Course catalog
3. **Enrollment** - Student-course relationships
4. **Grade** - Academic grades
5. **Payment** - Payment records
6. **Attendance** - Attendance tracking
7. **AcademicCalendar** - Calendar events
8. **CourseSchedule** - Timetable information

### Relationships

```
Student
  ├── Enrollments → Course
  ├── Grades → Course
  ├── Payments
  └── Attendances → Course

Course
  ├── Schedules
  └── Enrollments → Student
```

## Security

### Authentication
- JWT tokens with 7-day expiration
- Tokens stored in localStorage (frontend)
- Bearer token authentication (backend)

### Authorization
- All queries require authentication
- Private data filtered by student ID
- No cross-student data access

### Data Protection
- Passwords hashed with bcrypt
- SQL injection prevention (TypeORM)
- CORS configured for frontend only

## Scalability Considerations

### Current Limitations
- SQLite (single-file database)
- Single Ollama instance
- No caching layer
- No load balancing

### Production Recommendations
1. **Database**: Migrate to PostgreSQL/MySQL
2. **Caching**: Add Redis for query caching
3. **LLM**: Use Ollama API or cloud LLM service
4. **Load Balancing**: Add nginx or similar
5. **Monitoring**: Add logging and metrics
6. **CDN**: For static frontend assets

## API Design

### RESTful Endpoints

**Authentication:**
- `POST /auth/login`
- `GET /auth/me`

**Queries:**
- `POST /query` - Regular query
- `POST /query/stream` - Streaming query

**Student Data:**
- `GET /student/*` - All require authentication

**Public Data:**
- `GET /public/*` - Require authentication (but data is public)

### Response Format

**Success:**
```json
{
  "queryType": "public|private|mixed",
  "response": "LLM generated response",
  "context": {...} // Optional, for debugging
}
```

**Error:**
```json
{
  "error": "Error message",
  "statusCode": 400
}
```

## Testing

### Manual Testing
1. Test public queries
2. Test private queries
3. Test mixed queries
4. Test authentication
5. Test error handling

### Example Queries

**Public:**
- "What are the open electives?"
- "When do midsems start?"

**Private:**
- "What are my grades?"
- "Show me my payments"

**Mixed:**
- "What are my enrolled courses and when do midsems start?"

## Future Enhancements

1. **Full MCP Integration** - If needed for external tools
2. **Vector Database** - For document RAG
3. **Multi-modal** - Support images, PDFs
4. **Real-time Updates** - WebSocket for live data
5. **Analytics** - Query analytics and insights
6. **Admin Dashboard** - Full admin functionality

