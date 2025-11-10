import { Module } from '@nestjs/common';
import { McpToolsService } from './mcp-tools.service';
import { StudentModule } from '../student/student.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [StudentModule, PrismaModule],
  providers: [McpToolsService],
  exports: [McpToolsService],
})
export class McpModule {}

