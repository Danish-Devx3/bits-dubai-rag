import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmService } from '../llm/llm.service';
import { QdrantService } from '../qdrant/qdrant.service';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

const pdfParse = require('pdf-parse');
const pdf = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;

@Injectable()
export class IngestionService {
    private readonly logger = new Logger(IngestionService.name);
    private collectionName: string;

    constructor(
        private configService: ConfigService,
        private llmService: LlmService,
        private qdrantService: QdrantService,
    ) {
        this.collectionName = this.configService.get<string>('QDRANT_COLLECTION') || 'bits_dubai_knowledge_base';
    }

    async processFile(file: Express.Multer.File) {
        try {
            this.logger.log(`Processing file: ${file.originalname} (${file.size} bytes)`);

            let text = '';
            const lowerName = file.originalname.toLowerCase();

            if (file.mimetype === 'application/pdf' || lowerName.endsWith('.pdf')) {
                const data = await pdf(file.buffer);
                text = data.text;
            } else if (
                file.mimetype === 'text/plain' ||
                file.mimetype === 'text/markdown' ||
                file.mimetype === 'application/octet-stream' || // Sometimes markdown/text sent as octet-stream
                lowerName.endsWith('.txt') ||
                lowerName.endsWith('.md')
            ) {
                text = file.buffer.toString('utf-8');
            } else {
                throw new Error(`Unsupported file type: ${file.mimetype} (${file.originalname})`);
            }

            this.logger.log(`Extracted ${text.length} characters.`);

            // Chunk text
            const chunks = this.splitText(text, 1000, 200);
            this.logger.log(`Split into ${chunks.length} chunks.`);

            // Generate embeddings and index
            const points = [];
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                try {
                    const embedding = await this.llmService.getEmbedding(chunk);
                    points.push({
                        id: uuidv4(),
                        vector: embedding,
                        payload: {
                            content: chunk,
                            source: file.originalname,
                            chunkIndex: i,
                            uploadedAt: new Date().toISOString()
                        },
                    });
                } catch (e) {
                    this.logger.error(`Error embedding chunk ${i}:`, e);
                    // Continue with other chunks
                }
            }

            if (points.length > 0) {
                // Ensure collection exists first (using first vector size)
                await this.qdrantService.ensureCollection(points[0].vector.length);

                // Upsert in batches of 50
                const BATCH_SIZE = 50;
                for (let i = 0; i < points.length; i += BATCH_SIZE) {
                    const batch = points.slice(i, i + BATCH_SIZE);
                    await this.qdrantService.upsert(batch);
                }
                this.logger.log(`Indexed ${points.length} chunks.`);
            }

            return {
                success: true,
                filename: file.originalname,
                chunksProcessed: chunks.length,
                message: 'File processed and ingested successfully'
            };

        } catch (error) {
            this.logger.error(`Error processing file ${file.originalname}:`, error);
            throw error;
        }
    }

    // Reuse splitText logic
    private splitText(text: string, chunkSize: number, overlap: number): string[] {
        if (text.length <= chunkSize) {
            return [text];
        }

        const chunks: string[] = [];
        let startIndex = 0;

        while (startIndex < text.length) {
            let endIndex = startIndex + chunkSize;

            if (endIndex >= text.length) {
                chunks.push(text.slice(startIndex));
                break;
            }

            let breakPoint = -1;
            const searchRange = Math.min(chunkSize * 0.2, 100);

            breakPoint = text.lastIndexOf('\n\n', endIndex);
            if (breakPoint > startIndex && breakPoint > endIndex - searchRange) {
                endIndex = breakPoint;
            } else {
                breakPoint = text.lastIndexOf('\n', endIndex);
                if (breakPoint > startIndex && breakPoint > endIndex - searchRange) {
                    endIndex = breakPoint;
                } else {
                    breakPoint = text.lastIndexOf(' ', endIndex);
                    if (breakPoint > startIndex && breakPoint > endIndex - searchRange) {
                        endIndex = breakPoint;
                    }
                }
            }

            const chunk = text.slice(startIndex, endIndex).trim();
            if (chunk.length > 0) {
                chunks.push(chunk);
            }

            startIndex = endIndex - overlap;
        }

        return chunks;
    }
}
