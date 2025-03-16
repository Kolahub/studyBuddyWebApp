import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { getTopicContent, getTopicQuestions } from "../sample-course-data";

// Initialize OpenAI with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add a fallback implementation that doesn't require OpenAI
function generateFallbackFlashcards(
  title: string,
  content: string,
  learningSpeed: string
) {
  console.log("Generating fallback flashcards for:", title);

  const count =
    learningSpeed === "slow" ? 10 : learningSpeed === "moderate" ? 8 : 6;
  const difficulty =
    learningSpeed === "slow"
      ? "basic"
      : learningSpeed === "moderate"
      ? "intermediate"
      : "advanced";

  // Try to get pre-defined questions from sample data first
  const sampleQuestions = getTopicQuestions(title);
  if (sampleQuestions.length > 0) {
    console.log("Using sample questions for:", title);

    // Select a subset of questions based on learning speed
    const selectedQuestions = sampleQuestions.slice(0, count);

    // Create flashcards from sample questions
    const flashcards = selectedQuestions.map((item, index) => ({
      id: `card-${index + 1}`,
      front: item.question,
      back:
        item.answer +
        (learningSpeed === "slow"
          ? "\n\nHint: Focus on understanding the core concepts before moving to more complex topics."
          : learningSpeed === "moderate"
          ? "\n\nExample: This concept is applied in various computer science scenarios and practical applications."
          : "\n\nAdvanced Note: Consider how this relates to other computer science principles and advanced applications."),
      difficulty,
    }));

    return {
      flashcards,
      detail_level: difficulty,
      learning_speed: learningSpeed,
    };
  }

  // Fallback to the original implementation if no sample questions are available
  const flashcards = [];

  // First card is always about the main concept
  flashcards.push({
    id: "card-1",
    front: `What is ${title}?`,
    back: `${title} is a fundamental concept in computer science and information technology. ${
      content && content.length > 50
        ? content.substring(0, 200) + "..."
        : "It involves organizing and processing data in specific ways."
    }`,
    difficulty,
  });

  // Add more cards with specific questions
  if (title.toLowerCase().includes("data structure")) {
    flashcards.push({
      id: "card-2",
      front: "What are the common types of data structures?",
      back: "Common data structures include arrays, linked lists, stacks, queues, trees, graphs, and hash tables. Each has different characteristics and use cases.",
      difficulty,
    });
  }

  if (title.toLowerCase().includes("algorithm")) {
    flashcards.push({
      id: "card-2",
      front: "What makes an algorithm efficient?",
      back: "Algorithm efficiency is measured in terms of time complexity (how execution time increases with input size) and space complexity (how memory usage increases with input size). Efficient algorithms minimize these factors.",
      difficulty,
    });
  }

  // Add general computer science cards if we need more
  while (flashcards.length < count) {
    const index = flashcards.length + 1;
    flashcards.push({
      id: `card-${index}`,
      front: `Key aspect ${index} of ${title}?`,
      back: `This topic involves understanding core principles, implementation approaches, and practical applications in computing environments.`,
      difficulty,
    });
  }

  return {
    flashcards,
    detail_level: difficulty,
    learning_speed: learningSpeed,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { slideId, learningSpeed = "moderate" } = body;

    console.log(
      "Request received for slideId:",
      slideId,
      "with learning speed:",
      learningSpeed
    );

    if (!slideId) {
      console.error("Missing slideId parameter");
      return NextResponse.json(
        { error: "Missing slideId parameter" },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured early
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error("OpenAI API key is not configured");

      // Instead of returning an error, we'll generate fallback flashcards
      console.log("Will use fallback flashcard generation method");
    }

    // Get the Supabase client
    const supabase = createServerSupabaseClient();
    if (!supabase) {
      console.error("Failed to create Supabase client");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Verify authentication
    let userId;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.error("User not authenticated");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = session.user.id;
      console.log("User authenticated:", userId);
    } catch (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Authentication error" },
        { status: 401 }
      );
    }

    // Get user profile to determine learning speed if not provided
    if (!learningSpeed) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("learning_speed")
          .eq("id", userId)
          .single();

        if (profile?.learning_speed) {
          learningSpeed = profile.learning_speed;
          console.log("Using profile learning speed:", learningSpeed);
        }
      } catch (profileError) {
        console.error("Error fetching user profile:", profileError);
        // Continue with default learning speed
      }
    }

    // Get the slide content
    let slide;
    try {
      const { data, error: slideError } = await supabase
        .from("slides")
        .select("content, text_content, title, course_id")
        .eq("id", slideId)
        .single();

      if (slideError) {
        console.error("Error fetching slide:", slideError);
        return NextResponse.json(
          { error: "Failed to fetch slide: " + slideError.message },
          { status: 404 }
        );
      }

      if (!data) {
        console.error("Slide not found:", slideId);
        return NextResponse.json({ error: "Slide not found" }, { status: 404 });
      }

      slide = data;
      console.log("Slide found:", slide.title);
    } catch (dbError) {
      console.error("Database error when fetching slide:", dbError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Get course title for additional context
    let courseTitle = "your course";
    try {
      const { data: course } = await supabase
        .from("courses")
        .select("title")
        .eq("id", slide.course_id)
        .single();

      if (course?.title) {
        courseTitle = course.title;
        console.log("Course title:", courseTitle);
      }
    } catch (courseError) {
      console.error("Error fetching course:", courseError);
      // Continue with default course title
    }

    // Extract text content from slide
    let textContent = slide.text_content || "";
    console.log("Initial text content length:", textContent.length);

    // If no text_content, try to extract from content
    if (!textContent && slide.content) {
      try {
        console.log("Extracting text from content");
        const parsedContent =
          typeof slide.content === "string"
            ? JSON.parse(slide.content)
            : slide.content;

        if (Array.isArray(parsedContent)) {
          textContent = parsedContent
            .map((block) => {
              if (typeof block === "string") return block;
              if (block?.type === "paragraph" && block?.children) {
                return block.children
                  .map((child) =>
                    typeof child === "string" ? child : child.text || ""
                  )
                  .join(" ");
              }
              return block?.text || "";
            })
            .filter(Boolean)
            .join("\n");
        } else if (
          typeof parsedContent === "object" &&
          parsedContent !== null
        ) {
          // Extract text from object properties
          const textParts = [];
          if (parsedContent.title) textParts.push(parsedContent.title);
          if (parsedContent.description)
            textParts.push(parsedContent.description);
          if (parsedContent.content) {
            if (typeof parsedContent.content === "string") {
              textParts.push(parsedContent.content);
            }
          }
          textContent = textParts.join("\n");
        }
        console.log("Extracted text content length:", textContent.length);
      } catch (parseError) {
        console.error("Error parsing slide content:", parseError);
        if (typeof slide.content === "string") {
          textContent = slide.content;
          console.log(
            "Using raw content as string, length:",
            textContent.length
          );
        }
      }
    }

    // Generate supplementary content if text is too short
    if (textContent.length < 100 && slide.title) {
      console.log("Content too short, generating supplementary content");

      // First try to get supplementary content from the sample course data
      const sampleContent = getTopicContent(slide.title);
      if (sampleContent) {
        console.log("Using sample course data for:", slide.title);
        textContent = `${textContent}\n\n${sampleContent}`;
        console.log("Added sample content, new length:", textContent.length);
      } else {
        // Then try to get from the database
        try {
          const { data: supplementaryContent } = await supabase
            .from("ai_content")
            .select("content")
            .eq("topic", slide.title)
            .single();

          if (supplementaryContent?.content) {
            textContent = `${textContent}\n\n${supplementaryContent.content}`;
            console.log(
              "Added supplementary content from database, new length:",
              textContent.length
            );
          } else {
            // If no supplementary content, generate some basic content
            console.log(
              "No supplementary content found, using fallback content"
            );
            textContent = `${textContent}\n\n${slide.title} is an important concept in ${courseTitle}. It involves understanding key principles and applications in this field.`;
          }
        } catch (supplementaryError) {
          console.error(
            "Error fetching supplementary content:",
            supplementaryError
          );
          // Continue with whatever content we have
        }
      }
    }

    // If we still have no meaningful content, use a fallback approach
    if (!textContent || textContent.length < 50) {
      console.log(
        "Insufficient content for AI generation, using fallback approach"
      );
      const fallbackData = generateFallbackFlashcards(
        slide.title,
        textContent,
        learningSpeed
      );

      // Cache the fallback flashcards
      try {
        await supabase.from("cached_flashcards").upsert({
          slide_id: slideId,
          learning_speed: learningSpeed,
          flashcards_data: {
            ...fallbackData,
            generated_by: "fallback",
          },
          created_at: new Date().toISOString(),
        });
      } catch (cacheError) {
        console.error("Error caching fallback flashcards:", cacheError);
      }

      return NextResponse.json({
        ...fallbackData,
        cached: false,
        generated_by: "fallback",
      });
    }

    // Determine card count based on learning speed
    const cardCount =
      learningSpeed === "slow" ? 10 : learningSpeed === "moderate" ? 8 : 6;

    // If OpenAI API key is not available, use fallback approach
    if (!openaiApiKey) {
      console.log("No OpenAI API key, generating fallback flashcards");
      const fallbackData = generateFallbackFlashcards(
        slide.title,
        textContent,
        learningSpeed
      );

      // Cache the fallback flashcards
      try {
        await supabase.from("cached_flashcards").upsert({
          slide_id: slideId,
          learning_speed: learningSpeed,
          flashcards_data: {
            ...fallbackData,
            generated_by: "fallback",
          },
          created_at: new Date().toISOString(),
        });
      } catch (cacheError) {
        console.error("Error caching fallback flashcards:", cacheError);
      }

      return NextResponse.json({
        ...fallbackData,
        cached: false,
        generated_by: "fallback",
      });
    }

    // Initialize OpenAI client
    let openai;
    try {
      openai = new OpenAI({
        apiKey: openaiApiKey,
      });
      console.log("OpenAI client initialized");
    } catch (openaiInitError) {
      console.error("Error initializing OpenAI client:", openaiInitError);
      const fallbackData = generateFallbackFlashcards(
        slide.title,
        textContent,
        learningSpeed
      );
      return NextResponse.json({
        ...fallbackData,
        cached: false,
        generated_by: "fallback",
        error_initializing_openai: true,
      });
    }

    // Create the prompt for flashcard generation
    const prompt = `Generate ${cardCount} high-quality flashcards for the topic "${
      slide.title
    }" based on the following content:

${textContent}

IMPORTANT INSTRUCTIONS:
1. Create substantive, educational flashcards with clear connections to the content
2. Each flashcard should focus on a specific concept, definition, or application
3. Structure questions to test understanding rather than just recall
4. Answers should be informative, detailed, and directly address the question
5. For ${learningSpeed} learners: ${
      learningSpeed === "slow"
        ? "use simpler language, include clear examples, and add a helpful hint"
        : learningSpeed === "moderate"
        ? "balance theory and application, include practical examples"
        : "use advanced terminology, explore relationships between concepts, and focus on analysis"
    }

AVOID:
- Generic questions that don't relate to specific content
- Questions that have unclear answers
- Repetitive content across flashcards
- Vague or ambiguous phrasing
- Answers that don't properly address the questions

FOR QUESTIONS:
- Ask "What is [specific concept from content]?"
- Ask "How does [specific concept] relate to [another concept]?"
- Ask "Why is [specific concept] important?"
- Ask "What are the characteristics of [specific concept]?"
- Ask "Explain the process of [specific mechanism/procedure]"

FOR ANSWERS:
- Provide clear, concise explanations
- Include definitions, examples, applications, or comparisons
- For concrete concepts, include specific details
- For theoretical concepts, explain underlying principles
- ${
      learningSpeed === "slow"
        ? "Include a helpful hint at the end of each answer"
        : learningSpeed === "moderate"
        ? "Include a practical example at the end of each answer"
        : "Include advanced implications or relationships at the end of each answer"
    }

Format each flashcard as:
QUESTION: [The question]
ANSWER: [Detailed answer with examples or hints as appropriate]

Make sure each question is distinct and focuses on different aspects of the topic.`;

    try {
      console.log("Calling OpenAI API...");
      // Call OpenAI API with GPT-4 for higher quality
      const completion = await openai.chat.completions.create({
        model: "gpt-4", // Using GPT-4 instead of gpt-3.5-turbo for higher quality
        messages: [
          {
            role: "system",
            content:
              "You are an expert educator creating high-quality flashcards tailored to different learning speeds. Your flashcards should be clear, focused, and based on specific content provided. Each flashcard must have a substantive question that tests understanding and a comprehensive answer that provides valuable information.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.5, // Lower temperature for more focused, consistent output
        max_tokens: 2048, // Increased token limit for more detailed flashcards
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        console.error("Empty response from OpenAI");
        throw new Error("No response from OpenAI");
      }

      console.log("Response received from OpenAI, length:", response.length);

      // Parse the flashcards from the response
      const flashcardMatches = response.match(
        /QUESTION: (.*?)(?:\r?\n|\r)ANSWER: ([\s\S]*?)(?=(?:\r?\n|\r)QUESTION:|$)/g
      );

      if (!flashcardMatches || flashcardMatches.length === 0) {
        console.error(
          "Failed to parse flashcards from response:",
          response.substring(0, 200)
        );
        throw new Error("Failed to parse flashcards from AI response");
      }

      const flashcards = flashcardMatches.map((match, index) => {
        const questionMatch = match.match(
          /QUESTION: (.*?)(?:\r?\n|\r)ANSWER: ([\s\S]*)/
        );
        if (!questionMatch) {
          console.error("Failed to parse question/answer pair:", match);
          return {
            id: `card-${index + 1}`,
            front: `Question ${index + 1}`,
            back: "Failed to parse content",
            difficulty:
              learningSpeed === "slow"
                ? "basic"
                : learningSpeed === "moderate"
                ? "intermediate"
                : "advanced",
          };
        }

        const [_, question, answer] = questionMatch;
        return {
          id: `card-${index + 1}`,
          front: question.trim(),
          back: answer.trim(),
          difficulty:
            learningSpeed === "slow"
              ? "basic"
              : learningSpeed === "moderate"
              ? "intermediate"
              : "advanced",
        };
      });

      console.log(`Successfully parsed ${flashcards.length} flashcards`);

      // If we couldn't parse any flashcards properly, use fallback
      if (flashcards.length === 0) {
        console.warn("No flashcards were parsed, using fallback generator");
        const fallbackData = generateFallbackFlashcards(
          slide.title,
          textContent,
          learningSpeed
        );
        return NextResponse.json({
          ...fallbackData,
          cached: false,
          generated_by: "fallback",
          parsing_failed: true,
        });
      }

      const flashcardsData = {
        flashcards,
        detail_level:
          learningSpeed === "slow"
            ? "basic"
            : learningSpeed === "moderate"
            ? "intermediate"
            : "advanced",
        learning_speed: learningSpeed,
        generated_by: "openai",
      };

      // Cache the flashcards
      try {
        const { error: upsertError } = await supabase
          .from("cached_flashcards")
          .upsert({
            slide_id: slideId,
            learning_speed: learningSpeed,
            flashcards_data: flashcardsData,
            created_at: new Date().toISOString(),
          });

        if (upsertError) {
          console.error("Error caching flashcards:", upsertError);
        }
      } catch (cacheError) {
        console.error("Error during caching:", cacheError);
      }

      // Return the flashcards
      return NextResponse.json({
        ...flashcardsData,
        cached: false,
      });
    } catch (error) {
      console.error("Error calling OpenAI:", error);

      // Use fallback flashcard generation
      console.log("Using fallback flashcard generation due to OpenAI error");
      const fallbackData = generateFallbackFlashcards(
        slide.title,
        textContent,
        learningSpeed
      );

      return NextResponse.json({
        ...fallbackData,
        cached: false,
        generated_by: "fallback",
        openai_error:
          error instanceof Error ? error.message : "Unknown OpenAI error",
      });
    }
  } catch (error) {
    console.error("Error in AI flashcard generation:", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
