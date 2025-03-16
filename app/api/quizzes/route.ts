import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Python process module for running model bridge
import { spawn } from "child_process";
import { randomUUID } from "crypto";

// This simulates a server-side storage for the generated quizzes
// In a real application, this would be stored in a database
let generatedQuizzes: any[] = [];

// Types for quiz generation
interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct answer (0-3)
  explanation: string;
}

interface GeneratedQuiz {
  id?: string;
  title: string;
  slideId: string;
  courseId: string;
  userId: string;
  questions: QuizQuestion[];
  difficulty: string;
  created_at?: string;
}

// Helper function to call Python model bridge
async function callModelBridge(action: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const requestId = randomUUID();
    const requestData = JSON.stringify({
      action,
      params,
      request_id: requestId,
    });

    const pythonProcess = spawn("python", ["-m", "models.bridge_server"]);
    let result = "";
    let error = "";

    // Send data to the Python process
    pythonProcess.stdin.write(requestData);
    pythonProcess.stdin.end();

    // Collect output
    pythonProcess.stdout.on("data", (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        console.error(`Error: ${error}`);
        // Fallback to mock data
        if (action === "generate_quiz") {
          const { content, learning_speed } = params;
          resolve(generateMockQuiz(content, learning_speed));
        } else if (action === "classify_user") {
          const { responses } = params;
          resolve({ learning_speed: classifyUserMock(responses) });
        } else {
          reject(
            new Error(`Python process failed with code ${code}: ${error}`)
          );
        }
      } else {
        try {
          const parsedResult = JSON.parse(result);
          resolve(parsedResult);
        } catch (e) {
          reject(new Error(`Failed to parse Python response: ${e}`));
        }
      }
    });
  });
}

// Mock function for quiz generation if Python bridge fails
function generateMockQuiz(
  content: string,
  learning_speed: string = "moderate"
) {
  // Default to 15 questions for moderate, 10 for slow, 20 for fast
  const questionCount =
    learning_speed === "slow" ? 10 : learning_speed === "fast" ? 20 : 15;

  const complexity =
    learning_speed === "slow"
      ? "Basic"
      : learning_speed === "moderate"
      ? "Intermediate"
      : "Advanced";

  const questions = [];
  for (let i = 1; i <= questionCount; i++) {
    questions.push({
      id: `q${i}`,
      text: `${complexity} Question ${i} about the content`,
      options: [
        `Option A for question ${i}`,
        `Option B for question ${i}`,
        `Option C for question ${i}`,
        `Option D for question ${i}`,
      ],
      correct_option: i % 4,
    });
  }

  return {
    title: "Generated Quiz",
    description: `A ${learning_speed} pace quiz generated from the content`,
    questions,
  };
}

// Mock function for user classification if Python bridge fails
function classifyUserMock(responses: any) {
  // Count occurrences of each learning speed
  const counts = { slow: 0, moderate: 0, fast: 0 };

  Object.values(responses).forEach((response: any) => {
    if (response in counts) {
      counts[response as keyof typeof counts]++;
    }
  });

  // Find the most common learning speed
  let maxCount = 0;
  let classification = "moderate"; // Default

  Object.entries(counts).forEach(([speed, count]) => {
    if (count > maxCount) {
      maxCount = count;
      classification = speed;
    }
  });

  return classification;
}

// Function to generate better explanations based on specific context
function generateDetailedExplanation(
  topic: string,
  correctAnswer: string,
  questionType: string,
  learningSpeed: string
): string {
  // Create a more detailed, specific explanation
  let explanation = "";

  switch (questionType) {
    case "definition":
      explanation = `The correct answer accurately defines ${topic}. ${
        learningSpeed === "slow"
          ? "Understanding basic definitions is fundamental to mastering this subject."
          : learningSpeed === "moderate"
          ? "This definition captures the essential characteristics that distinguish it from related concepts."
          : "This definition encompasses both the technical aspects and theoretical implications."
      }`;
      break;

    case "application":
      explanation = `This answer correctly identifies how ${topic} is applied in practice. ${
        learningSpeed === "slow"
          ? "Recognizing practical applications helps build a foundation for understanding."
          : learningSpeed === "moderate"
          ? "Understanding both the theory and application allows for better knowledge retention."
          : "This application demonstrates the complex interplay between theoretical principles and real-world constraints."
      }`;
      break;

    case "comparison":
      explanation = `The correct option accurately compares ${topic} with related concepts. ${
        learningSpeed === "slow"
          ? "Identifying these differences helps clarify basic understanding."
          : learningSpeed === "moderate"
          ? "This comparison highlights key distinctions that are often confused."
          : "This nuanced comparison acknowledges the conceptual overlap while identifying crucial distinctions."
      }`;
      break;

    case "analysis":
      explanation = `This answer correctly analyzes ${topic} from a ${
        learningSpeed === "slow"
          ? "basic"
          : learningSpeed === "moderate"
          ? "moderate"
          : "sophisticated"
      } perspective. ${
        learningSpeed === "slow"
          ? "Breaking down concepts into simpler components aids comprehension."
          : learningSpeed === "moderate"
          ? "This analysis balances depth and accessibility."
          : "This analysis integrates multiple theoretical frameworks and acknowledges contextual factors."
      }`;
      break;

    default:
      explanation = `This is the correct answer because it accurately describes ${topic}. ${correctAnswer} ${
        learningSpeed === "slow"
          ? "Focus on understanding this core concept before moving on."
          : learningSpeed === "moderate"
          ? "Understanding this concept will help you connect it with other related ideas."
          : "This understanding forms the basis for more complex analysis and application."
      }`;
  }

  // Add specific details from the correct answer
  if (correctAnswer && correctAnswer.length > 15) {
    const answerExcerpt =
      correctAnswer.slice(0, 40) + (correctAnswer.length > 40 ? "..." : "");
    explanation += ` Specifically, "${answerExcerpt}" highlights the key aspect that makes this answer correct.`;
  }

  return explanation;
}

// Function to generate adaptive quiz questions based on learning speed
function generateAdaptiveQuestions(
  slideTitle: string,
  slideContent: string,
  learningSpeed: string
): QuizQuestion[] {
  // Number of questions to generate (5-10 based on learning speed)
  const numQuestions =
    learningSpeed === "slow" ? 5 : learningSpeed === "moderate" ? 7 : 10;

  // Parse the content to extract key concepts and topics
  const sentences = slideContent
    .split(/[.!?]/)
    .filter((s) => s.trim().length > 10);

  // Extract key terms (words that start with capital letters or are emphasized)
  const keyTermsPattern =
    /\b[A-Z][a-z]{2,}\b|\b[a-z]{3,}\b(?=\s+is|\s+are|\s+refers|\s+means)/g;
  const allKeyTerms = slideContent.match(keyTermsPattern) || [];
  const keyTerms = [...new Set(allKeyTerms)].filter((term) => term.length > 3);

  // Extract concepts (noun phrases)
  const conceptPattern =
    /\b(?:[A-Z][a-z]+ )+(?:[A-Za-z]+)\b|\b[A-Z][a-z]{2,}(?:ing|tion|ment|nce)\b/g;
  const allConcepts = slideContent.match(conceptPattern) || [];
  const concepts = [...new Set(allConcepts)].filter(
    (concept) => concept.length > 5
  );

  // If we couldn't extract enough concepts, use some generic ones related to the title
  if (concepts.length < 3) {
    concepts.push(
      `${slideTitle} principles`,
      `${slideTitle} applications`,
      `${slideTitle} methodologies`,
      `${slideTitle} theory`
    );
  }

  // If we couldn't extract enough key terms, use words from the title
  if (keyTerms.length < 3) {
    const titleWords = slideTitle
      .split(/\s+/)
      .filter((word) => word.length > 3);
    keyTerms.push(...titleWords);
  }

  // Define template generators for different learning speeds
  const questionTemplates = {
    slow: [
      (topic: string) => `What is the main purpose of ${topic}?`,
      (topic: string) => `Which of the following best describes ${topic}?`,
      (topic: string) => `What is the correct definition of ${topic}?`,
      (topic: string) => `What does ${topic} refer to?`,
      (topic: string) => `Which statement about ${topic} is true?`,
    ],
    moderate: [
      (topic: string, concept: string) =>
        `How does ${topic} relate to ${concept}?`,
      (topic: string) => `What is an important characteristic of ${topic}?`,
      (topic: string, concept: string) =>
        `What is the relationship between ${topic} and ${concept}?`,
      (topic: string) =>
        `Which of the following is a key principle of ${topic}?`,
      (topic: string) => `What is a practical application of ${topic}?`,
    ],
    fast: [
      (topic: string, concept: string) =>
        `How would you analyze the impact of ${topic} on ${concept}?`,
      (topic: string, concept: string) =>
        `What would be the most effective way to implement ${topic} in the context of ${concept}?`,
      (topic: string) =>
        `Which theoretical framework best explains the principles of ${topic}?`,
      (topic: string, concept: string) =>
        `What are the limitations of applying ${topic} to ${concept}?`,
      (topic: string) =>
        `How might ${topic} evolve in the future based on current trends?`,
    ],
  };

  // Select appropriate template set based on learning speed
  const templates =
    questionTemplates[learningSpeed as keyof typeof questionTemplates] ||
    questionTemplates.moderate;

  // Function to generate a correct answer and distractors based on content and learning speed
  function generateAnswerOptions(
    question: string,
    correctAnswer: string,
    contentContext: string[],
    speed: string
  ): string[] {
    const options: string[] = [correctAnswer];

    // Generate distractors based on learning speed
    let distractorCount = 0;
    const maxAttempts = 20; // prevent infinite loops
    let attempts = 0;

    while (options.length < 4 && attempts < maxAttempts) {
      attempts++;
      let distractor = "";

      // Get distractor based on learning speed
      if (speed === "slow") {
        // For slow learners: create clearly incorrect but related answers
        const distractors = [
          `This is incorrect because it confuses the definition of ${
            keyTerms[distractorCount % keyTerms.length] || slideTitle
          }`,
          `This statement misunderstands the basic concept of ${slideTitle}`,
          `This is a common misconception about ${
            keyTerms[distractorCount % keyTerms.length] || slideTitle
          }`,
          `This incorrectly describes ${
            concepts[distractorCount % concepts.length] || slideTitle
          }`,
        ];
        distractor = distractors[distractorCount % distractors.length];
      } else if (speed === "moderate") {
        // For moderate learners: create plausible but incorrect answers
        const distractors = [
          `This partially addresses ${
            keyTerms[distractorCount % keyTerms.length] || slideTitle
          } but misses key aspects`,
          `This is related to ${
            concepts[distractorCount % concepts.length] || slideTitle
          } but is not the most accurate answer`,
          `This would be true if applied to ${
            keyTerms[(distractorCount + 1) % keyTerms.length] ||
            "a different context"
          }, but not for ${slideTitle}`,
          `This represents an outdated understanding of ${slideTitle}`,
        ];
        distractor = distractors[distractorCount % distractors.length];
      } else {
        // For fast learners: create sophisticated distractors that require careful analysis
        const distractors = [
          `This reflects a common theoretical approach to ${slideTitle}, but overlooks critical nuances in ${
            concepts[distractorCount % concepts.length] || "implementation"
          }`,
          `This would be accurate if ${
            keyTerms[distractorCount % keyTerms.length] || "the primary factor"
          } were the only consideration, but fails to account for ${
            concepts[(distractorCount + 1) % concepts.length] ||
            "other variables"
          }`,
          `This represents one perspective on ${slideTitle}, but doesn't address the complexities of ${
            concepts[distractorCount % concepts.length] || "the entire system"
          }`,
          `This assumes an ideal scenario for ${slideTitle} without considering real-world constraints`,
        ];
        distractor = distractors[distractorCount % distractors.length];
      }

      // Only add if the distractor is unique
      if (!options.includes(distractor)) {
        options.push(distractor);
        distractorCount++;
      }
    }

    // Shuffle the options to randomize the position of the correct answer
    return shuffleArray([...options]);
  }

  // Function to shuffle an array (Fisher-Yates algorithm)
  function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  // Generate questions
  const questions: QuizQuestion[] = [];
  const usedTemplateIndices = new Set<number>();

  // Add a function to determine question type
  function determineQuestionType(question: string): string {
    if (
      question.includes("define") ||
      question.includes("what is") ||
      question.includes("refers to")
    ) {
      return "definition";
    } else if (
      question.includes("apply") ||
      question.includes("use") ||
      question.includes("implement")
    ) {
      return "application";
    } else if (
      question.includes("compare") ||
      question.includes("difference") ||
      question.includes("versus")
    ) {
      return "comparison";
    } else if (
      question.includes("analyze") ||
      question.includes("evaluate") ||
      question.includes("assess")
    ) {
      return "analysis";
    } else {
      return "general";
    }
  }

  for (let i = 0; i < numQuestions && i < sentences.length; i++) {
    // Select a template (try to avoid repeating the same template)
    let templateIndex: number;
    let attempts = 0;
    do {
      templateIndex = Math.floor(Math.random() * templates.length);
      attempts++;
    } while (
      usedTemplateIndices.has(templateIndex) &&
      attempts < templates.length
    );

    usedTemplateIndices.add(templateIndex);

    // Select concepts for this question
    const mainTopic = slideTitle;
    const relatedConcept =
      concepts[i % concepts.length] || `${slideTitle} components`;

    // Generate the question using the template
    const templateFn = templates[templateIndex];
    const question = templateFn(mainTopic, relatedConcept);

    // Generate correct answer based on the context
    let correctAnswer = "";
    if (learningSpeed === "slow") {
      correctAnswer = `${slideTitle} ${
        keyTerms[i % keyTerms.length] || "concepts"
      } are important for understanding the basic principles`;
    } else if (learningSpeed === "moderate") {
      correctAnswer = `${mainTopic} works effectively when applied with consideration for ${relatedConcept}`;
    } else {
      correctAnswer = `${mainTopic} must be analyzed within the broader context of ${relatedConcept} while considering various theoretical perspectives`;
    }

    // Generate sentence-specific correct answer if we have enough content
    if (sentences[i]) {
      const sentenceWords = sentences[i]
        .split(/\s+/)
        .filter((w) => w.length > 3);
      if (sentenceWords.length >= 5) {
        const sentenceBasedAnswer = `${sentenceWords
          .slice(0, Math.min(12, sentenceWords.length))
          .join(" ")}`;
        if (sentenceBasedAnswer.length > 20) {
          correctAnswer = sentenceBasedAnswer;
        }
      }
    }

    // Generate answer options (including the correct answer)
    const answerContext = sentences.slice(
      Math.max(0, i - 1),
      Math.min(sentences.length, i + 2)
    );
    const options = generateAnswerOptions(
      question,
      correctAnswer,
      answerContext,
      learningSpeed
    );

    // Find the index of the correct answer in the shuffled options
    const correctAnswerIndex = options.indexOf(correctAnswer);

    // Determine the question type for better explanations
    const questionType = determineQuestionType(question);

    // Generate better explanation using our new function
    const explanation = generateDetailedExplanation(
      mainTopic,
      correctAnswer,
      questionType,
      learningSpeed
    );

    // Add the question to our list
    questions.push({
      question,
      options,
      correctAnswer: correctAnswerIndex,
      explanation,
    });
  }

  // If we couldn't generate enough questions, add generic ones
  while (questions.length < numQuestions) {
    const index = questions.length;
    const templateIndex = index % templates.length;
    const mainTopic = slideTitle;
    const relatedConcept =
      concepts[index % Math.max(1, concepts.length)] ||
      `${slideTitle} components`;

    const templateFn = templates[templateIndex];
    const question = templateFn(mainTopic, relatedConcept);

    // Generic correct answer
    let correctAnswer = "";
    if (learningSpeed === "slow") {
      correctAnswer = `${slideTitle} helps users understand key educational concepts more effectively`;
    } else if (learningSpeed === "moderate") {
      correctAnswer = `${mainTopic} provides a framework for approaching ${relatedConcept} in educational settings`;
    } else {
      correctAnswer = `${mainTopic} requires critical analysis of ${relatedConcept} within various theoretical frameworks`;
    }

    // Generate options
    const options = generateAnswerOptions(
      question,
      correctAnswer,
      [slideTitle, relatedConcept],
      learningSpeed
    );
    const correctAnswerIndex = options.indexOf(correctAnswer);

    // Generic explanation
    const explanation = `This answer correctly captures the relationship between ${mainTopic} and ${relatedConcept} at an appropriate level of complexity.`;

    questions.push({
      question,
      options,
      correctAnswer: correctAnswerIndex,
      explanation,
    });
  }

  return questions;
}

export async function GET() {
  try {
    // Return the current list of generated quizzes
    return NextResponse.json(generatedQuizzes);
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}

// API route for getting a quiz based on learning speed
export async function POST(request: NextRequest) {
  try {
    console.log("Quiz generation API called");
    const supabase = createServerSupabaseClient();

    // Verify authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      console.error("Quiz API: Unauthorized - No session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Quiz API: User authenticated", session.user.id);

    // Get the request body
    const body = await request.json();
    console.log("Quiz API: Request body", body);
    const { slideId, slideTitle, courseId } = body;

    if (!slideId || !slideTitle || !courseId) {
      console.error("Quiz API: Missing required fields", {
        slideId,
        slideTitle,
        courseId,
      });
      return NextResponse.json(
        { error: "Missing required fields: slideId, slideTitle, or courseId" },
        { status: 400 }
      );
    }

    // Check if quiz already exists for this slide and user
    try {
      const { data: existingQuiz, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("slide_id", slideId)
        .eq("user_id", session.user.id)
        .single();

      console.log("Quiz API: Checking existing quiz", {
        existingQuiz,
        error: quizError,
      });

      if (!quizError && existingQuiz) {
        // Return the existing quiz
        return NextResponse.json({
          message: "Quiz already exists",
          quizId: existingQuiz.id,
          cached: true,
        });
      }
    } catch (checkError) {
      console.error("Quiz API: Error checking existing quiz", checkError);
    }

    // Get user's learning speed classification
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("learning_speed, is_classified")
        .eq("user_id", session.user.id)
        .single();

      console.log("Quiz API: User profile", { profile, error: profileError });

      if (profileError) {
        console.error("Quiz API: Failed to get user profile", profileError);
        return NextResponse.json(
          { error: "Failed to get user profile" },
          { status: 500 }
        );
      }

      // Default to moderate if not classified
      const learningSpeed = profile?.is_classified
        ? profile.learning_speed
        : "moderate";

      console.log("Quiz API: Learning speed", learningSpeed);

      // Get slide content
      const { data: slide, error: slideError } = await supabase
        .from("slides")
        .select("title, description")
        .eq("id", slideId)
        .single();

      console.log("Quiz API: Slide data", { slide, error: slideError });

      if (slideError || !slide) {
        console.error("Quiz API: Failed to get slide data", slideError);
        return NextResponse.json(
          { error: "Failed to get slide data" },
          { status: 404 }
        );
      }

      // Use slide title and description as content
      const slideContent = slide.description || `Content about ${slideTitle}`;

      // Generate adaptive questions
      console.log("Quiz API: Generating questions");
      const questions = generateAdaptiveQuestions(
        slideTitle,
        slideContent,
        learningSpeed
      );

      // Create quiz object
      const quiz: GeneratedQuiz = {
        title: slideTitle,
        slideId,
        courseId,
        userId: session.user.id,
        questions,
        difficulty: learningSpeed,
      };

      console.log("Quiz API: Created quiz object");

      // Save quiz to database
      try {
        // Default time limit based on learning speed
        const timeLimit =
          learningSpeed === "slow" ? 30 : learningSpeed === "fast" ? 15 : 20;

        console.log("Quiz API: Inserting quiz into database", {
          title: quiz.title,
          slide_id: quiz.slideId,
          course_id: quiz.courseId,
          user_id: quiz.userId,
          difficulty: quiz.difficulty,
          time_limit: timeLimit,
        });

        const { data: savedQuiz, error: saveError } = await supabase
          .from("quizzes")
          .insert([
            {
              title: quiz.title,
              slide_id: quiz.slideId,
              course_id: quiz.courseId,
              user_id: quiz.userId,
              questions: quiz.questions,
              difficulty: quiz.difficulty,
              time_limit: timeLimit,
              question_count: quiz.questions.length,
              created_at: new Date().toISOString(),
              // Include all potential required fields with default values
              description: `A quiz generated for ${slideTitle}`,
              is_public: false,
              status: "active",
            },
          ])
          .select()
          .single();

        if (saveError) {
          console.error("Quiz API: Error saving quiz", saveError);
          return NextResponse.json(
            { error: `Failed to save quiz: ${saveError.message}` },
            { status: 500 }
          );
        }

        console.log("Quiz API: Quiz saved successfully", savedQuiz);
        return NextResponse.json({
          message: "Quiz generated successfully",
          quizId: savedQuiz.id,
          quiz: savedQuiz,
        });
      } catch (saveError) {
        console.error("Quiz API: Exception when saving quiz", saveError);
        return NextResponse.json(
          { error: `Exception saving quiz: ${saveError}` },
          { status: 500 }
        );
      }
    } catch (profileError) {
      console.error("Quiz API: Exception when getting profile", profileError);
      return NextResponse.json(
        { error: `Exception getting profile: ${profileError}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Quiz API: Unhandled error", error);
    return NextResponse.json(
      { error: `An error occurred while generating the quiz: ${error}` },
      { status: 500 }
    );
  }
}

// API endpoint to delete a quiz
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Verify authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get quiz ID from URL
    const url = new URL(request.url);
    const quizId = url.searchParams.get("id");

    if (!quizId) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400 }
      );
    }

    // Check if the quiz exists and belongs to the user
    const { data: quiz, error: fetchError } = await supabase
      .from("quizzes")
      .select("id")
      .eq("id", quizId)
      .eq("user_id", session.user.id)
      .single();

    if (fetchError || !quiz) {
      return NextResponse.json(
        { error: "Quiz not found or you don't have permission to delete it" },
        { status: 404 }
      );
    }

    // Delete the quiz
    const { error: deleteError } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", quizId)
      .eq("user_id", session.user.id);

    if (deleteError) {
      console.error("Error deleting quiz:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete quiz" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    return NextResponse.json(
      { error: "An error occurred while deleting the quiz" },
      { status: 500 }
    );
  }
}

// API route for submitting classification test results
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Verify authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the request body
    const body = await request.json();
    const { testResponses } = body;

    if (!testResponses) {
      return NextResponse.json(
        { error: "Test responses are required" },
        { status: 400 }
      );
    }

    // Use model bridge to classify the user
    let learningSpeed;
    try {
      const result = await callModelBridge("classify_user", {
        responses: testResponses,
      });
      learningSpeed = result.learning_speed;
    } catch (error) {
      console.error("Error calling model bridge:", error);
      // Fallback to mock classification
      learningSpeed = classifyUserMock(testResponses);
    }

    // Update user profile with classification
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        learning_speed: learningSpeed,
        is_classified: true,
      })
      .eq("user_id", session.user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update user classification" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      learning_speed: learningSpeed,
    });
  } catch (error) {
    console.error("Error processing classification:", error);
    return NextResponse.json(
      { error: "An error occurred while processing the classification" },
      { status: 500 }
    );
  }
}
