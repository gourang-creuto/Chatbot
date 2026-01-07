import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { tool } from '@langchain/core/tools';
import { StateGraph, START, END } from '@langchain/langgraph';
import { z } from 'zod';
import { QdrantClient } from '@qdrant/js-client-rest';
import {pipeline} from '@xenova/transformers';

const ChatbotState = z.object({
  message: z.string(),
  type: z.string().optional(),
  response: z.string().optional(),
});

type ChatbotStateType = z.infer<typeof ChatbotState>;

@Injectable()
export class ChatbotService implements OnModuleInit {
  private openaiModel: ChatOpenAI;
  private geminiModel: ChatGoogleGenerativeAI;
  private graph: any;
  private qdrantClient: QdrantClient;
  private embedder: any;

  constructor(private configService: ConfigService) {
    this.openaiModel = new ChatOpenAI({
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      modelName: 'gpt-4o-mini',
    });
    this.geminiModel = new ChatGoogleGenerativeAI({
      apiKey: this.configService.get<string>('GOOGLE_API_KEY'),
      model: 'gemini-2.5-flash',
    });

    this.qdrantClient = new QdrantClient({
      url: this.configService.get<string>('QDRANT_ENDPOINT'),
      apiKey: this.configService.get<string>('QDRANT_API_KEY'),
    });

    const greetingTool = tool(async ({ message }: { message: string }) => {
      const retrievedData = await this.retrieveFromQdrant('greeting');
      const prompt = PromptTemplate.fromTemplate(
        `Respond with a nice greeting using the name from the personal data: ${retrievedData}`,
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
      const retrievedData = await this.retrieveFromQdrant(message);
      const prompt = PromptTemplate.fromTemplate(
        `Here is the personal data about Gouranga Charan Mishra:${retrievedData}You are a chatbot providing information about Gouranga Charan Mishra. Answer questions in second person accurately whatever they asks. The user said: "{message}". Answer based on the data.`,
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

  async onModuleInit() {
    await this.initializeEmbedder();

    const personalData = `

    `;

    await this.storePersonalDataInQdrant(personalData);
  }

  private async initializeEmbedder() {
    this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  private async storePersonalDataInQdrant(personalData: string) {
    try {
      await this.qdrantClient.deleteCollection('personal_data');
    } catch (error) {
      console.log(error);
    }

    await this.qdrantClient.createCollection('personal_data', {
      vectors: { size: 384, distance: 'Cosine' },
    });

    const embedding = await this.embedder(personalData, { pooling: 'mean', normalize: true });

    await this.qdrantClient.upsert('personal_data', {
      points: [
        {
          id: 1,
          vector: Array.from(embedding.data as number[]),
          payload: { text: personalData },
        },
      ],
    });
  }

  private async retrieveFromQdrant(message: string): Promise<string> {
    const queryEmbedding = await this.embedder(message, { pooling: 'mean', normalize: true });
    const searchResult = await this.qdrantClient.search('personal_data', {
      vector: Array.from(queryEmbedding.data),
      limit: 1,
    });
    return (searchResult[0]?.payload as any)?.text || '';
  }

  async addPersonalData(text: string): Promise<void> {
    const points = await this.qdrantClient.scroll('personal_data', { limit: 100 });
    const maxId = points.points.length > 0 ? Math.max(...points.points.map(p => p.id as number)) : 0;
    const nextId = maxId + 1;

    const embedding = await this.embedder(text, { pooling: 'mean', normalize: true });

    await this.qdrantClient.upsert('personal_data', {
      points: [
        {
          id: nextId,
          vector: Array.from(embedding.data as number[]),
          payload: { text },
        },
      ],
    });
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
