import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check if API key is configured
    const apiKey = process.env.OPENAI_API_KEY;

    return NextResponse.json({
      api_key_configured: !!apiKey,
      key_starts_with: apiKey ? apiKey.substring(0, 3) + "..." : null,
      key_length: apiKey ? apiKey.length : 0,
      env_vars_available: Object.keys(process.env)
        .filter(
          (key) =>
            !key.includes("SECRET") &&
            !key.includes("KEY") &&
            !key.includes("TOKEN")
        )
        .slice(0, 10), // Just show a few for safety
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
