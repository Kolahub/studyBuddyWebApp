import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  BookOpen,
  Trophy,
  Clock,
  Brain,
  ChevronRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Learning Progress - Study Buddy",
  description: "Track your learning progress and performance",
};

export default async function ProgressPage() {
  const supabase = createServerSupabaseClient();

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch user profile to check classification status
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_classified")
    .eq("user_id", session.user.id)
    .single();

  const isClassified = profile?.is_classified || false;

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Your Learning Progress</h1>

      {!isClassified ? (
        // Show message for unclassified users
        <div className="mb-8">
          <Alert className="bg-primary/10 border-primary">
            <Brain className="h-5 w-5 text-primary" />
            <AlertTitle className="text-lg font-semibold">
              Complete Your Learning Style Assessment First
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-4">
                To access your personalized learning progress and analytics, you
                need to complete the learning style assessment. This will help
                us tailor your learning experience.
              </p>
              <Button asChild size="lg">
                <Link href="/classification-test">
                  Take Assessment Now <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        // Show progress content for classified users
        <ProgressContent userId={session.user.id} />
      )}
    </div>
  );
}

async function ProgressContent({ userId }: { userId: string }) {
  const supabase = createServerSupabaseClient();

  // Fetch quiz submissions
  let quizzes = [];
  try {
    console.log("Fetching quiz submissions for user:", userId);
    const { data, error } = await supabase
      .from("quiz_submissions")
      .select("*, quizzes(title)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching quiz data:", error);
    } else {
      console.log(`Retrieved ${data?.length || 0} quiz submissions`);
      quizzes = data || [];
    }
  } catch (error) {
    console.error("Exception fetching quiz data:", error);
    quizzes = [];
  }

  // Fetch content progress with detailed logging
  let contentProgress = [];
  try {
    console.log("Fetching content progress for user:", userId);
    const { data, error } = await supabase
      .from("content_progress")
      .select("*, slides(title, course_id)")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching content progress:", error);
    } else {
      console.log(`Retrieved ${data?.length || 0} content progress records`);
      contentProgress = data || [];
    }
  } catch (error) {
    console.error("Exception fetching content progress:", error);
    contentProgress = [];
  }

  // Fetch total content items
  let totalContent = 0;
  try {
    console.log("Fetching total content count");
    const { count, error } = await supabase
      .from("slides")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Error fetching total content:", error);
    } else {
      console.log(`Total content count: ${count || 0}`);
      totalContent = count || 0;
    }
  } catch (error) {
    console.error("Exception fetching total content:", error);
  }

  // Count completed content items (where completed = true)
  const completedContentCount = contentProgress.filter(
    (item) => item.completed === true
  ).length;

  // Calculate overall progress
  const totalItems = totalContent + (quizzes?.length || 0);
  const completedItems = completedContentCount + (quizzes?.length || 0);
  const progressPercentage =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Calculate average quiz score
  const averageScore = quizzes.length
    ? Math.round(
        quizzes.reduce((acc, quiz) => acc + quiz.score, 0) / quizzes.length
      )
    : 0;

  console.log("Progress metrics:", {
    totalContent,
    totalContentProgress: contentProgress.length,
    completedContentCount,
    quizCount: quizzes.length,
    totalItems,
    completedItems,
    progressPercentage,
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overall Progress
            </CardTitle>
            <LineChart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressPercentage}%</div>
            <Progress value={progressPercentage} className="h-2 my-2" />
            <p className="text-xs text-muted-foreground">
              Completed {completedItems} of {totalItems} items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Content Completion
            </CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalContent > 0
                ? Math.round((completedContentCount / totalContent) * 100)
                : 0}
              %
            </div>
            <Progress
              value={
                totalContent > 0
                  ? (completedContentCount / totalContent) * 100
                  : 0
              }
              className="h-2 my-2"
            />
            <p className="text-xs text-muted-foreground">
              Viewed {contentProgress.length} slides, completed{" "}
              {completedContentCount} of {totalContent} slides
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Quiz Performance
            </CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore}%</div>
            <Progress value={averageScore} className="h-2 my-2" />
            <p className="text-xs text-muted-foreground">
              Completed {quizzes.length} quizzes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Quiz Activity</CardTitle>
            <CardDescription>
              Your recent quiz submissions and scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quizzes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quiz</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Time Taken</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quizzes.slice(0, 5).map((quiz) => (
                    <TableRow key={quiz.id}>
                      <TableCell className="font-medium">
                        {quiz.quizzes?.title || "Unknown Quiz"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{quiz.score}%</span>
                          <Progress value={quiz.score} className="h-2 w-16" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>
                            {Math.floor(quiz.time_taken / 60)}m{" "}
                            {quiz.time_taken % 60}s
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(quiz.created_at), {
                          addSuffix: true,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No quiz submissions yet. Start taking quizzes to track your
                progress!
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Progress</CardTitle>
            <CardDescription>
              Your progress through course content
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contentProgress.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Content</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Viewed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contentProgress.slice(0, 5).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.slides?.title || "Unknown Content"}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                          Completed
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(item.updated_at), {
                          addSuffix: true,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No content viewed yet. Start exploring our learning materials!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
