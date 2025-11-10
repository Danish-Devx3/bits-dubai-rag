import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    // Check if user is a student
    const student = await this.prisma.student.findUnique({
      where: { email },
    });

    if (student && (await bcrypt.compare(password, student.password))) {
      const { password: _, ...result } = student;
      return { ...result, role: 'student' };
    }

    // Check if user is an admin
    const admin = await this.prisma.admin.findUnique({
      where: { email },
    });

    if (admin && (await bcrypt.compare(password, admin.password))) {
      const { password: _, ...result } = admin;
      return { ...result, role: 'admin' };
    }

    return null;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { 
      email: user.email, 
      sub: user.id, 
      studentId: user.studentId || user.adminId,
      role: user.role || 'student'
    };
    
    const userResponse: any = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'student',
    };

    // Add student-specific fields if student
    if (user.role === 'student' || user.studentId) {
      userResponse.studentId = user.studentId;
      userResponse.program = user.program;
      userResponse.gpa = user.gpa;
      userResponse.cgpa = user.cgpa;
    }

    // Add admin-specific fields if admin
    if (user.role === 'admin' || user.adminId) {
      userResponse.adminId = user.adminId;
    }

    return {
      access_token: this.jwtService.sign(payload),
      user: userResponse,
    };
  }

  async validateToken(payload: any) {
    // Check if user is admin or student based on role
    if (payload.role === 'admin') {
      const admin = await this.prisma.admin.findUnique({
        where: { id: payload.sub },
      });
      if (!admin) {
        throw new UnauthorizedException('Admin not found');
      }
      return { ...admin, role: 'admin' };
    } else {
      const student = await this.prisma.student.findUnique({
        where: { id: payload.sub },
      });
      if (!student) {
        throw new UnauthorizedException('User not found');
      }
      return { ...student, role: 'student' };
    }
  }
}

