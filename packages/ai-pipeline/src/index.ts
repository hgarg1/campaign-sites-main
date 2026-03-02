export * from './providers';
export * from './llm-ring';
export * from './auditor';

import { OpenAIProvider, AnthropicProvider, GoogleProvider } from './providers';
import { LLMRing } from './llm-ring';
import { Auditor } from './auditor';

/**
 * Factory for creating the AI Pipeline components
 */
export class AIPipelineFactory {
  static createBuilderRing(
    openaiKey: string,
    anthropicKey: string,
    googleKey: string
  ): LLMRing {
    const providers = [
      new OpenAIProvider(openaiKey),
      new AnthropicProvider(anthropicKey),
      new GoogleProvider(googleKey),
    ];
    return new LLMRing(providers);
  }

  static createAuditor1(anthropicKey: string): Auditor {
    return new Auditor(new AnthropicProvider(anthropicKey), 'auditor1');
  }

  static createCICDBuilderRing(
    openaiKey: string,
    anthropicKey: string,
    googleKey: string
  ): LLMRing {
    const providers = [
      new OpenAIProvider(openaiKey),
      new AnthropicProvider(anthropicKey),
      new GoogleProvider(googleKey),
    ];
    return new LLMRing(providers);
  }

  static createAuditor2(openaiKey: string): Auditor {
    return new Auditor(new OpenAIProvider(openaiKey), 'auditor2');
  }
}
