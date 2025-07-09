import OpenAI from 'openai';

/**
 * Centralized OpenAI Client Service
 * Eliminates duplication across chat/route.ts and ai-categorize/route.ts
 */
class OpenAIClientService {
  private static instance: OpenAIClientService;
  private client: OpenAI | null = null;
  private apiKeyValid = true;
  private initializationAttempted = false;

  private constructor() {}

  public static getInstance(): OpenAIClientService {
    if (!OpenAIClientService.instance) {
      OpenAIClientService.instance = new OpenAIClientService();
    }
    return OpenAIClientService.instance;
  }

  /**
   * Get OpenAI client instance with proper error handling
   */
  public getClient(): OpenAI | null {
    if (!this.apiKeyValid) {
      return null; // Don't try to create client if we know key is invalid
    }
    
    if (!this.client && !this.initializationAttempted) {
      this.initializationAttempted = true;
      this.client = this.initializeClient();
    }
    
    return this.client;
  }

  /**
   * Initialize OpenAI client with validation
   */
  private initializeClient(): OpenAI | null {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('OPENAI_API_KEY environment variable is missing');
      this.apiKeyValid = false;
      return null;
    }
    
    // Basic validation of API key format
    if (!apiKey.startsWith('sk-')) {
      console.warn('OPENAI_API_KEY appears to be invalid (should start with sk-)');
      this.apiKeyValid = false;
      return null;
    }
    
    try {
      return new OpenAI({ apiKey });
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
      this.apiKeyValid = false;
      return null;
    }
  }

  /**
   * Check if API key is valid
   */
  public isApiKeyValid(): boolean {
    return this.apiKeyValid;
  }

  /**
   * Mark API key as invalid (e.g., after 401 error)
   */
  public markApiKeyInvalid(): void {
    this.apiKeyValid = false;
    this.client = null;
  }

  /**
   * Reset client (for testing or key rotation)
   */
  public reset(): void {
    this.client = null;
    this.apiKeyValid = true;
    this.initializationAttempted = false;
  }

  /**
   * Create chat completion with timeout and error handling
   */
  public async createChatCompletion(
    messages: any[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      timeout?: number;
    } = {}
  ): Promise<{ success: boolean; response?: string; error?: string }> {
    const client = this.getClient();
    
    if (!client) {
      return {
        success: false,
        error: 'OpenAI client not available'
      };
    }

    const {
      model = 'gpt-3.5-turbo',
      maxTokens = 500,
      temperature = 0.7,
      timeout = 10000
    } = options;

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const completion = await client.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      return {
        success: true,
        response
      };

    } catch (error: any) {
      console.error('OpenAI API error:', error);
      
      // Handle timeout errors
      if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'timeout'
        };
      }
      
      // If it's an API key error, mark as invalid
      if (error.code === 'invalid_api_key' || error.status === 401) {
        this.markApiKeyInvalid();
        return {
          success: false,
          error: 'invalid_api_key'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const openAIClient = OpenAIClientService.getInstance();

// Export class for testing
export { OpenAIClientService }; 