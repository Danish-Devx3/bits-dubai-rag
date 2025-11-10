import { Injectable } from '@nestjs/common';
import { QueryClassificationService, QueryType } from './query-classification.service';
import { PublicDataService } from '../public-data/public-data.service';
import { StudentService } from '../student/student.service';
import { LlmService } from '../llm/llm.service';
import { LlmWithToolsService } from '../llm/llm-with-tools.service';

@Injectable()
export class QueryService {
  // Use MCP tools for private queries (more scalable)
  private useMcpTools: boolean = true;

  constructor(
    private classificationService: QueryClassificationService,
    private publicDataService: PublicDataService,
    private studentService: StudentService,
    private llmService: LlmService,
    private llmWithToolsService: LlmWithToolsService,
  ) {}

  async processQuery(query: string, studentId?: string) {
    const queryType = this.classificationService.classifyQuery(query);
    const semester = this.classificationService.extractSemester(query);
    const courseCode = this.classificationService.extractCourseCode(query);
    const department = this.classificationService.extractDepartment(query);

    let contextData: any = {};

    // Fetch relevant data based on query type
    if (queryType === QueryType.PUBLIC || queryType === QueryType.MIXED) {
      // Public data
      if (query.toLowerCase().includes('open electives')) {
        contextData.openElectives = await this.publicDataService.getOpenElectives(semester);
      }
      if (query.toLowerCase().includes('midsem')) {
        contextData.midsemDates = await this.publicDataService.getMidsemDates(semester);
      }
      if (query.toLowerCase().includes('timetable') || query.toLowerCase().includes('schedule')) {
        contextData.timetable = await this.publicDataService.getCourseTimetable(
          courseCode,
          department,
        );
      }
      if (query.toLowerCase().includes('gpa') && query.toLowerCase().includes('calculation')) {
        contextData.gpaRules = this.publicDataService.getGpaCalculationRules();
      }
      if (query.toLowerCase().includes('credit system')) {
        contextData.creditSystem = this.publicDataService.getCreditSystemInfo();
      }
      if (query.toLowerCase().includes('announcement')) {
        contextData.announcements = this.publicDataService.getAnnouncementLocations();
      }
      if (query.toLowerCase().includes('calendar')) {
        contextData.calendar = await this.publicDataService.getAcademicCalendar(semester);
      }
    }

    if (queryType === QueryType.PRIVATE || queryType === QueryType.MIXED) {
      if (!studentId) {
        return {
          error: 'Authentication required for private queries',
          queryType,
        };
      }

      // Use MCP tools for private queries (more scalable and flexible)
      if (this.useMcpTools && (queryType === QueryType.PRIVATE || queryType === QueryType.MIXED)) {
        // Let LLM decide which tools to call based on query
        const response = await this.llmWithToolsService.generateResponseWithTools(
          query,
          studentId,
          queryType,
        );

        return {
          queryType,
          response,
          context: { method: 'mcp_tools' }, // Indicates MCP tools were used
          hasContext: true,
          recommendations: [],
        };
      }

      // Fallback to keyword-based approach (legacy)
      // Private data
      if (
        query.toLowerCase().includes('grade') ||
        query.toLowerCase().includes('gpa') ||
        query.toLowerCase().includes('marks')
      ) {
        contextData.grades = await this.studentService.getStudentGrades(studentId, semester);
      }
      if (query.toLowerCase().includes('payment') || query.toLowerCase().includes('fee')) {
        contextData.payments = await this.studentService.getStudentPayments(studentId, semester);
      }
      if (query.toLowerCase().includes('course') && query.toLowerCase().includes('enrolled')) {
        contextData.enrollments = await this.studentService.getEnrolledCourses(
          studentId,
          semester,
        );
      }
      if (query.toLowerCase().includes('attendance')) {
        contextData.attendance = await this.studentService.getAttendance(
          studentId,
          courseCode ? undefined : undefined,
        );
      }
      if (query.toLowerCase().includes('summary') || query.toLowerCase().includes('academic')) {
        contextData.summary = await this.studentService.getAcademicSummary(studentId);
      }
    }

    // Check if we have any context data
    const hasContext = Object.keys(contextData).length > 0 && 
      Object.values(contextData).some((value: any) => {
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
        return value !== null && value !== undefined && value !== '';
      });

    // Generate LLM response with context or bypass mode
    const response = await this.llmService.generateResponse(
      query, 
      contextData, 
      queryType,
      undefined,
      !hasContext, // Use bypass mode if no context
    );

    // Generate recommendations if no context found
    const recommendations = !hasContext 
      ? this.generateRecommendations(query, queryType)
      : [];

    return {
      queryType,
      response,
      context: contextData, // For debugging
      hasContext,
      recommendations,
    };
  }

  private generateRecommendations(query: string, queryType: QueryType): string[] {
    const recommendations: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Public query recommendations
    if (queryType === QueryType.PUBLIC || queryType === QueryType.MIXED) {
      if (lowerQuery.includes('midsem') || lowerQuery.includes('exam')) {
        recommendations.push('What are the end-semester examination dates?');
        recommendations.push('When does the semester start?');
        recommendations.push('What is the academic calendar for this semester?');
      }
      if (lowerQuery.includes('elective') || lowerQuery.includes('course')) {
        recommendations.push('What are the open electives available?');
        recommendations.push('Show me all courses in the catalog');
        recommendations.push('What courses are available in CS department?');
      }
      if (lowerQuery.includes('timetable') || lowerQuery.includes('schedule')) {
        recommendations.push('What is the course timetable?');
        recommendations.push('Show me the academic calendar');
      }
      if (lowerQuery.includes('gpa') || lowerQuery.includes('grade')) {
        recommendations.push('How is GPA calculated?');
        recommendations.push('Explain the credit system');
      }
      if (lowerQuery.includes('calendar') || lowerQuery.includes('date')) {
        recommendations.push('What is the academic calendar?');
        recommendations.push('When do midsemester exams start?');
        recommendations.push('What are the semester dates?');
      }
    }

    // Private query recommendations
    if (queryType === QueryType.PRIVATE || queryType === QueryType.MIXED) {
      if (lowerQuery.includes('grade') || lowerQuery.includes('mark')) {
        recommendations.push('What are my grades?');
        recommendations.push('Show me my academic summary');
        recommendations.push('What is my GPA?');
      }
      if (lowerQuery.includes('payment') || lowerQuery.includes('fee')) {
        recommendations.push('What are my payment details?');
        recommendations.push('Show me my fee status');
      }
      if (lowerQuery.includes('course') || lowerQuery.includes('enroll')) {
        recommendations.push('What courses am I enrolled in?');
        recommendations.push('Show me my enrolled courses');
      }
      if (lowerQuery.includes('attendance')) {
        recommendations.push('What is my attendance?');
        recommendations.push('Show me my attendance records');
      }
    }

    // General recommendations if no specific match
    if (recommendations.length === 0) {
      recommendations.push('What are the open electives this semester?');
      recommendations.push('When do midsemester exams start?');
      recommendations.push('What is the academic calendar?');
      recommendations.push('Explain the credit system at BITS');
      recommendations.push('How is GPA calculated?');
    }

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }
}

