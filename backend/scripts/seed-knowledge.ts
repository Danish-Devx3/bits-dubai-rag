import { QdrantClient } from '@qdrant/js-client-rest';
import { Ollama } from 'ollama';
import * as fs from 'fs';
import * as path from 'path';
const pdfParse = require('pdf-parse');
const pdf = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'bits_dubai_knowledge_base';
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://ollama:11434';
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'bge-m3';
const DATA_DIR = path.resolve(__dirname, '../../dataforseed');

// Initialize clients
const qdrant = new QdrantClient({ url: QDRANT_URL });
const ollama = new Ollama({ host: OLLAMA_URL });

async function main() {
    console.log('🚀 Starting Knowledge Base Seeding...');
    console.log(`📂 Data Directory: ${DATA_DIR}`);
    console.log(`🤖 Embedding Model: ${EMBEDDING_MODEL}`);
    console.log(`🗄️  Qdrant Collection: ${QDRANT_COLLECTION}`);

    // 1. Check if data directory exists
    console.log('Type of pdf:', typeof pdf);
    console.log('pdf export:', pdf);
    if (!fs.existsSync(DATA_DIR)) {
        console.error(`❌ Data directory not found: ${DATA_DIR}`);
        process.exit(1);
    }

    // 2. Get list of PDF files
    const files = fs.readdirSync(DATA_DIR).filter(file => file.toLowerCase().endsWith('.pdf'));
    console.log(`Found ${files.length} PDF files.`);

    // 3. Process each file
    for (const file of files) {
        const filePath = path.join(DATA_DIR, file);
        console.log(`\n📄 Processing: ${file}`);

        try {
            // Extract text
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdf(dataBuffer);
            const text = pdfData.text;
            const metadata = {
                source: file,
                totalPages: pdfData.numpages,
                info: pdfData.info,
            };

            console.log(`   - Extracted ${text.length} characters.`);

            // Chunk text
            const chunks = splitText(text, 1000, 200);
            console.log(`   - Split into ${chunks.length} chunks.`);

            // Generate embeddings and index
            const points = [];
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];

                // Generate embedding
                const embeddingResponse = await ollama.embeddings({
                    model: EMBEDDING_MODEL,
                    prompt: chunk,
                });

                points.push({
                    id: uuidv4(),
                    vector: embeddingResponse.embedding,
                    payload: {
                        content: chunk,
                        source: file,
                        chunkIndex: i,
                        ...metadata
                    },
                });

                // Batch logging
                if ((i + 1) % 10 === 0) {
                    process.stdout.write('.');
                }
            }
            process.stdout.write('\n');

            // 4. Create collection if not exists (using first embedding to determine size)
            if (points.length > 0) {
                const vectorSize = points[0].vector.length;
                await ensureCollection(vectorSize);
            }

            // 5. Upsert to Qdrant
            if (points.length > 0) {
                // Upsert in batches of 50 to avoid hitting limits if any
                const BATCH_SIZE = 50;
                for (let i = 0; i < points.length; i += BATCH_SIZE) {
                    const batch = points.slice(i, i + BATCH_SIZE);
                    await qdrant.upsert(QDRANT_COLLECTION, {
                        wait: true,
                        points: batch,
                    });
                }
                console.log(`   ✅ Indexed ${points.length} chunks.`);
            }

        } catch (error) {
            console.error(`   ❌ Error processing ${file}:`, error.message);
        }
    }

    console.log('\n✨ Seeding completed successfully!');
}

// Helper: Ensure collection exists
async function ensureCollection(vectorSize: number) {
    try {
        const collections = await qdrant.getCollections();
        const exists = collections.collections.some(c => c.name === QDRANT_COLLECTION);

        if (!exists) {
            console.log(`   header: Creating collection '${QDRANT_COLLECTION}' with vector size ${vectorSize}...`);
            await qdrant.createCollection(QDRANT_COLLECTION, {
                vectors: {
                    size: vectorSize,
                    distance: 'Cosine',
                },
            });
        }
    } catch (error) {
        console.error('   ❌ Error checking/creating collection:', error);
    }
}

// Helper: Recursive Text Splitter (simplified)
function splitText(text: string, chunkSize: number, overlap: number): string[] {
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

        // Try to find a good break point (newline, space)
        // Checking from endIndex backwards
        let breakPoint = -1;
        const searchRange = Math.min(chunkSize * 0.2, 100); // Look back 20% or 100 chars

        // Check for double newline
        breakPoint = text.lastIndexOf('\n\n', endIndex);
        if (breakPoint > startIndex && breakPoint > endIndex - searchRange) {
            endIndex = breakPoint;
        } else {
            // Check for newline
            breakPoint = text.lastIndexOf('\n', endIndex);
            if (breakPoint > startIndex && breakPoint > endIndex - searchRange) {
                endIndex = breakPoint;
            } else {
                // Check for space
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

main().catch(console.error);
