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

    try {
      const result = await this.queryService.processQuery(body.query, req.user.id);
      
      // Stream the response
      if (result.response) {
        // Send response in chunks for streaming effect
        const chunks = result.response.match(/.{1,50}/g) || [result.response];
        for (const chunk of chunks) {
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }
      }
      
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
}

