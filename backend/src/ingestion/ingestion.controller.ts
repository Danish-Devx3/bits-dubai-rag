import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    Request,
    BadRequestException,
    UnauthorizedException,
    Logger
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IngestionService } from './ingestion.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Express } from 'express';

@Controller('ingestion')
export class IngestionController {
    private readonly logger = new Logger(IngestionController.name);
    constructor(private readonly ingestionService: IngestionService) { }

    @Post('upload')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Request() req
    ) {
        // Debug logging
        this.logger.log(`Upload request from user: ${JSON.stringify(req.user)}`);

        // Check if user is admin
        if (req.user.role !== 'admin') {
            throw new UnauthorizedException('Only admins can upload documents');
        }

        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        return this.ingestionService.processFile(file);
    }
}
