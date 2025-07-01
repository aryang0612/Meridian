import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Lazy initialization of OpenAI client to prevent build-time errors
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
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

    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({ 
      response,
      conversationHistory: [...conversationHistory, 
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      ]
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from ChatGPT' },
      { status: 500 }
    );
  }
} 