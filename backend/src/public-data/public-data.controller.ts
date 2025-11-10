import { Controller, Get, Query, Param } from '@nestjs/common';
import { PublicDataService } from './public-data.service';

@Controller('public')
export class PublicDataController {
  constructor(private publicDataService: PublicDataService) {}

  @Get('courses/open-electives')
  async getOpenElectives(@Query('semester') semester?: string) {
    return this.publicDataService.getOpenElectives(semester);
  }

  @Get('courses/electives')
  async getElectives() {
    return this.publicDataService.getAllElectives();
  }

  @Get('courses')
  async getCourses(@Query('department') department?: string) {
    if (department) {
      return this.publicDataService.getCoursesByDepartment(department);
    }
    return this.publicDataService.getCourseCatalog();
  }

  @Get('courses/:courseCode')
  async getCourseDetails(@Param('courseCode') courseCode: string) {
    return this.publicDataService.getCourseDetails(courseCode);
  }

  @Get('timetable')
  async getTimetable(
    @Query('courseCode') courseCode?: string,
    @Query('department') department?: string,
  ) {
    return this.publicDataService.getCourseTimetable(courseCode, department);
  }

  @Get('calendar')
  async getCalendar(@Query('semester') semester?: string) {
    return this.publicDataService.getAcademicCalendar(semester);
  }

  @Get('midsem-dates')
  async getMidsemDates(@Query('semester') semester?: string) {
    return this.publicDataService.getMidsemDates(semester);
  }

  @Get('gpa-rules')
  async getGpaRules() {
    return this.publicDataService.getGpaCalculationRules();
  }

  @Get('credit-system')
  async getCreditSystem() {
    return this.publicDataService.getCreditSystemInfo();
  }

  @Get('announcements/locations')
  async getAnnouncementLocations() {
    return this.publicDataService.getAnnouncementLocations();
  }
}

