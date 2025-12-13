import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { LlmModule } from '../llm/llm.module';
import { QdrantModule } from '../qdrant/qdrant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [LlmModule, QdrantModule, AuthModule],
  controllers: [IngestionController],
  providers: [IngestionService]
})
export class IngestionModule { }
