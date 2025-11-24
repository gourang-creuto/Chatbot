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
GOURANGA CHARAN MISHRA
Phone : +91-7438888672
Mail: gourangcharanmishra2001@gmail.com
LinkedIn: https://www.linkedin.com/in/gc-mishra

TECHNICAL SKILLS

PROJECTS

EDUCATION

ADDITIONAL INFORMATION
HTML
CSS
Javascript

React.js
Node.js
Express.js

MongoDB
PostgreSQL
Redux Toolkit

Date of Birth: 31-12-2001
    `;

    this.prompt = PromptTemplate.fromTemplate(
      `Here is the personal data about Gouranga Charan Mishra:\n${personalData}\n\nYou are a chatbot providing information about Gouranga Charan Mishra. Answer questions in second person accurately whatever they asks. The user said: "{message}". The user name is {name}. If it's a greeting like nicely respond with "appropriate word {name}". Otherwise, answer based on the data.`
    );
  }

  async getResponse(message: string, name: string): Promise<string> {
    try {
      const formattedPrompt = await this.prompt.format({ message, name });
      const response = await this.model.invoke(formattedPrompt);
      return (response.content as string).trim();
    } catch (error) {
      console.error('Error calling Gemini:', error);
      return "Sorry, I'm having trouble responding right now.";
    }
  }
}
