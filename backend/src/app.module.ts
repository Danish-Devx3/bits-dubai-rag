import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { StudentModule } from './student/student.module';
import { PublicDataModule } from './public-data/public-data.module';
import { QueryModule } from './query/query.module';
import { LlmModule } from './llm/llm.module';
import { DatabaseModule } from './database/database.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    DatabaseModule,
    AuthModule,
    StudentModule,
    PublicDataModule,
    QueryModule,
    LlmModule,
  ],
})
export class AppModule {}

