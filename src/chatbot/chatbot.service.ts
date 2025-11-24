import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';

@Injectable()
export class ChatbotService {
  // private model: ChatOpenAI;
  private model: ChatGoogleGenerativeAI;
  private prompt: PromptTemplate;

  constructor(private configService: ConfigService) {
    // this.model = new ChatOpenAI({
    //   openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
    //   modelName: 'gpt-4o-mini',
    // });
    this.model = new ChatGoogleGenerativeAI({
      apiKey: this.configService.get<string>('GOOGLE_API_KEY'),
      model: 'gemini-2.5-flash',
    });

    this.prompt = PromptTemplate.fromTemplate(
      'You are a friendly chatbot. The user said: "{message}". The user\'s name is {name}. If it\'s a greeting like hi, hello, hey, hii, respond with "hii {name}". Otherwise, say something friendly.'
    );
  }

  async getResponse(message: string, name: string): Promise<string> {
    try {
      const formattedPrompt = await this.prompt.format({ message, name });
      const response = await this.model.invoke(formattedPrompt);
      return (response.content as string).trim();
    } catch (error) {
      console.error('Error calling Gemini:', error);
      return 'Sorry, I\'m having trouble responding right now.';
    }
  }
}