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
        this.client = new QdrantClient({
            url: this.configService.get<string>('QDRANT_URL') || 'http://localhost:6333',
        });

        // Check if collection exists, if not maybe log a warning?
        // We assume ingestion happens elsewhere or collection is pre-created.
        try {
            const result = await this.client.getCollections();
            const exists = result.collections.some(c => c.name === this.collectionName);
            if (!exists) {
                console.warn(`⚠️ Collection '${this.collectionName}' does not exist in Qdrant. Retrieval will fail until data is ingested.`);
            } else {
                console.log(`✅ Connected to Qdrant collection: ${this.collectionName}`);
            }
        } catch (e) {
            console.error('Failed to connect to Qdrant:', e);
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
        } catch (error) {
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
