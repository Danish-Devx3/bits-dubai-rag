# MCP Tools Implementation for Private Data

## Overview

This document explains the MCP (Model Context Protocol) tools implementation for handling private student data queries. This approach is **much more scalable** than the previous keyword-based matching system.

## Problem with Previous Approach

The old system used **keyword matching** which was:
- ❌ **Not scalable**: Required hardcoding keywords for each data type
- ❌ **Rigid**: Couldn't handle variations in user queries
- ❌ **Maintenance burden**: Needed updates for every new query pattern
- ❌ **Limited**: Couldn't handle complex multi-data queries

**Example of old approach:**
```typescript
if (query.toLowerCase().includes('grade') || 
    query.toLowerCase().includes('gpa')) {
  contextData.grades = await this.studentService.getStudentGrades(...);
}
```

## New MCP Tools Approach

The new system uses **function calling** where:
- ✅ **LLM decides** which tools to call based on query intent
- ✅ **Scalable**: Add new tools without changing query logic
- ✅ **Flexible**: Handles natural language variations
- ✅ **Intelligent**: LLM can call multiple tools for complex queries

## Architecture

```
User Query: "What are my grades for CS F213?"
    ↓
QueryService.processQuery()
    ↓
QueryClassificationService → Detects: PRIVATE
    ↓
LlmWithToolsService.generateResponseWithTools()
    ↓
Step 1: LLM analyzes query → Decides to call: get_student_grades
    ↓
Step 2: Execute tool → Fetch data from MongoDB
    ↓
Step 3: Format tool results → Send to LLM
    ↓
Step 4: LLM generates final response using actual data
    ↓
Response: "Your grade for CS F213 (OBJECT ORIENTED PROG) is C..."
```

## Available MCP Tools

### 1. `get_student_grades`
**Purpose**: Get student grades for a specific semester or all semesters.

**When to use**: User asks about grades, GPA, marks, or academic performance.

**Parameters**:
- `semester` (optional): Filter by semester (e.g., "FIRST SEMESTER 2025-2026")

**Example queries**:
- "What are my grades?"
- "Show me my GPA"
- "What did I get in CS F213?"

### 2. `get_student_payments`
**Purpose**: Get student payment and fee information.

**When to use**: User asks about payments, fees, dues, or financial status.

**Parameters**:
- `semester` (optional): Filter by semester

**Example queries**:
- "What are my payment details?"
- "Do I have any pending fees?"
- "Show me my payment history"

### 3. `get_enrolled_courses`
**Purpose**: Get courses the student is enrolled in.

**When to use**: User asks about enrolled courses, current courses, or course registration.

**Parameters**:
- `semester` (optional): Filter by semester

**Example queries**:
- "What courses am I enrolled in?"
- "Show me my current courses"
- "What classes am I taking this semester?"

### 4. `get_attendance`
**Purpose**: Get student attendance records.

**When to use**: User asks about attendance, presence, or class participation.

**Parameters**:
- `courseCode` (optional): Filter by course code (e.g., "CS F213")

**Example queries**:
- "What is my attendance?"
- "How many classes did I miss?"
- "Show me attendance for CS F213"

### 5. `get_academic_summary`
**Purpose**: Get comprehensive academic summary including grades, enrollments, and payments.

**When to use**: User asks for overall academic status, summary, or dashboard information.

**Parameters**: None

**Example queries**:
- "Give me my academic summary"
- "Show me my overall academic status"
- "What's my academic dashboard?"

### 6. `get_student_profile`
**Purpose**: Get basic student profile information.

**When to use**: User asks about their profile, personal info, or academic standing.

**Parameters**: None

**Example queries**:
- "What is my student profile?"
- "Show me my academic standing"
- "What's my GPA and CGPA?"

## How It Works

### Step 1: Tool Selection

The LLM receives the query and available tools, then decides which tools to call:

```typescript
// LLM receives:
Query: "What are my grades for this semester?"
Tools: [get_student_grades, get_student_payments, ...]

// LLM responds with JSON:
[
  {
    "name": "get_student_grades",
    "parameters": {
      "semester": "FIRST SEMESTER 2025-2026"
    }
  }
]
```

### Step 2: Tool Execution

The system executes the selected tools and fetches actual data:

```typescript
// Execute tool
const grades = await mcpToolsService.executeTool(
  'get_student_grades',
  { semester: 'FIRST SEMESTER 2025-2026' },
  studentId
);

// Returns actual data from MongoDB:
[
  {
    courseCode: "CS F213",
    courseName: "OBJECT ORIENTED PROG",
    finalGrade: "C",
    gpa: 6.0,
    ...
  }
]
```

### Step 3: Data Formatting

Tool results are formatted for LLM consumption:

```typescript
// Formatted output:
"Student Grades:
- CS F213: OBJECT ORIENTED PROG
  Semester: FIRST SEMESTER 2024-2025
  Mid-Sem: 75 (C)
  Final: 78 (C)
  Total: 76.5
  GPA: 6.0
  Status: completed"
```

### Step 4: Final Response Generation

The LLM receives the formatted data and generates a natural language response:

```
"Based on your academic records, here are your grades for the first semester:

- CS F213 (OBJECT ORIENTED PROG): C
  Your mid-semester marks were 75 and final marks were 78, giving you a total of 76.5 and a GPA of 6.0.

- CS F214 (LOGIC IN COMPUTER SCIENCE): B
  ...
"
```

## Code Structure

### MCP Tools Service
**File**: `backend/src/mcp/mcp-tools.service.ts`

- Defines available tools
- Executes tools and fetches data
- Formats tool responses

### LLM With Tools Service
**File**: `backend/src/llm/llm-with-tools.service.ts`

- Handles tool selection with LLM
- Orchestrates tool execution
- Generates final responses

### Query Service Integration
**File**: `backend/src/query/query.service.ts`

```typescript
// For private queries, use MCP tools
if (this.useMcpTools && (queryType === QueryType.PRIVATE || queryType === QueryType.MIXED)) {
  const response = await this.llmWithToolsService.generateResponseWithTools(
    query,
    studentId,
    queryType,
  );
  return { queryType, response, ... };
}
```

## Benefits

### 1. Scalability
- **Add new tools** without changing query logic
- **No keyword maintenance** required
- **Handles new query patterns** automatically

### 2. Flexibility
- **Natural language understanding**: "What did I score?" → calls `get_student_grades`
- **Multi-tool queries**: "Give me my academic summary" → calls multiple tools
- **Context-aware**: Understands semester, course codes, etc.

### 3. Maintainability
- **Single source of truth**: Tool definitions in one place
- **Easy to extend**: Just add new tool to `getAvailableTools()`
- **Type-safe**: Tool parameters are validated

### 4. User Experience
- **More accurate**: LLM understands intent, not just keywords
- **Better responses**: Uses actual data, not hints
- **Handles edge cases**: "What's my performance?" → intelligently calls relevant tools

## Example: Complex Query

**User**: "I want to know my overall academic performance including grades, attendance, and any pending payments"

**Flow**:
1. LLM analyzes query → Determines need for multiple tools
2. Calls:
   - `get_student_grades()` → Gets all grades
   - `get_attendance()` → Gets attendance records
   - `get_student_payments()` → Gets payment status
3. Formats all results
4. LLM generates comprehensive response using all data

**Result**: Complete academic overview with grades, attendance summary, and payment status.

## Configuration

### Enable/Disable MCP Tools

In `backend/src/query/query.service.ts`:

```typescript
// Enable MCP tools (default)
private useMcpTools: boolean = true;

// Disable to use legacy keyword matching
private useMcpTools: boolean = false;
```

### Add New Tool

1. Add tool definition to `mcp-tools.service.ts`:
```typescript
{
  name: 'get_new_data',
  description: 'Get new data type...',
  parameters: { ... }
}
```

2. Add execution logic:
```typescript
case 'get_new_data':
  return await this.studentService.getNewData(studentId, parameters);
```

3. Add formatting:
```typescript
case 'get_new_data':
  return `Formatted output: ${data}`;
```

That's it! No need to update query logic.

## Security

- ✅ **Authentication required**: All private queries require JWT token
- ✅ **Student isolation**: Tools only access data for authenticated student
- ✅ **No data leakage**: Private data never sent to external LLM APIs
- ✅ **Parameter validation**: Tool parameters are validated before execution

## Performance

- **Tool execution**: ~50-200ms per tool (database queries)
- **LLM calls**: ~500-2000ms per call
- **Total response time**: ~1-3 seconds for typical queries
- **Caching**: Can be added for frequently accessed data

## Future Enhancements

1. **Tool result caching**: Cache tool results for repeated queries
2. **Parallel tool execution**: Execute multiple tools simultaneously
3. **Tool usage analytics**: Track which tools are used most
4. **Custom tool definitions**: Allow dynamic tool registration
5. **Tool chaining**: Allow tools to call other tools

## Migration from Keyword Matching

The system maintains **backward compatibility**:
- MCP tools are used by default for private queries
- Legacy keyword matching is still available as fallback
- Can be toggled via `useMcpTools` flag

## Testing

Test queries that should work with MCP tools:

```bash
# Grades
"What are my grades?"
"Show me my GPA"
"What did I get in CS F213?"

# Payments
"What are my payment details?"
"Do I have any pending fees?"

# Courses
"What courses am I enrolled in?"
"Show me my current courses"

# Attendance
"What is my attendance?"
"How many classes did I miss?"

# Summary
"Give me my academic summary"
"Show me my overall academic status"
```

## Troubleshooting

### LLM doesn't call correct tool
- Check tool descriptions are clear
- Verify query classification is correct
- Check fallback logic in `suggestToolsFromQuery()`

### Tool execution fails
- Verify studentId is correct
- Check database connection
- Verify tool parameters are valid

### Response is generic
- Ensure tool results are properly formatted
- Check if tool actually returned data
- Verify LLM received formatted results

## Conclusion

The MCP tools approach provides a **scalable, flexible, and maintainable** solution for handling private data queries. It eliminates the need for keyword matching and allows the LLM to intelligently decide which data to fetch based on user intent.

