import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';

@Injectable()
export class ChatbotService {
  private openaiModel: ChatOpenAI;
  private geminiModel: ChatGoogleGenerativeAI;
  private personalDataPrompt: PromptTemplate;
  private greetingPrompt: PromptTemplate;
  private firstLetter: string;

  constructor(private configService: ConfigService) {
    this.openaiModel = new ChatOpenAI({
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      modelName: 'gpt-4o-mini',
    });
    this.geminiModel = new ChatGoogleGenerativeAI({
      apiKey: this.configService.get<string>('GOOGLE_API_KEY'),
      model: 'gemini-2.5-flash',
    });

    const personalData = `
Languages: English, Hindi, Odia.
Certifications: Generative AI, Backend, Frontend FullStack Development from Coding Ninjas.
Higher Secondary Education MAR 2017 - MAR 2019
Aurobindo Institute for Integral Education
Started learning Basic HTML, CSS and SQL.
Bachelor of Technology in Computer Science
Templecity Institute of Technology and Engineering
Done academic major project on Garbage Management System.
Gave seminar on "Quantum Computers”.

BuyBusy, E - Commerce website
Built and optimized a e-commerce system, with HTML, CSS, React.js, Node.js, MongoDB.
Coordinated role-based validation for both user and admin, ensuring features like subscription with
industry standards.
Provided realtime notification system.
GEMS MEDIA, A Music Distribution platfrom
Developed of an advanced music distribution system, achieving a best user experience in operational
efficiency.
Developed both responsive frontend and secure backend modules with mernstack.
Implemented customer maintenance strategies.
Recent computer science graduate with a position for developing scalable web applications and working
across the full stack. I am looking for to join in a reputed organization along with a position to constantly
learn, contribute and grow along with the organization.
name: GOURANGA CHARAN MISHRA
Phone : +91-7438888672
Mail: gourangcharanmishra2001@gmail.com
LinkedIn: https://www.linkedin.com/in/gc-mishra
Date of Birth: 31-12-2001
    `;

    this.personalDataPrompt = PromptTemplate.fromTemplate(
      `Here is the personal data about Gouranga Charan Mishra:${personalData}You are a chatbot providing information about Gouranga Charan Mishra. Answer questions in second person accurately whatever they asks. The user said: "{message}". Answer based on the data.`,
    );

    this.greetingPrompt = PromptTemplate.fromTemplate(
      `Respond with a nice greeting using the name from the personal data: ${personalData}`,
    );
  }

  private isGreeting(message: string): boolean {
    const greetings = [
      'hello',
      'hi',
      'hey',
      'good morning',
      'good afternoon',
      'good evening',
      'greetings',
    ];
    const lowerMessage = message.toLowerCase().trim();
    return greetings.some((greeting) => lowerMessage.includes(greeting));
  }

  async getResponse(message: string): Promise<string> {
    try {
      if (this.isGreeting(message)) {
        const formattedPrompt = await this.greetingPrompt.format({});
        const response = await this.geminiModel.invoke(formattedPrompt);
        return (response.content as string).trim();
      } else {
        const formattedPrompt = await this.personalDataPrompt.format({
          message,
        });
        const response = await this.openaiModel.invoke(formattedPrompt);
        return (response.content as string).trim();
      }
    } catch (error) {
      console.error('Error calling AI model:', error);
      return "Sorry, I'm having trouble responding right now.";
    }
  }
}
