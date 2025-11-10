import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LlmService } from './llm.service';
import { LlmWithToolsService } from './llm-with-tools.service';
import { McpModule } from '../mcp/mcp.module';

@Module({
  imports: [HttpModule, McpModule],
  providers: [LlmService, LlmWithToolsService],
  exports: [LlmService, LlmWithToolsService],
})
export class LlmModule {}

