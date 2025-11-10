import { Injectable } from '@nestjs/common';
import { StudentService } from '../student/student.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * MCP Tools for Private Student Data
 * 
 * This service provides function/tool definitions that the LLM can call
 * to retrieve private student data dynamically based on the query.
 * 
 * Instead of keyword matching, the LLM decides which tools to call.
 */
@Injectable()
export class McpToolsService {
  constructor(
    private studentService: StudentService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get all available MCP tools for private data
   */
  getAvailableTools() {
    return [
      {
        name: 'get_student_grades',
        description: 'Get student grades for a specific semester or all semesters. Use this when the user asks about grades, GPA, marks, or academic performance.',
        parameters: {
          type: 'object',
          properties: {
            semester: {
              type: 'string',
              description: 'Optional semester filter (e.g., "FIRST SEMESTER 2025-2026"). If not provided, returns all semesters.',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_student_payments',
        description: 'Get student payment and fee information. Use this when the user asks about payments, fees, dues, or financial status.',
        parameters: {
          type: 'object',
          properties: {
            semester: {
              type: 'string',
              description: 'Optional semester filter. If not provided, returns all semesters.',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_enrolled_courses',
        description: 'Get courses the student is enrolled in. Use this when the user asks about enrolled courses, current courses, or course registration.',
        parameters: {
          type: 'object',
          properties: {
            semester: {
              type: 'string',
              description: 'Optional semester filter. If not provided, returns current semester.',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_attendance',
        description: 'Get student attendance records. Use this when the user asks about attendance, presence, or class participation.',
        parameters: {
          type: 'object',
          properties: {
            courseCode: {
              type: 'string',
              description: 'Optional course code filter (e.g., "CS F213"). If not provided, returns all courses.',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_academic_summary',
        description: 'Get comprehensive academic summary including grades, enrollments, and payments. Use this when the user asks for overall academic status, summary, or dashboard information.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_student_profile',
        description: 'Get basic student profile information including name, program, GPA, CGPA. Use this when the user asks about their profile, personal info, or academic standing.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ];
  }

  /**
   * Execute an MCP tool call
   */
  async executeTool(
    toolName: string,
    parameters: any,
    studentId: string,
  ): Promise<any> {
    switch (toolName) {
      case 'get_student_grades':
        return await this.studentService.getStudentGrades(
          studentId,
          parameters.semester,
        );

      case 'get_student_payments':
        return await this.studentService.getStudentPayments(
          studentId,
          parameters.semester,
        );

      case 'get_enrolled_courses':
        return await this.studentService.getEnrolledCourses(
          studentId,
          parameters.semester,
        );

      case 'get_attendance':
        const courseId = parameters.courseCode 
          ? await this.getCourseIdFromCode(parameters.courseCode)
          : undefined;
        return await this.studentService.getAttendance(studentId, courseId);

      case 'get_academic_summary':
        return await this.studentService.getAcademicSummary(studentId);

      case 'get_student_profile':
        return await this.studentService.getStudentProfile(studentId);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Helper to get course ID from course code
   */
  private async getCourseIdFromCode(courseCode: string): Promise<string | undefined> {
    const course = await this.prisma.course.findUnique({
      where: { courseCode: courseCode.toUpperCase().replace(/\s+/g, ' ') },
    });
    return course?.id;
  }

  /**
   * Format tool response for LLM consumption
   */
  formatToolResponse(toolName: string, data: any): string {
    switch (toolName) {
      case 'get_student_grades':
        if (!data || data.length === 0) {
          return 'No grades found for the specified criteria.';
        }
        return `Student Grades:\n${data
          .map(
            (g: any) =>
              `- ${g.course?.courseCode || 'N/A'}: ${g.course?.courseName || 'N/A'}\n  Semester: ${g.semester}\n  Mid-Sem: ${g.midSemMarks || 'N/A'} (${g.midSemGrade || 'N/A'})\n  Final: ${g.finalMarks || 'N/A'} (${g.finalGrade || 'N/A'})\n  Total: ${g.totalMarks || 'N/A'}\n  GPA: ${g.gpa || 'N/A'}\n  Status: ${g.status}`,
          )
          .join('\n\n')}`;

      case 'get_student_payments':
        if (!data || data.length === 0) {
          return 'No payment records found.';
        }
        return `Payment Information:\n${data
          .map(
            (p: any) =>
              `- ${p.description || 'Payment'}\n  Semester: ${p.semester}\n  Amount: ₹${p.amount?.toLocaleString() || 'N/A'}\n  Status: ${p.status}\n  Due Date: ${p.dueDate ? new Date(p.dueDate).toLocaleDateString() : 'N/A'}\n  Paid Date: ${p.paidDate ? new Date(p.paidDate).toLocaleDateString() : 'Pending'}`,
          )
          .join('\n\n')}`;

      case 'get_enrolled_courses':
        if (!data || data.length === 0) {
          return 'No enrolled courses found.';
        }
        return `Enrolled Courses:\n${data
          .map(
            (e: any) =>
              `- ${e.course?.courseCode || 'N/A'}: ${e.course?.courseName || 'N/A'}\n  Credits: ${e.course?.credits || 'N/A'}\n  Semester: ${e.semester}\n  Status: ${e.status}`,
          )
          .join('\n\n')}`;

      case 'get_attendance':
        if (!data || data.length === 0) {
          return 'No attendance records found.';
        }
        const attendanceByCourse = data.reduce((acc: any, record: any) => {
          const courseCode = record.course?.courseCode || 'Unknown';
          if (!acc[courseCode]) {
            acc[courseCode] = { present: 0, absent: 0, records: [] };
          }
          if (record.status === 'present') acc[courseCode].present++;
          else if (record.status === 'absent') acc[courseCode].absent++;
          acc[courseCode].records.push(record);
          return acc;
        }, {});

        return `Attendance Records:\n${Object.entries(attendanceByCourse)
          .map(
            ([courseCode, stats]: [string, any]) =>
              `- ${courseCode}: ${stats.present} present, ${stats.absent} absent (Total: ${stats.records.length} records)`,
          )
          .join('\n')}`;

      case 'get_academic_summary':
        return JSON.stringify(data, null, 2);

      case 'get_student_profile':
        return `Student Profile:\n- Name: ${data.name}\n- Student ID: ${data.studentId}\n- Program: ${data.program}\n- GPA: ${data.gpa}\n- CGPA: ${data.cgpa}\n- Status: ${data.status}`;

      default:
        return JSON.stringify(data, null, 2);
    }
  }
}

