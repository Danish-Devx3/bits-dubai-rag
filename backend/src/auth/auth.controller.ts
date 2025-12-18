import { Controller, Post, Body, Get, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('login')
  async login(
    @Body() loginDto: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto.email, loginDto.password);

    // Set HttpOnly cookie
    // For cross-origin (different ports), cookies need special handling
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: false, // Set to true when using HTTPS
      sameSite: 'lax', // 'none' requires HTTPS; 'lax' works for same-site with different ports
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Return user data AND token (for cross-origin HTTP fallback via Authorization header)
    return {
      user: result.user,
      access_token: result.access_token,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Res({ passthrough: true }) res: Response) {
    // Clear the cookie
    res.cookie('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return {
      id: req.user.id,
      studentId: req.user.studentId,
      name: req.user.name,
      email: req.user.email,
      program: req.user.program,
      gpa: req.user.gpa,
      cgpa: req.user.cgpa,
      role: req.user.role,
    };
  }
}

