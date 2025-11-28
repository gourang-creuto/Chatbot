import { Controller, Post, Body } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  async sendMessage(
    @Body('message') message: string,
  ) {
    const response = await this.chatbotService.getResponse(message);
    return { response };
  }
}