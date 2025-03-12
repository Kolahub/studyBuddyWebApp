import { NextResponse } from "next/server";

// This simulates a server-side storage for the generated quizzes
// In a real application, this would be stored in a database
let generatedQuizzes: any[] = [];

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slideId, slideTitle, courseId } = body;

    if (!slideId || !slideTitle) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate a new quiz with the slide information
    const newQuiz = {
      id: `quiz-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: `Quiz on ${slideTitle}`,
      description: `Test your knowledge on ${slideTitle}`,
      time_limit: Math.floor(Math.random() * 10) + 10, // Random time between 10-20 minutes
      question_count: Math.floor(Math.random() * 10) + 5, // Random count between 5-15 questions
      created_at: new Date().toISOString(),
      slide_id: slideId,
      course_id: courseId || "General",
    };

    // Add the new quiz to our simulated storage
    generatedQuizzes.push(newQuiz);

    return NextResponse.json(newQuiz);
  } catch (error) {
    console.error("Error generating quiz:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
