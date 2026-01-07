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

  @Post('add-data')
  async addData(@Body('text') text: string) {
    await this.chatbotService.addPersonalData(text);
    return { message: 'Data added successfully' };
  }
}