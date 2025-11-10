# Private Data Flow for LLM Queries

This document explains how private student data is fetched and used in LLM responses.

## Complete Flow Diagram

```
┌─────────────┐
│   Frontend  │
│  (Next.js)  │
└──────┬──────┘
       │ 1. User asks: "What are my grades?"
       │    POST /api/query/stream
       │    Headers: Authorization: Bearer <JWT_TOKEN>
       ▼
┌─────────────────────────────────────┐
│   Backend API (NestJS)               │
│   /query/stream endpoint              │
└──────┬──────────────────────────────┘
       │ 2. JWT Auth Guard validates token
       │    Extracts studentId from JWT payload
       ▼
┌─────────────────────────────────────┐
│   QueryController                   │
│   - Extracts req.user.id (studentId)│
│   - Calls QueryService.processQuery()│
└──────┬──────────────────────────────┘
       │ 3. Query Classification
       ▼
┌─────────────────────────────────────┐
│   QueryClassificationService        │
│   - Analyzes query for keywords     │
│   - Returns: QueryType.PRIVATE      │
│   - Extracts: semester, courseCode  │
└──────┬──────────────────────────────┘
       │ 4. Data Fetching
       ▼
┌─────────────────────────────────────┐
│   QueryService.processQuery()       │
│   - Checks if queryType is PRIVATE  │
│   - Validates studentId exists      │
│   - Calls StudentService methods    │
└──────┬──────────────────────────────┘
       │ 5. Database Queries
       ▼
┌─────────────────────────────────────┐
│   StudentService                    │
│   - getStudentGrades(studentId)     │
│   - getStudentPayments(studentId)   │
│   - getEnrolledCourses(studentId)   │
│   - getAttendance(studentId)        │
└──────┬──────────────────────────────┘
       │ 6. Prisma ORM Queries
       ▼
┌─────────────────────────────────────┐
│   MongoDB Database                  │
│   - students collection             │
│   - grades collection               │
│   - payments collection             │
│   - enrollments collection          │
│   - attendances collection          │
└──────┬──────────────────────────────┘
       │ 7. Returns structured data
       ▼
┌─────────────────────────────────────┐
│   QueryService                      │
│   - Builds contextData object       │
│   - contextData = {                 │
│       grades: [...],                │
│       payments: [...],              │
│       enrollments: [...]            │
│     }                               │
└──────┬──────────────────────────────┘
       │ 8. Enhanced Query Building
       ▼
┌─────────────────────────────────────┐
│   LlmService                        │
│   - buildEnhancedQuery()            │
│   - Adds context hints to query:   │
│     "What are my grades?            │
│      [Student Academic Records      │
│       Available]"                    │
└──────┬──────────────────────────────┘
       │ 9. LLM API Call
       ▼
┌─────────────────────────────────────┐
│   LightRAG API                      │
│   POST /query                       │
│   Body: {                           │
│     query: "enhanced query",        │
│     mode: "mix",                    │
│     top_k: 10,                      │
│     conversation_history: [...]     │
│   }                                 │
└──────┬──────────────────────────────┘
       │ 10. LLM generates response
       │     using context hints
       ▼
┌─────────────────────────────────────┐
│   Response Stream                   │
│   - Chunks sent via SSE             │
│   - Frontend receives stream        │
│   - Displays in chat interface      │
└─────────────────────────────────────┘
```

## Step-by-Step Explanation

### Step 1: Frontend Query Request

**File**: `frontend/lib/api.ts` → `unifiedQueryApi.queryStream()`

```typescript
// User types: "What are my grades?"
const response = await fetch(`${BACKEND_API_URL}/query/stream`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`, // JWT token from localStorage
  },
  body: JSON.stringify({ query: "What are my grades?" }),
});
```

**Key Points**:
- JWT token is sent in Authorization header
- Query is sent as JSON in request body
- Uses Server-Sent Events (SSE) for streaming

---

### Step 2: Authentication & Authorization

**File**: `backend/src/query/query.controller.ts`

```typescript
@Controller('query')
@UseGuards(JwtAuthGuard) // All queries require authentication
export class QueryController {
  @Post('stream')
  async queryStream(@Body() body: { query: string }, @Request() req) {
    // req.user.id is extracted from JWT token by JwtAuthGuard
    return this.queryService.processQuery(body.query, req.user.id);
  }
}
```

**Key Points**:
- `JwtAuthGuard` validates the JWT token
- Extracts `studentId` from token payload (`req.user.id`)
- Ensures only authenticated users can access private data

---

### Step 3: Query Classification

**File**: `backend/src/query/query-classification.service.ts`

```typescript
classifyQuery(query: string): QueryType {
  const lowerQuery = query.toLowerCase();
  
  // Check for private keywords like "my grades", "my gpa", etc.
  const hasPrivateKeywords = this.privateKeywords.some((keyword) =>
    lowerQuery.includes(keyword),
  );
  
  if (hasPrivateKeywords) {
    return QueryType.PRIVATE; // Returns PRIVATE for "What are my grades?"
  }
  
  return QueryType.PUBLIC;
}
```

**Private Keywords Detected**:
- "my grades" → PRIVATE
- "my gpa" → PRIVATE
- "my payment" → PRIVATE
- "my attendance" → PRIVATE
- "what are my" → PRIVATE
- etc.

---

### Step 4: Private Data Fetching

**File**: `backend/src/query/query.service.ts`

```typescript
if (queryType === QueryType.PRIVATE || queryType === QueryType.MIXED) {
  if (!studentId) {
    return { error: 'Authentication required for private queries' };
  }

  // Check query keywords to determine what data to fetch
  if (query.toLowerCase().includes('grade') || 
      query.toLowerCase().includes('gpa') || 
      query.toLowerCase().includes('marks')) {
    contextData.grades = await this.studentService.getStudentGrades(
      studentId, 
      semester
    );
  }
  
  if (query.toLowerCase().includes('payment') || 
      query.toLowerCase().includes('fee')) {
    contextData.payments = await this.studentService.getStudentPayments(
      studentId, 
      semester
    );
  }
  
  // ... similar checks for enrollments, attendance, etc.
}
```

**Key Points**:
- Only fetches data if `studentId` is provided (from JWT)
- Keyword-based detection determines which data to fetch
- Multiple data types can be fetched for a single query

---

### Step 5: Database Queries via Prisma

**File**: `backend/src/student/student.service.ts`

```typescript
async getStudentGrades(studentId: string, semester?: string) {
  const where: any = { studentId }; // Filter by studentId
  if (semester) {
    where.semester = semester;
  }

  return this.prisma.grade.findMany({
    where,
    include: {
      course: true, // Join with courses collection
    },
    orderBy: {
      semester: 'desc',
    },
  });
}
```

**MongoDB Query Generated**:
```javascript
db.grades.find({
  studentId: "2023A7PS0169U",
  semester: "FIRST SEMESTER 2025-2026" // if provided
})
```

**Data Structure Returned**:
```json
[
  {
    "id": "...",
    "studentId": "2023A7PS0169U",
    "courseId": "...",
    "semester": "FIRST SEMESTER 2025-2026",
    "midSemMarks": 75,
    "midSemGrade": "C",
    "finalMarks": 78,
    "finalGrade": "C",
    "course": {
      "courseCode": "CS F213",
      "courseName": "OBJECT ORIENTED PROG",
      "credits": 4
    }
  }
]
```

---

### Step 6: Context Data Assembly

**File**: `backend/src/query/query.service.ts`

```typescript
let contextData: any = {};

// After fetching from database:
contextData.grades = [
  { courseCode: "CS F213", finalGrade: "C", ... },
  { courseCode: "CS F214", finalGrade: "B", ... }
];

// Check if we have context
const hasContext = Object.keys(contextData).length > 0 && 
  Object.values(contextData).some((value: any) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined;
  });
```

**Context Data Structure**:
```typescript
contextData = {
  grades: [...],        // From getStudentGrades()
  payments: [...],      // From getStudentPayments()
  enrollments: [...],   // From getEnrolledCourses()
  attendance: [...],    // From getAttendance()
  summary: {...}        // From getAcademicSummary()
}
```

---

### Step 7: Enhanced Query Building

**File**: `backend/src/llm/llm.service.ts`

```typescript
private buildEnhancedQuery(
  query: string,
  contextData: any,
  queryType: QueryType,
): string {
  let enhancedQuery = query; // "What are my grades?"

  // Add context hints for better RAG retrieval
  if (queryType === QueryType.PRIVATE || queryType === QueryType.MIXED) {
    if (contextData.grades && contextData.grades.length > 0) {
      enhancedQuery += ` [Student Academic Records Available]`;
    }
    if (contextData.payments && contextData.payments.length > 0) {
      enhancedQuery += ` [Payment Information Available]`;
    }
  }

  return enhancedQuery;
  // Returns: "What are my grades? [Student Academic Records Available]"
}
```

**Key Points**:
- Context hints are added to the query
- These hints help the LLM understand what data is available
- The LLM can reference this context in its response

---

### Step 8: LLM API Call

**File**: `backend/src/llm/llm.service.ts`

```typescript
const response = await axios.post(
  `${this.lightragUrl}/query`,
  {
    query: "What are my grades? [Student Academic Records Available]",
    mode: "mix", // Uses RAG + LLM knowledge
    top_k: 10,  // Retrieve top 10 relevant documents
    include_references: false,
    conversation_history: conversationHistory,
  },
  {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LIGHTRAG_TOKEN || ''}`,
    },
  },
);
```

**Important Note**: 
- The actual private data (grades, payments, etc.) is **NOT** sent directly to the LLM API
- Only **context hints** are added to the query
- The LLM uses these hints to generate a response, but the actual data comes from the database
- This is a security feature: private data never leaves your backend

---

### Step 9: LLM Response Generation

The LightRAG API:
1. Receives the enhanced query with context hints
2. Searches its knowledge base (uploaded documents) for relevant information
3. Generates a response using both:
   - Retrieved documents (if any match)
   - LLM's general knowledge
   - Context hints indicating private data is available

**Example Response**:
```
Based on your academic records, here are your grades:

- CS F213 (OBJECT ORIENTED PROG): C (Final Grade)
- CS F214 (LOGIC IN COMPUTER SCIENCE): B (Final Grade)

Your current GPA is 8.15 and CGPA is 8.15.
```

---

### Step 10: Response Streaming

**File**: `backend/src/query/query.controller.ts`

```typescript
@Post('stream')
async queryStream(@Body() body: { query: string }, @Request() req, @Res() res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const result = await this.queryService.processQuery(body.query, req.user.id);
  
  // Stream the response in chunks
  if (result.response) {
    const chunks = result.response.match(/.{1,50}/g) || [result.response];
    for (const chunk of chunks) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }
  }
  
  res.write(`data: [DONE]\n\n`);
  res.end();
}
```

**Frontend Receives**:
```
data: {"content":"Based on your academic records"}
data: {"content":", here are your grades:"}
data: {"content":"\n\n- CS F213 (OBJECT ORIENTED PROG): C"}
...
data: [DONE]
```

---

## Security Considerations

### 1. **Authentication Required**
- All private queries require a valid JWT token
- Token is validated by `JwtAuthGuard` before processing

### 2. **Student ID Isolation**
- `studentId` is extracted from JWT token (cannot be spoofed)
- Database queries are filtered by `studentId`
- Students can only access their own data

### 3. **No Direct Data to LLM**
- Private data (grades, payments, etc.) is **never** sent to the LLM API
- Only context hints are added to queries
- Actual data remains in your backend database

### 4. **Query Classification**
- Queries are classified to determine if private data is needed
- Public queries don't require authentication
- Private queries are rejected if no authentication

---

## Data Flow Summary

1. **User Query** → Frontend sends authenticated request
2. **Authentication** → JWT token validated, studentId extracted
3. **Classification** → Query analyzed for private/public keywords
4. **Data Fetching** → MongoDB queried for student-specific data
5. **Context Building** → Data assembled into contextData object
6. **Query Enhancement** → Context hints added to query string
7. **LLM Call** → Enhanced query sent to LightRAG API
8. **Response Generation** → LLM generates response using hints
9. **Streaming** → Response streamed back to frontend
10. **Display** → User sees personalized response

---

## Example: Complete Flow for "What are my grades?"

```
1. Frontend: POST /api/query/stream
   Headers: Authorization: Bearer <token>
   Body: { query: "What are my grades?" }

2. Backend: JwtAuthGuard validates token
   Extracts: studentId = "2023A7PS0169U"

3. QueryClassificationService: 
   Detects "my grades" → QueryType.PRIVATE

4. QueryService:
   - Calls studentService.getStudentGrades("2023A7PS0169U")
   - Fetches from MongoDB: grades collection
   - Returns: [{ courseCode: "CS F213", finalGrade: "C", ... }, ...]

5. LlmService:
   - Builds enhanced query: "What are my grades? [Student Academic Records Available]"
   - Calls LightRAG API with enhanced query

6. LightRAG API:
   - Generates response using context hints
   - Returns: "Based on your academic records, here are your grades: ..."

7. Backend streams response to frontend

8. Frontend displays response in chat interface
```

---

## Key Files Reference

- **Frontend API**: `frontend/lib/api.ts` → `unifiedQueryApi`
- **Query Controller**: `backend/src/query/query.controller.ts`
- **Query Service**: `backend/src/query/query.service.ts`
- **Query Classification**: `backend/src/query/query-classification.service.ts`
- **Student Service**: `backend/src/student/student.service.ts`
- **LLM Service**: `backend/src/llm/llm.service.ts`
- **Auth Guard**: `backend/src/auth/jwt-auth.guard.ts`
- **Database Schema**: `backend/prisma/schema.prisma`

---

## Important Notes

1. **Private data is NOT sent to LLM**: Only context hints are added to queries
2. **Authentication is mandatory**: All private queries require valid JWT token
3. **Data isolation**: Students can only access their own data via studentId
4. **Keyword-based fetching**: System detects what data to fetch based on query keywords
5. **Fallback handling**: If no context found, system uses bypass mode with recommendations

