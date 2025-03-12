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
import { Clock, FileText, RefreshCw, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorMessage } from "@/components/ui/error-message";
import { useToast } from "@/components/ui/use-toast";

interface Quiz {
  id: string;
  title: string;
  description: string;
  time_limit: number;
  question_count: number;
  created_at: string;
}

export function QuizzesClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchQuizzes = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the Supabase fallback for now until the API endpoint is implemented
      // Later, replace with: const { data, error } = await api.getQuizzes();
      const response = await fetch("/api/quizzes");
      if (!response.ok) {
        throw new Error("Failed to fetch quizzes");
      }

      const data = await response.json();
      setQuizzes(data);
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
                <CardTitle>{quiz.title}</CardTitle>
                <CardDescription>{quiz.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{quiz.time_limit} minutes</span>
                </div>
                <div className="mt-2 flex items-center space-x-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{quiz.question_count} questions</span>
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Generated
                  </Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/quizzes/${quiz.id}`}>Start Quiz</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
