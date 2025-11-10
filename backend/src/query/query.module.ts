import { Module } from '@nestjs/common';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';
import { QueryClassificationService } from './query-classification.service';
import { PublicDataModule } from '../public-data/public-data.module';
import { StudentModule } from '../student/student.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [PublicDataModule, StudentModule, LlmModule],
  controllers: [QueryController],
  providers: [QueryService, QueryClassificationService],
})
export class QueryModule {}

