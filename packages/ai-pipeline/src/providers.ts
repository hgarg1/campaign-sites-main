import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface LLMProvider {
  name: 'openai' | 'anthropic' | 'google';
  generate(prompt: string, context?: any): Promise<string>;
}

export class OpenAIProvider implements LLMProvider {
  name: 'openai' = 'openai';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generate(prompt: string, context?: any): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert campaign website builder.',
        },
        { role: 'user', content: prompt },
      ],
    });

    return response.choices[0]?.message?.content || '';
  }
}

export class AnthropicProvider implements LLMProvider {
  name: 'anthropic' = 'anthropic';
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generate(prompt: string, context?: any): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    return content.type === 'text' ? content.text : '';
  }
}

export class GoogleProvider implements LLMProvider {
  name: 'google' = 'google';
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generate(prompt: string, context?: any): Promise<string> {
    const model = this.client.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }
}
