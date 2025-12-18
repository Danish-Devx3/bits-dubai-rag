import { Controller, Get, Param, UseGuards, SetMetadata } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

// Custom decorator for roles
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
    constructor(private adminService: AdminService) { }

    @Get('students')
    async getAllStudents() {
        return this.adminService.getAllStudents();
    }

    @Get('students/:id')
    async getStudentDetails(@Param('id') id: string) {
        return this.adminService.getStudentDetails(id);
    }
}
