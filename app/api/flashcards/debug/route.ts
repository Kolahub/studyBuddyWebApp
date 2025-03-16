import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET() {
  let status = {
    openai_key_configured: false,
    openai_connection: false,
    test_response: null,
    error: null,
  };

  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        ...status,
        error: "OpenAI API key is not configured in environment variables",
      });
    }

    status.openai_key_configured = true;

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Test connection
    const testResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content:
            "Please respond with the text 'OpenAI connection successful' and nothing else.",
        },
      ],
      temperature: 0.5,
      max_tokens: 20,
    });

    status.openai_connection = true;
    status.test_response = testResponse.choices[0].message.content;

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({
      ...status,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
