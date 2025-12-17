import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatSessionDto, UpdateChatSessionDto, AddMessageDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get all chat sessions for a specific user
     * This ensures complete isolation - users can only see their own chats
     */
    async getSessions(userId: string, role: 'student' | 'admin') {
        const whereClause = role === 'student'
            ? { studentId: userId, userRole: 'student' }
            : { adminId: userId, userRole: 'admin' };

        const sessions = await this.prisma.chatSession.findMany({
            where: whereClause,
            include: {
                messages: {
                    orderBy: { timestamp: 'asc' }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return sessions;
    }

    /**
     * Get a single chat session - validates ownership
     */
    async getSession(sessionId: string, userId: string, role: 'student' | 'admin') {
        const session = await this.prisma.chatSession.findUnique({
            where: { id: sessionId },
            include: {
                messages: {
                    orderBy: { timestamp: 'asc' }
                }
            }
        });

        if (!session) {
            throw new NotFoundException('Chat session not found');
        }

        // Security check: Verify ownership
        const isOwner = role === 'student'
            ? session.studentId === userId
            : session.adminId === userId;

        if (!isOwner) {
            throw new ForbiddenException('You do not have access to this chat session');
        }

        return session;
    }

    /**
     * Create a new chat session for a user
     */
    async createSession(dto: CreateChatSessionDto, userId: string, role: 'student' | 'admin') {
        const sessionData: any = {
            title: dto.title,
            userRole: role,
        };

        // Link to the correct user type
        if (role === 'student') {
            sessionData.studentId = userId;
        } else {
            sessionData.adminId = userId;
        }

        // Create session with initial messages if provided
        const session = await this.prisma.chatSession.create({
            data: {
                ...sessionData,
                messages: dto.messages ? {
                    create: dto.messages.map(msg => ({
                        role: msg.role,
                        content: msg.content,
                        hasError: msg.hasError,
                        recommendations: msg.recommendations || [],
                        metadata: msg.metadata || null,
                    }))
                } : undefined
            },
            include: {
                messages: {
                    orderBy: { timestamp: 'asc' }
                }
            }
        });

        return session;
    }

    /**
     * Update a chat session (e.g., title) - validates ownership
     */
    async updateSession(sessionId: string, dto: UpdateChatSessionDto, userId: string, role: 'student' | 'admin') {
        // First, verify ownership
        await this.getSession(sessionId, userId, role);

        const session = await this.prisma.chatSession.update({
            where: { id: sessionId },
            data: {
                title: dto.title,
                updatedAt: new Date()
            },
            include: {
                messages: {
                    orderBy: { timestamp: 'asc' }
                }
            }
        });

        return session;
    }

    /**
     * Add a message to a chat session - validates ownership
     */
    async addMessage(sessionId: string, dto: AddMessageDto, userId: string, role: 'student' | 'admin') {
        // Verify ownership
        await this.getSession(sessionId, userId, role);

        // Create the message
        const message = await this.prisma.chatMessage.create({
            data: {
                sessionId: sessionId,
                role: dto.role,
                content: dto.content,
                hasError: dto.hasError,
                recommendations: dto.recommendations || [],
                metadata: dto.metadata || null,
            }
        });

        // Update session's updatedAt timestamp
        await this.prisma.chatSession.update({
            where: { id: sessionId },
            data: { updatedAt: new Date() }
        });

        return message;
    }

    /**
     * Delete a chat session - validates ownership
     */
    async deleteSession(sessionId: string, userId: string, role: 'student' | 'admin') {
        // Verify ownership first
        await this.getSession(sessionId, userId, role);

        // Delete the session (messages will be cascade deleted)
        await this.prisma.chatSession.delete({
            where: { id: sessionId }
        });

        return { success: true, message: 'Chat session deleted' };
    }

    /**
     * Delete all chat sessions for a user (useful for account cleanup or privacy)
     */
    async deleteAllSessions(userId: string, role: 'student' | 'admin') {
        const whereClause = role === 'student'
            ? { studentId: userId, userRole: 'student' }
            : { adminId: userId, userRole: 'admin' };

        const result = await this.prisma.chatSession.deleteMany({
            where: whereClause
        });

        return { success: true, deletedCount: result.count };
    }
}
