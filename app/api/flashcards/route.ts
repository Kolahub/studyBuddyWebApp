import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface FlashcardContent {
  title: string;
  explanation: string;
  hint?: string;
  example?: string;
}

async function generateFlashcardsWithAI(
  content: string,
  learningSpeed: string,
  count: number
) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is not configured");
    throw new Error("OpenAI API key is not configured");
  }

  console.log("Generating flashcards for content length:", content.length);
  console.log("Sample content (first 100 chars):", content.substring(0, 100));

  const prompt = `Generate ${count} flashcards from the following content. Each flashcard should be tailored for a ${learningSpeed} learner.
The content is: "${content}"

For each flashcard, provide:
1. A question or concept title that directly relates to the content
2. A detailed explanation using information from the content
${learningSpeed === "slow" ? "3. A helpful hint" : "3. A practical example"}

Format each flashcard as:
Q: [Question that directly relates to the content]
E: [Explanation using specific information from the content]
${learningSpeed === "slow" ? "H: [Hint]" : "X: [Example]"}

Make the content:
${
  learningSpeed === "slow"
    ? "- Simple and clear\n- Focus on basic understanding\n- Include helpful hints"
    : learningSpeed === "moderate"
    ? "- Balanced between theory and practice\n- Include practical examples\n- Focus on application"
    : "- Advanced and challenging\n- Include complex relationships\n- Focus on analysis and evaluation"
}

Important: Do not generate generic content. Use specific information from the provided content.

---`;

  try {
    console.log("Calling OpenAI API...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content:
            "You are an expert tutor who creates high-quality flashcards tailored to different learning speeds. Always use specific information from the provided content. Never generate generic content.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    if (!response) throw new Error("No response from OpenAI");

    console.log("OpenAI response received, length:", response.length);
    console.log(
      "Sample response (first 100 chars):",
      response.substring(0, 100)
    );

    // Parse the response into flashcards
    const flashcards = response
      .split(/\n---\n/)
      .filter((card) => card.trim())
      .map((card, index) => {
        const lines = card.split("\n").filter((line) => line.trim());
        const question =
          lines
            .find((l) => l.startsWith("Q:"))
            ?.substring(2)
            .trim() || "";
        const explanation =
          lines
            .find((l) => l.startsWith("E:"))
            ?.substring(2)
            .trim() || "";
        const hintOrExample = lines
          .find((l) => l.startsWith(learningSpeed === "slow" ? "H:" : "X:"))
          ?.substring(2)
          .trim();

        // Validate flashcard content
        if (!question || !explanation) {
          console.error("Invalid flashcard format:", { card, lines });
          throw new Error("Invalid flashcard format received from OpenAI");
        }

        return {
          id: `card-${index + 1}`,
          front: question,
          back: `${explanation}${
            learningSpeed === "slow" && hintOrExample
              ? `\n\nHint: ${hintOrExample}`
              : hintOrExample
              ? `\n\nExample: ${hintOrExample}`
              : ""
          }`,
          difficulty:
            learningSpeed === "slow"
              ? "basic"
              : learningSpeed === "moderate"
              ? "intermediate"
              : "advanced",
        };
      });

    console.log("Generated flashcards count:", flashcards.length);
    return flashcards;
  } catch (error) {
    console.error("Error generating flashcards with AI:", error);
    throw error; // Let the main handler decide what to do with the error
  }
}

// Improved flashcard generation function with structured content
function getBartModelFlashcards(content: string, learningSpeed: string) {
  // Adjust flashcards based on learning speed
  const config = {
    slow: {
      count: 15,
      includeHints: true,
      includeExamples: false,
      explanationStyle: "simple",
      detailLevel: "basic",
    },
    moderate: {
      count: 10,
      includeHints: false,
      includeExamples: true,
      explanationStyle: "balanced",
      detailLevel: "intermediate",
    },
    fast: {
      count: 7,
      includeHints: false,
      includeExamples: true,
      explanationStyle: "advanced",
      detailLevel: "advanced",
    },
  };

  const settings =
    config[learningSpeed as keyof typeof config] || config.moderate;

  // Extract and clean content
  const textContent = content.replace(/\s+/g, " ").trim();

  console.log("Template generator content length:", textContent.length);
  console.log(
    "Template generator sample content:",
    textContent.substring(0, 100)
  );

  // Split into meaningful chunks (sentences and bullet points)
  const chunks = textContent
    .split(/(?:[.!?]|\n\s*[-•])\s+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 10);

  console.log("Found chunks count:", chunks.length);
  if (chunks.length > 0) {
    console.log("Sample chunk:", chunks[0]);
  }

  // Extract key terms and concepts using improved patterns
  const keyTerms = new Set(
    chunks
      .join(" ")
      .match(/\b[A-Z][a-zA-Z]{2,}\b|\b[A-Z]{2,}\b|\b[a-z]{4,}\b/g)
      ?.filter((term) => {
        const lower = term.toLowerCase();
        return ![
          "the",
          "and",
          "that",
          "this",
          "with",
          "from",
          "have",
          "been",
          "were",
          "what",
        ].includes(lower);
      }) || []
  );

  console.log("Extracted key terms count:", keyTerms.size);
  if (keyTerms.size > 0) {
    console.log("Sample key terms:", Array.from(keyTerms).slice(0, 5));
  }

  // IF WE DON'T HAVE ENOUGH CONTENT, Extract simple words as terms
  if (keyTerms.size < 5) {
    const simpleTerms = new Set(
      textContent
        .split(/\s+/)
        .map((word) => word.replace(/[^\w]/g, ""))
        .filter((word) => word.length > 3)
        .filter(
          (word) =>
            !["the", "and", "that", "this", "with", "from", "have"].includes(
              word.toLowerCase()
            )
        )
    );

    simpleTerms.forEach((term) => keyTerms.add(term));
    console.log("Added simple terms, new count:", keyTerms.size);
  }

  // Create direct content-based flashcards instead of generic ones
  if (keyTerms.size < 2 && chunks.length > 0) {
    console.log("Not enough key terms, using chunks directly");
    // Use chunks directly
    const flashcards = chunks.slice(0, settings.count).map((chunk, index) => {
      const topicMatch = content.match(/\b(\w+(?:\s+\w+){0,3})\b/i);
      const topic = topicMatch ? topicMatch[0] : "This topic";

      return {
        id: `card-${index + 1}`,
        front: `What is important about ${topic}?`,
        back: `${chunk}${
          learningSpeed === "slow"
            ? "\n\nHint: Focus on understanding the key points mentioned."
            : "\n\nExample: Apply this knowledge when studying related concepts."
        }`,
        difficulty: settings.detailLevel,
      };
    });

    return {
      flashcards,
      detail_level: settings.detailLevel,
      learning_speed: learningSpeed,
    };
  }

  // Question templates based on learning speed
  const questionTemplates = {
    slow: {
      definition: (term: string) => ({
        title: `What is ${term}?`,
        explanation: "A simple explanation focusing on the basic concept.",
        hint: "Think about how this concept is used in everyday situations.",
      }),
      concept: (term: string) => ({
        title: `Understanding ${term}`,
        explanation:
          "A clear and straightforward explanation of the main points.",
        hint: "Remember to focus on the key characteristics.",
      }),
    },
    moderate: {
      definition: (term: string) => ({
        title: `What is ${term} and how is it used?`,
        explanation:
          "A balanced explanation covering both theory and practice.",
        example: "A practical example showing how this concept works.",
      }),
      analysis: (term: string) => ({
        title: `How does ${term} work?`,
        explanation: "An explanation of the mechanism and important features.",
        example: "A real-world scenario where this concept is applied.",
      }),
    },
    fast: {
      analysis: (term: string) => ({
        title: `Analyze the significance of ${term}`,
        explanation: "A detailed analysis of the concept and its implications.",
        example: "An advanced example demonstrating complex applications.",
      }),
      evaluation: (term: string) => ({
        title: `Evaluate the importance of ${term}`,
        explanation: "A comprehensive evaluation of the concept's impact.",
        example: "A case study showing advanced applications.",
      }),
      synthesis: (terms: string[]) => ({
        title: `How do ${terms[0]} and ${terms[1]} interact?`,
        explanation: "An analysis of the relationship between these concepts.",
        example: "A complex scenario showing their interaction.",
      }),
    },
  };

  // Helper function to get a random item from an array
  const getRandomItem = <T>(arr: T[]): T =>
    arr[Math.floor(Math.random() * arr.length)];

  // Helper function to extract meaningful content for a term
  const getContentForTerm = (term: string, chunks: string[]): string => {
    const relevantChunks = chunks.filter((chunk) =>
      chunk.toLowerCase().includes(term.toLowerCase())
    );
    return relevantChunks.length > 0 ? getRandomItem(relevantChunks) : "";
  };

  // Generate flashcards
  const flashcards = [];
  const keyTermsArray = Array.from(keyTerms);
  const usedTerms = new Set();

  while (flashcards.length < settings.count && keyTermsArray.length > 0) {
    let flashcardContent: FlashcardContent;

    if (
      learningSpeed === "fast" &&
      keyTermsArray.length >= 2 &&
      Math.random() < 0.3
    ) {
      // Create synthesis cards for fast learners
      const terms = [
        keyTermsArray.splice(
          Math.floor(Math.random() * keyTermsArray.length),
          1
        )[0],
        keyTermsArray.splice(
          Math.floor(Math.random() * keyTermsArray.length),
          1
        )[0],
      ];
      const template = questionTemplates.fast.synthesis(terms);
      const content =
        getContentForTerm(terms[0], chunks) ||
        getContentForTerm(terms[1], chunks);

      flashcardContent = {
        title: template.title,
        explanation: content || template.explanation,
        example: template.example,
      };
    } else {
      // Create single-concept cards
      const term = keyTermsArray.splice(
        Math.floor(Math.random() * keyTermsArray.length),
        1
      )[0];
      const content = getContentForTerm(term, chunks);

      const templates =
        questionTemplates[learningSpeed as keyof typeof questionTemplates];
      const templateType = getRandomItem(
        Object.keys(templates)
      ) as keyof typeof templates;
      const template = templates[templateType](term);

      flashcardContent = {
        title: template.title,
        explanation: content || template.explanation,
        ...(settings.includeHints && { hint: template.hint }),
        ...(settings.includeExamples && { example: template.example }),
      };
    }

    flashcards.push({
      id: `card-${flashcards.length + 1}`,
      front: flashcardContent.title,
      back: `${flashcardContent.explanation}${
        flashcardContent.hint ? `\n\nHint: ${flashcardContent.hint}` : ""
      }${
        flashcardContent.example
          ? `\n\nExample: ${flashcardContent.example}`
          : ""
      }`,
      difficulty: settings.detailLevel,
    });
  }

  // If we still need more cards after using all terms, use text chunks directly
  // AVOID GENERIC CONCEPTS - this was causing the "Concise Concept 2" problem!
  while (flashcards.length < settings.count) {
    if (chunks.length > 0) {
      // Use chunks directly if available
      const chunk = chunks[flashcards.length % chunks.length];
      const words = chunk.split(" ");
      const startIndex = Math.min(
        Math.floor(Math.random() * words.length),
        Math.max(0, words.length - 3)
      );
      const phrase = words
        .slice(startIndex, startIndex + Math.min(3, words.length - startIndex))
        .join(" ");

      flashcards.push({
        id: `card-${flashcards.length + 1}`,
        front: `What is the significance of ${phrase}?`,
        back: `${chunk}${
          settings.includeHints
            ? `\n\nHint: Consider how this relates to the main topic.`
            : ""
        }${
          settings.includeExamples
            ? `\n\nExample: This can be applied when studying this subject further.`
            : ""
        }`,
        difficulty: settings.detailLevel,
      });
    } else {
      // Absolute last resort - should never happen with proper content
      flashcards.push({
        id: `card-${flashcards.length + 1}`,
        front: `Important point about this topic`,
        back: `Review the slide content for key information.${
          settings.includeHints
            ? `\n\nHint: Refer to the original slide for details.`
            : ""
        }${
          settings.includeExamples
            ? `\n\nExample: Understanding this topic is essential for the course.`
            : ""
        }`,
        difficulty: settings.detailLevel,
      });
    }
  }

  return {
    flashcards,
    detail_level: settings.detailLevel,
    learning_speed: learningSpeed,
  };
}

// Add this function to extract text content from JSON slide content
function extractTextFromSlideContent(content: any): string {
  try {
    // If content is a string but looks like JSON, parse it
    let parsedContent = content;
    if (typeof content === "string") {
      try {
        parsedContent = JSON.parse(content);
      } catch (e) {
        // If it's not valid JSON, use as is
        return content;
      }
    }

    // Handle array of blocks (common editor format)
    if (Array.isArray(parsedContent)) {
      return parsedContent
        .map((block) => {
          if (typeof block === "string") return block;
          if (!block) return "";

          // Handle paragraph blocks
          if (block.type === "paragraph" && block.children) {
            return block.children
              .map((child) =>
                typeof child === "string" ? child : child.text || ""
              )
              .join(" ");
          }

          // Handle heading blocks
          if (
            block.type &&
            block.type.startsWith("heading") &&
            block.children
          ) {
            return block.children
              .map((child) =>
                typeof child === "string" ? child : child.text || ""
              )
              .join(" ");
          }

          // Handle text blocks
          if (block.text) return block.text;

          // Handle objects with children array
          if (block.children && Array.isArray(block.children)) {
            return block.children
              .map((child) =>
                typeof child === "string" ? child : child.text || ""
              )
              .join(" ");
          }

          return "";
        })
        .filter((text) => text.trim().length > 0)
        .join("\n");
    }

    // If it's an object, try to extract text content
    if (typeof parsedContent === "object" && parsedContent !== null) {
      const textParts: string[] = [];

      // Extract title if available
      if (parsedContent.title) textParts.push(parsedContent.title);

      // Extract description if available
      if (parsedContent.description) textParts.push(parsedContent.description);

      // Extract content if available
      if (parsedContent.content) {
        if (typeof parsedContent.content === "string") {
          textParts.push(parsedContent.content);
        } else if (Array.isArray(parsedContent.content)) {
          textParts.push(extractTextFromSlideContent(parsedContent.content));
        }
      }

      return textParts.join("\n");
    }

    // If all else fails, convert to string
    return String(content);
  } catch (e) {
    console.error("Error extracting text from slide content:", e);
    return typeof content === "string" ? content : "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Verify authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: "You must be logged in to generate flashcards" },
        { status: 401 }
      );
    }

    // Get and validate the request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { slideId } = body;

    if (!slideId) {
      return NextResponse.json(
        { error: "Slide ID is required" },
        { status: 400 }
      );
    }

    // Get user's learning speed from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("learning_speed, is_classified")
      .eq("user_id", session.user.id)
      .single();

    if (profileError) {
      console.error("Profile error:", profileError);
      return NextResponse.json(
        { error: "Failed to get user profile: " + profileError.message },
        { status: 500 }
      );
    }

    // Default to moderate if not classified
    const learningSpeed = profile?.is_classified
      ? profile.learning_speed
      : "moderate";

    // Get the slide content
    const { data: slide, error: slideError } = await supabase
      .from("slides")
      .select("content, text_content, title")
      .eq("id", slideId)
      .single();

    if (slideError || !slide) {
      console.error("Slide error:", slideError);
      return NextResponse.json(
        { error: "Failed to get slide content: " + slideError.message },
        { status: 404 }
      );
    }

    if (!slide) {
      console.error("Slide not found:", slideId);
      return NextResponse.json({ error: "Slide not found" }, { status: 404 });
    }

    // Use text_content if available, otherwise use content
    let content = slide.text_content || "";

    // If no text_content, try to extract it from content
    if (!content && slide.content) {
      content = extractTextFromSlideContent(slide.content);
      console.log(
        "Extracted text content from JSON:",
        content.substring(0, 100)
      );
    }

    // If we still don't have content
    if (!content || content.trim().length < 20) {
      console.warn("Minimal or no content found in slide:", slideId);

      // Generate content based on the title if available
      if (slide.title && slide.title.trim().length > 0) {
        console.log("Generating content based on title:", slide.title);
        content = generateBasicContentFromTitle(slide.title);
      } else {
        return NextResponse.json(
          {
            error: "Insufficient content found in slide to generate flashcards",
          },
          { status: 400 }
        );
      }
    }

    console.log("Slide content found:", {
      title: slide.title,
      contentLength: content.length,
      hasTextContent: !!slide.text_content,
      hasContent: !!slide.content,
      contentSample: content.substring(0, 100),
    });

    // Clear any cached flashcards first
    try {
      await supabase
        .from("cached_flashcards")
        .delete()
        .eq("slide_id", slideId)
        .eq("learning_speed", learningSpeed);
      console.log("Cleared cached flashcards");
    } catch (clearError) {
      console.error("Error clearing cache:", clearError);
    }

    // DIRECT CONTENT APPROACH - No more templates or fallbacks
    // Create cards directly from content chunks
    const count =
      learningSpeed === "slow" ? 15 : learningSpeed === "moderate" ? 10 : 7;

    // Clean and process the content
    const cleanContent = content.replace(/\s+/g, " ").trim();

    // Try several different ways to split the content into meaningful chunks
    const sentences = cleanContent
      .split(/[.!?]\s+/)
      .filter((s) => s.trim().length > 10);
    const bulletPoints = cleanContent
      .split(/\n\s*[-•*]\s*/)
      .filter((b) => b.trim().length > 10);
    const paragraphs = cleanContent
      .split(/\n\s*\n/)
      .filter((p) => p.trim().length > 10);

    console.log(
      `Found content chunks: ${sentences.length} sentences, ${bulletPoints.length} bullet points, ${paragraphs.length} paragraphs`
    );

    // Use the most granular content chunks available
    let chunks =
      sentences.length >= 3
        ? sentences
        : bulletPoints.length >= 3
        ? bulletPoints
        : paragraphs.length >= 3
        ? paragraphs
        : [cleanContent]; // Last resort - use the entire content as one chunk

    console.log(`Using ${chunks.length} content chunks to generate flashcards`);
    if (chunks.length > 0) {
      console.log(`Sample chunk: "${chunks[0].substring(0, 50)}..."`);
    }

    // Generate flashcards directly from the content
    let flashcards = [];

    // If we have a specific title, use it to create a general overview card
    if (slide.title && slide.title.trim().length > 3) {
      // Get a good description, not just repeating the title
      let description = "";

      // Try to find a chunk that doesn't just repeat the title
      if (chunks.length > 0) {
        // Find a chunk that doesn't just repeat the title
        for (const chunk of chunks) {
          if (
            !chunk.includes(slide.title) &&
            chunk.length > slide.title.length * 2
          ) {
            description = chunk;
            break;
          }
        }

        // If we couldn't find a good chunk, use the first one but add more context
        if (!description) {
          description =
            chunks[0] +
            "\n\nThis topic covers important concepts in computer science and data organization.";
        }
      } else {
        // If no chunks, create a generic but helpful description
        description =
          `${slide.title} refers to methods for organizing and storing data in computers. ` +
          `It involves how data is represented in memory and the structures used to efficiently access and manipulate it. ` +
          `Understanding these concepts is essential for effective programming and algorithm design.`;
      }

      flashcards.push({
        id: "card-overview",
        front: `What is "${slide.title.trim()}"?`,
        back:
          description +
          (learningSpeed === "slow"
            ? "\n\nHint: This is the main topic of this slide. Focus on understanding how data is organized and accessed."
            : "\n\nExample: Data structures like arrays, linked lists, and trees are examples of organizing data for efficient access."),
        difficulty:
          learningSpeed === "slow"
            ? "basic"
            : learningSpeed === "moderate"
            ? "intermediate"
            : "advanced",
      });
    }

    // Different question formats based on learning speed
    const questionFormats = {
      slow: [
        (chunk) => `What does this mean: "${chunk.substring(0, 30)}..."?`,
        (chunk) => `Explain this concept: "${getKeyPhrase(chunk)}"`,
        (chunk) => `What is important about this: "${getKeyPhrase(chunk)}"?`,
      ],
      moderate: [
        (chunk) => `How would you explain: "${getKeyPhrase(chunk)}"?`,
        (chunk) => `What are the implications of "${getKeyPhrase(chunk)}"?`,
        (chunk) => `How is "${getKeyPhrase(chunk)}" applied in practice?`,
      ],
      fast: [
        (chunk) => `Analyze the significance of "${getKeyPhrase(chunk)}"`,
        (chunk) =>
          `What critical insights can be drawn from "${getKeyPhrase(chunk)}"?`,
        (chunk) =>
          `Evaluate the importance of "${getKeyPhrase(chunk)}" in this context`,
      ],
    };

    // Helper function to extract a key phrase from a chunk
    function getKeyPhrase(text) {
      // Extract a meaningful phrase (3-5 words)
      const words = text.split(" ");
      const phraseLength = Math.min(
        5,
        Math.max(3, Math.floor(words.length / 3))
      );
      let startIndex = 0;

      // Find a good starting point (avoid starting with common words)
      const commonWords = [
        "the",
        "a",
        "an",
        "and",
        "or",
        "but",
        "for",
        "with",
        "in",
        "on",
        "at",
      ];
      for (let i = 0; i < Math.min(5, words.length); i++) {
        if (!commonWords.includes(words[i].toLowerCase())) {
          startIndex = i;
          break;
        }
      }

      return words.slice(startIndex, startIndex + phraseLength).join(" ");
    }

    // Add cards based on content chunks
    const formats = questionFormats[learningSpeed] || questionFormats.moderate;
    let chunkIndex = 0;

    while (flashcards.length < count && chunkIndex < chunks.length) {
      const chunk = chunks[chunkIndex];
      const format = formats[flashcards.length % formats.length];

      flashcards.push({
        id: `card-${flashcards.length + 1}`,
        front: format(chunk),
        back:
          chunk +
          (learningSpeed === "slow"
            ? "\n\nHint: Focus on understanding how this relates to the main topic."
            : "\n\nExample: You can apply this knowledge when working with related concepts."),
        difficulty:
          learningSpeed === "slow"
            ? "basic"
            : learningSpeed === "moderate"
            ? "intermediate"
            : "advanced",
      });

      chunkIndex++;
    }

    // If we still don't have enough cards, try to generate more from the same chunks
    if (flashcards.length < count) {
      console.log(
        `Not enough unique chunks (${
          chunks.length
        }), reusing chunks to create ${count - flashcards.length} more cards`
      );

      // Extract key phrases from the content for additional questions
      const contentWords = cleanContent.split(" ");
      const keyPhrases = [];

      for (let i = 0; i < contentWords.length - 3; i += 3) {
        if (
          contentWords[i].length > 3 &&
          !["the", "and", "that"].includes(contentWords[i].toLowerCase())
        ) {
          keyPhrases.push(contentWords.slice(i, i + 3).join(" "));
        }
      }

      console.log(
        `Extracted ${keyPhrases.length} key phrases for additional questions`
      );

      // Add cards based on key phrases
      let phraseIndex = 0;
      while (
        flashcards.length < count &&
        (phraseIndex < keyPhrases.length || chunks.length > 0)
      ) {
        const phrase =
          phraseIndex < keyPhrases.length
            ? keyPhrases[phraseIndex]
            : getKeyPhrase(chunks[0]);
        const chunkToUse = chunks[phraseIndex % chunks.length];

        flashcards.push({
          id: `card-${flashcards.length + 1}`,
          front: `What is the importance of "${phrase}"?`,
          back:
            chunkToUse +
            (learningSpeed === "slow"
              ? "\n\nHint: This relates to a key aspect of the topic."
              : "\n\nExample: This concept is important for understanding the broader subject."),
          difficulty:
            learningSpeed === "slow"
              ? "basic"
              : learningSpeed === "moderate"
              ? "intermediate"
              : "advanced",
        });

        phraseIndex++;
      }
    }

    // Create actual flashcard response data
    const flashcardsData = {
      flashcards,
      detail_level:
        learningSpeed === "slow"
          ? "basic"
          : learningSpeed === "moderate"
          ? "intermediate"
          : "advanced",
      learning_speed: learningSpeed,
    };

    // Cache the new flashcards
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
        console.error("Cache upsert error:", upsertError);
      }
    } catch (cacheError) {
      console.error("Cache error:", cacheError);
    }

    // Return the content-based flashcards
    return NextResponse.json({
      ...flashcardsData,
      cached: false,
      direct_content: true,
    });
  } catch (error) {
    console.error("Error in flashcard generation:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while generating flashcards",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Function to generate basic content from a title
function generateBasicContentFromTitle(title: string): string {
  const lowercaseTitle = title.toLowerCase();

  // Data structures specific content
  if (
    lowercaseTitle.includes("data structure") ||
    lowercaseTitle.includes("data representation")
  ) {
    return `Data structures are specialized formats for organizing, processing, and storing data. They provide efficient ways to access and modify information.
    
    Common data structures include:
    - Arrays: Contiguous memory locations for storing elements of the same type
    - Linked Lists: Elements with pointers to the next element
    - Stacks: Last-in, first-out (LIFO) data structures
    - Queues: First-in, first-out (FIFO) data structures
    - Trees: Hierarchical structures with parent-child relationships
    - Graphs: Collections of nodes connected by edges
    - Hash Tables: Data structures that map keys to values using a hash function
    
    Data representation refers to how data is encoded and stored in computer memory, including binary, hexadecimal, and various numeric formats.
    
    The choice of data structure affects algorithm efficiency, memory usage, and performance.`;
  }

  // Algorithm specific content
  if (lowercaseTitle.includes("algorithm")) {
    return `Algorithms are step-by-step procedures or formulas for solving problems. They form the foundation of computer programming and problem-solving.
    
    Key algorithm characteristics:
    - Input: Data provided to the algorithm
    - Output: The result after processing
    - Definiteness: Each step is precisely defined
    - Finiteness: The algorithm terminates after a finite number of steps
    - Effectiveness: Each step can be performed exactly and in finite time
    
    Common algorithm categories include:
    - Sorting algorithms (bubble sort, merge sort, quicksort)
    - Search algorithms (linear search, binary search)
    - Graph algorithms (breadth-first search, depth-first search)
    - Dynamic programming algorithms
    - Greedy algorithms
    
    Algorithm efficiency is measured using Big O notation, which describes how runtime or space requirements grow as input size increases.`;
  }

  // Programming specific content
  if (
    lowercaseTitle.includes("programming") ||
    lowercaseTitle.includes("code") ||
    lowercaseTitle.includes("software")
  ) {
    return `Programming involves writing instructions for computers to execute specific tasks. It requires knowledge of programming languages, algorithms, and problem-solving techniques.
    
    Key programming concepts include:
    - Variables and data types
    - Control structures (conditionals, loops)
    - Functions and methods
    - Object-oriented programming principles
    - Error handling and debugging
    - Software development lifecycle
    
    Programming paradigms include:
    - Procedural programming
    - Object-oriented programming
    - Functional programming
    - Event-driven programming
    
    Good programming practices involve writing clean, maintainable code with proper documentation and testing.`;
  }

  // Generic computer science content for other titles
  return `${title} is an important concept in computer science and information technology. It involves principles and methodologies for processing, storing, and accessing information efficiently.
  
  Key aspects of this topic include:
  - Theoretical foundations and principles
  - Practical implementations and applications
  - Efficiency and optimization considerations
  - Common patterns and best practices
  
  Understanding ${title} helps in designing better systems, solving complex problems, and implementing efficient solutions in various computing environments.
  
  This topic connects to fundamental computer science concepts and has applications in software development, system design, and algorithm implementation.`;
}
