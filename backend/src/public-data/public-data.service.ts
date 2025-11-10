import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicDataService {
  constructor(private prisma: PrismaService) {}

  async getOpenElectives(semester?: string) {
    return this.prisma.course.findMany({
      where: {
        type: 'open_elective',
        isOpen: true,
      },
    });
  }

  async getAllElectives() {
    return this.prisma.course.findMany({
      where: {
        type: 'elective',
        isOpen: true,
      },
    });
  }

  async getCoursesByDepartment(department: string) {
    return this.prisma.course.findMany({
      where: { department },
    });
  }

  async getCourseTimetable(courseCode?: string, department?: string) {
    const where: any = {};
    
    if (courseCode) {
      where.course = {
        courseCode,
      };
    } else if (department) {
      where.course = {
        department,
      };
    }

    return this.prisma.courseSchedule.findMany({
      where,
      include: {
        course: true,
      },
    });
  }

  async getAcademicCalendar(semester?: string) {
    const where: any = { isActive: true };
    if (semester) {
      where.semester = semester;
    }

    return this.prisma.academicCalendar.findMany({
      where,
    });
  }

  async getMidsemDates(semester?: string) {
    const events = await this.getAcademicCalendar(semester);
    return events.filter((e) => e.eventType === 'midsem');
  }

  async getCourseCatalog() {
    return this.prisma.course.findMany();
  }

  async getCourseDetails(courseCode: string) {
    return this.prisma.course.findUnique({
      where: { courseCode },
      include: {
        schedules: true,
      },
    });
  }

  // FAQ and policy data (static for now, can be moved to DB)
  getGpaCalculationRules() {
    return {
      description: 'GPA Calculation Rules at BITS Dubai',
      rules: [
        'GPA is calculated on a 10-point scale',
        'Grade points: A = 10, A- = 9, B = 8, B- = 7, C = 6, C- = 5, D = 4, F = 0',
        'GPA = Sum of (Grade Points × Credits) / Total Credits',
        'CGPA is the cumulative GPA across all semesters',
        'Minimum GPA of 4.5 is required to maintain good standing',
      ],
    };
  }

  getCreditSystemInfo() {
    return {
      description: 'Credit System at BITS Dubai',
      info: [
        'Each course has a credit value (typically 2-4 credits)',
        'Total credits required for graduation varies by program',
        'Core courses are mandatory',
        'Elective courses allow specialization',
        'Open electives can be chosen from any department',
        'Minimum credits per semester: 12, Maximum: 24',
      ],
    };
  }

  getAnnouncementLocations() {
    return {
      locations: [
        'LMS (Learning Management System) - Course announcements',
        'Student Portal - General academic announcements',
        'Email notifications - Important deadlines',
        'Academic Calendar - Scheduled events and deadlines',
        'Course handouts - Assignment and exam information',
      ],
    };
  }
}
