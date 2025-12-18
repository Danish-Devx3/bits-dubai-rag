import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    async getAllStudents() {
        return this.prisma.student.findMany({
            select: {
                id: true,
                studentId: true,
                name: true,
                email: true,
                program: true,
                status: true,
                campus: true,
            },
            orderBy: {
                name: 'asc',
            },
        });
    }

    async getStudentDetails(id: string) {
        const student = await this.prisma.student.findUnique({
            where: { id },
            include: {
                grades: {
                    include: {
                        course: true,
                    },
                    orderBy: {
                        semester: 'desc',
                    },
                },
                enrollments: {
                    include: {
                        course: true,
                    },
                },
                payments: {
                    orderBy: {
                        dueDate: 'desc',
                    },
                },
                attendances: {
                    include: {
                        course: true,
                    },
                    orderBy: {
                        date: 'desc',
                    },
                },
            },
        });

        if (!student) {
            throw new NotFoundException(`Student with ID ${id} not found`);
        }

        return student;
    }
}
