import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Request
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateChatSessionDto, UpdateChatSessionDto, AddMessageDto } from './dto/chat.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard) // All chat operations require authentication
export class ChatController {
    constructor(private chatService: ChatService) { }

    /**
     * Get all chat sessions for the authenticated user
     * Each user only sees their own conversations
     */
    @Get('sessions')
    async getSessions(@Request() req) {
        const userId = req.user.id;
        const role = req.user.role || 'student';
        return this.chatService.getSessions(userId, role);
    }

    /**
     * Get a specific chat session by ID
     * Validates that the user owns this session
     */
    @Get('sessions/:id')
    async getSession(@Param('id') id: string, @Request() req) {
        const userId = req.user.id;
        const role = req.user.role || 'student';
        return this.chatService.getSession(id, userId, role);
    }

    /**
     * Create a new chat session
     */
    @Post('sessions')
    async createSession(@Body() dto: CreateChatSessionDto, @Request() req) {
        const userId = req.user.id;
        const role = req.user.role || 'student';
        return this.chatService.createSession(dto, userId, role);
    }

    /**
     * Update a chat session (e.g., rename title)
     */
    @Put('sessions/:id')
    async updateSession(
        @Param('id') id: string,
        @Body() dto: UpdateChatSessionDto,
        @Request() req
    ) {
        const userId = req.user.id;
        const role = req.user.role || 'student';
        return this.chatService.updateSession(id, dto, userId, role);
    }

    /**
     * Add a message to a chat session
     */
    @Post('sessions/:id/messages')
    async addMessage(
        @Param('id') id: string,
        @Body() dto: AddMessageDto,
        @Request() req
    ) {
        const userId = req.user.id;
        const role = req.user.role || 'student';
        return this.chatService.addMessage(id, dto, userId, role);
    }

    /**
     * Delete a specific chat session
     */
    @Delete('sessions/:id')
    async deleteSession(@Param('id') id: string, @Request() req) {
        const userId = req.user.id;
        const role = req.user.role || 'student';
        return this.chatService.deleteSession(id, userId, role);
    }

    /**
     * Delete all chat sessions for the authenticated user
     * Useful for privacy/cleanup purposes
     */
    @Delete('sessions')
    async deleteAllSessions(@Request() req) {
        const userId = req.user.id;
        const role = req.user.role || 'student';
        return this.chatService.deleteAllSessions(userId, role);
    }
}
