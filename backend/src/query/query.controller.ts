import { Controller, Post, Body, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { QueryService } from './query.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('query')
@UseGuards(JwtAuthGuard) // All queries require authentication
export class QueryController {
  constructor(private queryService: QueryService) {}

  @Post()
  async query(@Body() body: { query: string }, @Request() req) {
    return this.queryService.processQuery(body.query, req.user.id);
  }

  @Post('stream')
  async queryStream(
    @Body() body: { query: string },
    @Request() req,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    try {
      // Stream response chunks in real-time
      for await (const chunk of this.queryService.processQueryStream(
        body.query,
        req.user.id,
      )) {
        // Send each chunk as it arrives
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      
      // Signal completion
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      console.error('Stream error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }
}

