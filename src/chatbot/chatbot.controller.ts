import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { User } from '../../core/src/common/decorators/User.decorator';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  @UseGuards(JwtAuthGuard)
  async sendMessage(@Body('message') message: string, @User() user: any) {
    const name = user.username;
    const response = await this.chatbotService.getResponse(message, name);
    return { response };
  }
}