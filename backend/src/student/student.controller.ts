import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { StudentService } from './student.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('student')
@UseGuards(JwtAuthGuard)
export class StudentController {
  constructor(private studentService: StudentService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    return this.studentService.getStudentProfile(req.user.id);
  }

  @Get('grades')
  async getGrades(@Request() req, @Query('semester') semester?: string) {
    return this.studentService.getStudentGrades(req.user.id, semester);
  }

  @Get('payments')
  async getPayments(@Request() req, @Query('semester') semester?: string) {
    return this.studentService.getStudentPayments(req.user.id, semester);
  }

  @Get('courses')
  async getEnrolledCourses(@Request() req, @Query('semester') semester?: string) {
    return this.studentService.getEnrolledCourses(req.user.id, semester);
  }

  @Get('attendance')
  async getAttendance(
    @Request() req,
    @Query('courseId') courseId?: string,
    @Query('semester') semester?: string,
  ) {
    return this.studentService.getAttendance(req.user.id, courseId);
  }

  @Get('summary')
  async getAcademicSummary(@Request() req) {
    return this.studentService.getAcademicSummary(req.user.id);
  }
}

