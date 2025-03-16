import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell } from "@/components/dashboard/shell";
import { QuizComponent } from "@/components/quiz/quiz-component";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface QuizPageProps {
  params: {
    id: string;
  };
}

export default async function QuizPage({ params }: QuizPageProps) {
  const supabase = createServerSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch quiz details - questions are now stored directly in the quiz object
  const { data: quiz, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !quiz) {
    console.error("Quiz not found:", error);
    redirect("/quizzes");
  }

  // Ensure the quiz belongs to the current user
  if (quiz.user_id !== session.user.id) {
    redirect("/quizzes");
  }

  // Get course name for display
  const { data: courseData } = await supabase
    .from("slides")
    .select("course_id")
    .eq("id", quiz.slide_id)
    .single();

  const courseId = courseData?.course_id || quiz.course_id;

  return (
    <DashboardShell>
      <div className="grid gap-8">
        <div>
          <DashboardHeader
            heading={quiz.title}
            text={`Questions: ${quiz.questions.length} | Course: ${courseId}`}
            suppressHydrationWarning={true}
          >
            {!quiz.submitted && (
              <div className="flex items-center space-x-2">
                <Button variant="outline" asChild>
                  <Link href="/quizzes">Cancel</Link>
                </Button>
              </div>
            )}
          </DashboardHeader>
        </div>
      </div>
      <div className="grid gap-4">
        <QuizComponent quiz={quiz} userId={session.user.id} />
      </div>
    </DashboardShell>
  );
}
