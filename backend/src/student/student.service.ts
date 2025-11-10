import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService) {}

  async getStudentGrades(studentId: string, semester?: string) {
    const where: any = { studentId };
    if (semester) {
      where.semester = semester;
    }

    return this.prisma.grade.findMany({
      where,
      include: {
        course: true,
      },
      orderBy: {
        semester: 'desc',
      },
    });
  }

  async getStudentPayments(studentId: string, semester?: string) {
    const where: any = { studentId };
    if (semester) {
      where.semester = semester;
    }

    return this.prisma.payment.findMany({
      where,
      orderBy: {
        dueDate: 'desc',
      },
    });
  }

  async getEnrolledCourses(studentId: string, semester?: string) {
    const where: any = { studentId };
    if (semester) {
      where.semester = semester;
    }

    return this.prisma.enrollment.findMany({
      where,
      include: {
        course: true,
      },
      orderBy: {
        semester: 'desc',
      },
    });
  }

  async getAttendance(studentId: string, courseId?: string) {
    const where: any = { studentId };
    if (courseId) {
      where.courseId = courseId;
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        course: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async getStudentProfile(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new ForbiddenException('Student not found');
    }

    return {
      id: student.id,
      studentId: student.studentId,
      name: student.name,
      email: student.email,
      program: student.program,
      gpa: student.gpa,
      cgpa: student.cgpa,
      status: student.status,
    };
  }

  async getAcademicSummary(studentId: string) {
    const [grades, enrollments, payments] = await Promise.all([
      this.getStudentGrades(studentId),
      this.getEnrolledCourses(studentId),
      this.getStudentPayments(studentId),
    ]);

    return {
      grades: grades.map((g) => ({
        courseCode: g.course.courseCode,
        courseName: g.course.courseName,
        semester: g.semester,
        midSemMarks: g.midSemMarks,
        midSemGrade: g.midSemGrade,
        finalMarks: g.finalMarks,
        finalGrade: g.finalGrade,
        totalMarks: g.totalMarks,
        gpa: g.gpa,
        status: g.status,
      })),
      enrollments: enrollments.map((e) => ({
        courseCode: e.course.courseCode,
        courseName: e.course.courseName,
        credits: e.course.credits,
        semester: e.semester,
        status: e.status,
      })),
      payments: payments.map((p) => ({
        semester: p.semester,
        amount: p.amount,
        status: p.status,
        dueDate: p.dueDate,
        paidDate: p.paidDate,
        description: p.description,
      })),
    };
  }
}
