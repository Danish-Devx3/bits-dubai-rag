import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';
import { QueryClassificationService } from './query-classification.service';
import { IntentRecognitionService } from './intent-recognition.service';
import { PublicDataModule } from '../public-data/public-data.module';
import { StudentModule } from '../student/student.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [PublicDataModule, StudentModule, LlmModule, ConfigModule],
  controllers: [QueryController],
  providers: [QueryService, QueryClassificationService, IntentRecognitionService],
  exports: [IntentRecognitionService],
})
export class QueryModule { }

