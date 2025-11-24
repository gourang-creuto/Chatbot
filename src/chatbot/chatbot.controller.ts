import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: any;
}

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  @UseGuards(JwtAuthGuard)
  async sendMessage(@Body('message') message: string, @Req() request: AuthenticatedRequest) {
    const user = request.user;
    const name = user.username;
    const response = await this.chatbotService.getResponse(message, name);
    return { response };
  }
}