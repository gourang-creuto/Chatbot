import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { tool } from '@langchain/core/tools';
import { StateGraph, START, END } from '@langchain/langgraph';
import { z } from 'zod';

const ChatbotState = z.object({
  message: z.string(),
  type: z.string().optional(),
  response: z.string().optional(),
});

type ChatbotStateType = z.infer<typeof ChatbotState>;

@Injectable()
export class ChatbotService {
  private openaiModel: ChatOpenAI;
  private geminiModel: ChatGoogleGenerativeAI;
  private graph: any;

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

    const greetingTool = tool(async ({ message }: { message: string }) => {
      const prompt = PromptTemplate.fromTemplate(
        `Respond with a nice greeting using the name from the personal data: ${personalData}`,
      );
      const result = await prompt.pipe(this.geminiModel).invoke({});
      return result.content as string;
    }, {
      name: 'greeting_responder',
      description: 'Use this tool to respond to greeting messages.',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
        required: ['message'],
      },
    });

    const personalTool = tool(async ({ message }: { message: string }) => {
      const prompt = PromptTemplate.fromTemplate(
        `Here is the personal data about Gouranga Charan Mishra:${personalData}You are a chatbot providing information about Gouranga Charan Mishra. Answer questions in second person accurately whatever they asks. The user said: "{message}". Answer based on the data.`,
      );
      const result = await prompt.pipe(this.openaiModel).invoke({ message });
      return result.content as string;
    }, {
      name: 'personal_data_responder',
      description: 'Use this tool to respond to questions about personal data.',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
        required: ['message'],
      },
    });

    const classifierNode = async (state: ChatbotStateType) => {
      const prompt = PromptTemplate.fromTemplate(
        `Classify the following message as 'greeting' or 'personal'. Respond with only 'greeting' or 'personal'. Message: {message}`,
      );
      const classifierChain = prompt.pipe(this.openaiModel);
      const classification = await classifierChain.invoke({ message: state.message });
      return { type: (classification.content as string).trim().toLowerCase() };
    };

    const greetingNode = async (state: ChatbotStateType) => {
      const response = await greetingTool.invoke({ message: state.message });
      return { response: response.trim() };
    };

    const personalNode = async (state: ChatbotStateType) => {
      const response = await personalTool.invoke({ message: state.message });
      return { response: response.trim() };
    };

    const workflow = new StateGraph(ChatbotState)
      .addNode('classifier', classifierNode)
      .addNode('greeting_handler', greetingNode)
      .addNode('personal_handler', personalNode)
      .addEdge(START, 'classifier')
      .addConditionalEdges('classifier', (state) => state.type!, {
        greeting: 'greeting_handler',
        personal: 'personal_handler',
      })
      .addEdge('greeting_handler', END)
      .addEdge('personal_handler', END);

    this.graph = workflow.compile();
  }

  async getResponse(message: string): Promise<string> {
    try {
      const result = await this.graph.invoke({ message });
      return result.response!;
    } catch (error) {
      console.error('Error calling AI model:', error);
      return "Sorry, I'm having trouble responding right now.";
    }
  }
}
