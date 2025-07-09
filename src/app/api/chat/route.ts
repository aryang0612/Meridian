import { NextRequest, NextResponse } from 'next/server';
import { openAIClient } from '../../../lib/openaiClient';

// Fallback responses for when OpenAI is not available
const fallbackResponses = {
  'upload': 'To upload a file, click the "Upload Bank Statement" button and select your CSV or PDF file from RBC, TD, BMO, Scotia, or CIBC. Our AI will automatically categorize your transactions.',
  'categorization': 'Our AI categorizes transactions with 95%+ accuracy using machine learning. You can review and correct any categorizations, and the system learns from your corrections.',
  'export': 'You can export your categorized transactions to Xero, QuickBooks, Sage 50, or CSV format. Go to the Export tab after processing your file.',
  'security': 'Meridian AI uses bank-level security with SOC 2 Type II compliance. Your data is encrypted in transit and at rest, and we never store your banking credentials.',
  'formats': 'We support CSV and PDF bank statements from major Canadian banks: RBC, TD Canada Trust, BMO, Scotiabank, and CIBC.',
  'default': 'I\'m here to help with Meridian AI! You can ask about file uploads, AI categorization, exports to accounting software, security, or supported bank formats.'
};

function getFallbackResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('upload') || lowerMessage.includes('file')) {
    return fallbackResponses.upload;
  }
  if (lowerMessage.includes('categoriz') || lowerMessage.includes('ai') || lowerMessage.includes('category')) {
    return fallbackResponses.categorization;
  }
  if (lowerMessage.includes('export') || lowerMessage.includes('quickbooks') || lowerMessage.includes('xero')) {
    return fallbackResponses.export;
  }
  if (lowerMessage.includes('security') || lowerMessage.includes('safe') || lowerMessage.includes('secure')) {
    return fallbackResponses.security;
  }
  if (lowerMessage.includes('format') || lowerMessage.includes('bank') || lowerMessage.includes('csv') || lowerMessage.includes('pdf')) {
    return fallbackResponses.formats;
  }
  
  return fallbackResponses.default;
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Try to get OpenAI client
    const client = openAIClient.getClient();
    
    if (!client) {
      // Use fallback response when OpenAI is not available
      const fallbackResponse = getFallbackResponse(message);
      
      return NextResponse.json({ 
        response: fallbackResponse,
        conversationHistory: [...conversationHistory, 
          { role: 'user', content: message },
          { role: 'assistant', content: fallbackResponse }
        ],
        note: 'Using fallback response - OpenAI API not available'
      });
    }

    // System prompt to make ChatGPT act as a Meridian AI support assistant
    const systemPrompt = {
      role: 'system' as const,
      content: `You are a helpful support assistant for Meridian AI, a Canadian bookkeeping application that processes bank statements with AI categorization. 

Key features of Meridian AI:
- Processes CSV bank statements from major Canadian banks (RBC, TD, BMO, Scotia, CIBC)
- Uses AI to categorize transactions with 95%+ accuracy
- Exports to Xero, QuickBooks, Sage 50, and CSV formats
- CRA-compliant with proper chart of accounts mapping
- Bank-level security and SOC 2 Type II compliance
- Supports business and personal transactions

Common user questions:
- How to upload bank statements
- Troubleshooting file format issues
- Understanding AI categorization
- Exporting to accounting software
- Security and compliance questions
- Supported bank formats

Be helpful, professional, and focus on Meridian AI features. If users ask about topics unrelated to bookkeeping, accounting, or Meridian AI, politely redirect them back to how you can help with their bookkeeping needs.`
    };

    // Prepare messages for OpenAI
    const messages = [
      systemPrompt,
      ...conversationHistory,
      { role: 'user' as const, content: message }
    ];

    // Use centralized OpenAI client
    const result = await openAIClient.createChatCompletion(messages, {
      model: 'gpt-3.5-turbo',
      maxTokens: 500,
      temperature: 0.7,
      timeout: 10000
    });

    if (result.success && result.response) {
      return NextResponse.json({ 
        response: result.response,
        conversationHistory: [...conversationHistory, 
          { role: 'user', content: message },
          { role: 'assistant', content: result.response }
        ]
      });
    } else {
      // Handle specific error cases
      let fallbackResponse: string;
      
      if (result.error === 'timeout') {
        fallbackResponse = "I'm taking a bit longer than usual to respond. Please try again in a moment, or contact support if this persists.";
      } else if (result.error === 'invalid_api_key') {
        fallbackResponse = getFallbackResponse(message);
      } else {
        fallbackResponse = getFallbackResponse(message);
      }
      
      return NextResponse.json({ 
        response: fallbackResponse,
        conversationHistory: [...conversationHistory, 
          { role: 'user', content: message },
          { role: 'assistant', content: fallbackResponse }
        ],
        note: `Using fallback response due to: ${result.error}`
      });
    }

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Even if everything fails, provide a helpful response
    const fallbackResponse = "I'm having trouble connecting right now, but I'm here to help with Meridian AI! You can ask about file uploads, AI categorization, exports, or any other features.";
    
    return NextResponse.json({ 
      response: fallbackResponse,
      conversationHistory: [],
      note: 'Using emergency fallback response'
    });
  }
} 