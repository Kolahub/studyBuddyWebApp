import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell } from "@/components/dashboard/shell";
import { DashboardAuthFallback } from "@/components/dashboard/auth-fallback";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Trophy,
  Brain,
  ChevronRight,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Loader2 } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Loading component for Suspense
function DashboardLoading() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Dashboard" text="Loading your dashboard..." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </CardHeader>
            <CardContent>
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}

export default async function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}

// Separate async component to handle data fetching
async function DashboardContent() {
  const supabase = createServerSupabaseClient();

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If no session, use client-side fallback
  if (!session) {
    return <DashboardAuthFallback />;
  }

  // Fetch user profile
  let profile = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single();
    profile = data;
  } catch (error) {
    profile = null;
  }

  // Check if user is classified
  const isClassified = profile?.is_classified || false;
  const learningSpeed = profile?.learning_speed || "moderate";

  // Only fetch additional data if the user is classified
  let recentQuizzes = [];
  let recommendations = [];
  let progressPercentage = 0;
  let contentProgress = { viewed: 0, completed: 0 };

  if (isClassified) {
    // Fetch recent quizzes
    try {
      const { data } = await supabase
        .from("quiz_submissions")
        .select("*, quizzes(title)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(3);
      recentQuizzes = data || [];
    } catch (error) {
      recentQuizzes = [];
    }

    // Fetch content progress statistics with improved logging
    try {
      console.log(
        "Fetching content progress for dashboard. User ID:",
        session.user.id
      );
      const { data: progressData, error: progressError } = await supabase
        .from("content_progress")
        .select("*")
        .eq("user_id", session.user.id);

      if (progressError) {
        console.error("Error fetching content progress:", progressError);
      } else {
        console.log(
          `Retrieved ${progressData?.length || 0} content progress records`
        );

        if (progressData) {
          const completed = progressData.filter(
            (item) => item.completed
          ).length;
          console.log(
            `Progress stats: ${progressData.length} viewed, ${completed} completed`
          );

          contentProgress = {
            viewed: progressData.length,
            completed: completed,
          };
        }
      }
    } catch (error) {
      console.error("Exception in content progress fetch:", error);
    }

    // Fetch recommended content based on classification
    try {
      const { data } = await supabase
        .from("recommendations")
        .select("*")
        .eq("classification", learningSpeed || "moderate")
        .limit(3);
      recommendations = data || [];
    } catch (error) {
      recommendations = [];
    }

    // Calculate course progress based on completed content and quizzes
    try {
      // Fetch total content items
      const { data: totalContent } = await supabase
        .from("slides")
        .select("id", { count: "exact" });

      // Calculate progress percentage
      const totalItems =
        (totalContent?.length || 0) + (recentQuizzes?.length || 0);
      const completedItems =
        (contentProgress.completed || 0) + (recentQuizzes?.length || 0);

      if (totalItems > 0) {
        progressPercentage = Math.round((completedItems / totalItems) * 100);
      }
    } catch (error) {
      console.error("Error calculating progress:", error);
      progressPercentage = 0;
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Dashboard"
        text={`Welcome back, ${profile?.name || "Student"}!`}
      />

      {!isClassified ? (
        // Show classification notice for unclassified users
        <div className="mb-8">
          <Alert className="bg-primary/10 border-primary">
            <Brain className="h-5 w-5 text-primary" />
            <AlertTitle className="text-lg font-semibold">
              Complete Your Learning Style Assessment
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-4">
                Before accessing personalized content, please take our quick
                learning style assessment. This will help us tailor quizzes,
                summaries, and flashcards to your preferred learning speed.
              </p>
              <Button asChild size="lg">
                <Link href="/classification-test">
                  Take Assessment Now <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>

          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Why Take the Assessment?</CardTitle>
                <CardDescription>
                  Our adaptive learning platform personalizes content based on
                  your learning style
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <div className="rounded-full bg-primary/10 p-2 w-10 h-10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-medium">Personalized Pacing</h3>
                    <p className="text-sm text-muted-foreground">
                      Content adapts to your preferred learning speed
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-full bg-primary/10 p-2 w-10 h-10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-medium">Tailored Content</h3>
                    <p className="text-sm text-muted-foreground">
                      Summaries and flashcards matched to your needs
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-full bg-primary/10 p-2 w-10 h-10 flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-medium">Better Results</h3>
                    <p className="text-sm text-muted-foreground">
                      Improve retention with content that works for you
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-muted-foreground">
                  The assessment takes less than 2 minutes to complete
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      ) : (
        // Show analytics and content for classified users
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Learning Speed
                </CardTitle>
                <div className="h-4 w-4 text-primary">
                  <Clock className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">
                  {learningSpeed}
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on your assessment results
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Quizzes Completed
                </CardTitle>
                <div className="h-4 w-4 text-primary">
                  <BookOpen className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {recentQuizzes?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Keep going to improve your knowledge
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Score
                </CardTitle>
                <Trophy className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {recentQuizzes?.length
                    ? Math.round(
                        recentQuizzes.reduce(
                          (acc, quiz) => acc + quiz.score,
                          0
                        ) / recentQuizzes.length
                      )
                    : 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Your quiz performance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Content Viewed
                </CardTitle>
                <div className="h-4 w-4 text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" />
                  </svg>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {contentProgress.viewed}
                </div>
                <p className="text-xs text-muted-foreground">
                  {contentProgress.completed} items completed
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Course Progress
                </CardTitle>
                <div className="h-4 w-4 text-primary">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{progressPercentage}%</div>
                <Progress
                  value={progressPercentage}
                  className="h-2 mt-2"
                  indicatorColor="bg-primary"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  <a href="/progress" className="text-primary hover:underline">
                    View detailed progress →
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recommended Content</CardTitle>
                <CardDescription>
                  Based on your {learningSpeed} learning speed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recommendations?.length ? (
                  <div className="space-y-4">
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="flex items-start space-x-4">
                        <div className="rounded-md bg-primary/10 p-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {rec.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {rec.description}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/content/${rec.id}`}>View</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Complete more quizzes to get personalized recommendations.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Quizzes</CardTitle>
                <CardDescription>Your latest quiz attempts</CardDescription>
              </CardHeader>
              <CardContent>
                {recentQuizzes?.length ? (
                  <div className="space-y-4">
                    {recentQuizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {quiz.quizzes?.title || "Quiz"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(quiz.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-sm font-medium ${
                              quiz.score >= 70
                                ? "text-green-500"
                                : quiz.score >= 50
                                ? "text-amber-500"
                                : "text-red-500"
                            }`}
                          >
                            {quiz.score}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    You haven't taken any quizzes yet. Start learning to see
                    your progress!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
