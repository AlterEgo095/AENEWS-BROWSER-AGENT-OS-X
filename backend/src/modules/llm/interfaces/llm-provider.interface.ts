export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  responseFormat?: 'text' | 'json';
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

export interface ILLMProvider {
  readonly name: string;
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
  chatWithSystem(
    systemPrompt: string,
    userMessage: string,
    options?: LLMOptions,
  ): Promise<LLMResponse>;
  isAvailable(): boolean;
}
