import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantService implements OnModuleInit {
    private client: QdrantClient;
    private collectionName: string;

    constructor(private configService: ConfigService) {
        this.collectionName = this.configService.get<string>('QDRANT_COLLECTION') || 'bits_dubai_knowledge_base';
    }

    async onModuleInit() {
        let url = this.configService.get<string>('QDRANT_URL') || 'http://localhost:6333';
        this.client = new QdrantClient({ url });

        try {
            await this.checkConnection();
        } catch (e) {
            // Self-heal: If localhost fails on Windows, try 127.0.0.1
            if (url.includes('localhost')) {
                const fallbackUrl = url.replace('localhost', '127.0.0.1');
                console.warn(`⚠️ Qdrant connection to ${url} failed. Retrying with fallback: ${fallbackUrl}`);
                this.client = new QdrantClient({ url: fallbackUrl });
                try {
                    await this.checkConnection();
                    return;
                } catch (fallbackErr) {
                    console.error('❌ Qdrant connection failed even with fallback.');
                }
            }
            console.error('Failed to connect to Qdrant:', e);
        }
    }

    private async checkConnection() {
        const result = await this.client.getCollections();
        const exists = result.collections.some(c => c.name === this.collectionName);
        if (!exists) {
            console.warn(`⚠️ Collection '${this.collectionName}' does not exist in Qdrant.`);
        } else {
            console.log(`✅ Connected to Qdrant collection: ${this.collectionName}`);
        }
    }

    async search(embedding: number[], limit: number = 5, scoreThreshold: number = 0.5) {
        try {
            const searchResult = await this.client.search(this.collectionName, {
                vector: embedding,
                limit,
                with_payload: true,
                score_threshold: scoreThreshold,
            });

            return searchResult;
        } catch (error: any) {
            if (error.code === 'ECONNRESET' || error.message?.includes('fetch failed')) {
                console.error('❌ Qdrant connection reset. Try using 127.0.0.1 instead of localhost in .env');
            }
            console.error('Qdrant search error:', error);
            return [];
        }
    }

    async upsert(points: any[]) {
        return this.client.upsert(this.collectionName, {
            wait: true,
            points: points,
        });
    }

    async ensureCollection(vectorSize: number) {
        const result = await this.client.getCollections();
        const exists = result.collections.some(c => c.name === this.collectionName);
        if (!exists) {
            await this.client.createCollection(this.collectionName, {
                vectors: {
                    size: vectorSize,
                    distance: 'Cosine',
                },
            });
        }
    }
}
