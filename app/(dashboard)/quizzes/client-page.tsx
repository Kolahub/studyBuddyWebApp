"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell } from "@/components/dashboard/shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Clock,
  FileText,
  RefreshCw,
  Sparkles,
  BookOpen,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorMessage } from "@/components/ui/error-message";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useSupabase } from "@/lib/supabase/provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Quiz {
  id: string;
  title: string;
  slide_id: string;
  course_id: string;
  questions: QuizQuestion[];
  difficulty: string;
  score?: number;
  submitted: boolean;
  created_at: string;
}

export function QuizzesClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);

  const fetchQuizzes = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch quizzes from Supabase
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setQuizzes(data || []);
    } catch (err) {
      console.error("Error fetching quizzes:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to load quizzes")
      );
      toast({
        title: "Error",
        description: "Failed to load quizzes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleRefresh = () => {
    toast({
      title: "Refreshing",
      description: "Fetching the latest quizzes...",
    });
    fetchQuizzes();
  };

  // Function to delete a quiz
  const deleteQuiz = async (quiz: Quiz) => {
    setQuizToDelete(quiz);
    setDeleteDialogOpen(true);
  };

  // Function to confirm and execute quiz deletion
  const confirmDeleteQuiz = async () => {
    if (!quizToDelete) return;

    setIsDeleting(quizToDelete.id);

    try {
      const response = await fetch(`/api/quizzes?id=${quizToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete quiz");
      }

      // Remove the deleted quiz from the state
      setQuizzes(quizzes.filter((q) => q.id !== quizToDelete.id));

      toast({
        title: "Quiz Deleted",
        description: "The quiz has been successfully deleted.",
      });
    } catch (err) {
      console.error("Error deleting quiz:", err);
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete quiz",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
      setDeleteDialogOpen(false);
      setQuizToDelete(null);
    }
  };

  // Get formated time since quiz creation
  const getTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return "Unknown time";
    }
  };

  // Get difficulty badge color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "slow":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "moderate":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "fast":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Quizzes"
        text="Take AI-generated quizzes based on your content to test your knowledge."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </DashboardHeader>

      {isLoading && (
        <div className="flex justify-center items-center min-h-[200px]">
          <LoadingSpinner size="lg" text="Loading quizzes..." />
        </div>
      )}

      {error && (
        <div className="my-4">
          <ErrorMessage
            message={error.message}
            variant="destructive"
            onDismiss={() => setError(null)}
          />
          <Button variant="outline" className="mt-2" onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      )}

      {!isLoading && !error && quizzes.length === 0 && (
        <Card className="my-4">
          <CardHeader>
            <CardTitle>No Quizzes Available</CardTitle>
            <CardDescription>
              You haven't generated any quizzes yet. To create a quiz:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Go to your content page</li>
              <li>Find a slide you want to create a quiz for</li>
              <li>Click the "Create Quiz" button with the sparkles icon</li>
              <li>Wait for the AI to generate your quiz</li>
              <li>Your quiz will appear on this page</li>
            </ol>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/content">
                <Sparkles className="h-4 w-4 mr-2" />
                Go to Content
              </Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      {!isLoading && !error && quizzes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="line-clamp-1">{quiz.title}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  <span className="truncate">{quiz.course_id}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{getTimeAgo(quiz.created_at)}</span>
                </div>
                <div className="mt-2 flex items-center space-x-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{quiz.questions.length} questions</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${getDifficultyColor(quiz.difficulty)}`}
                  >
                    {quiz.difficulty === "slow"
                      ? "Basic"
                      : quiz.difficulty === "moderate"
                      ? "Intermediate"
                      : "Advanced"}{" "}
                    Difficulty
                  </Badge>
                  {quiz.submitted && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-yellow-100 text-yellow-800"
                    >
                      Score: {quiz.score || 0}%
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button asChild className="w-full">
                  <Link href={`/quizzes/${quiz.id}`}>
                    {quiz.submitted ? "Review Quiz" : "Start Quiz"}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => deleteQuiz(quiz)}
                  disabled={isDeleting === quiz.id}
                >
                  {isDeleting === quiz.id ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Quiz
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Delete Quiz
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the quiz "{quizToDelete?.title}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteQuiz}
              disabled={isDeleting !== null}
            >
              {isDeleting ? (
                <LoadingSpinner size="sm" text="Deleting..." />
              ) : (
                "Delete Quiz"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
