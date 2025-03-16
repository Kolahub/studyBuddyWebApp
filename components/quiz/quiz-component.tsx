"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { useSupabase } from "@/lib/supabase/provider";

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
  user_id: string;
  questions: QuizQuestion[];
  difficulty: string;
  score?: number;
  submitted: boolean;
  created_at: string;
}

interface QuizComponentProps {
  quiz: Quiz;
  userId: string;
}

export function QuizComponent({ quiz, userId }: QuizComponentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(quiz.submitted);
  const [reviewMode, setReviewMode] = useState(quiz.submitted);

  // Initialize answers array
  useEffect(() => {
    if (answers.length === 0 && quiz.questions) {
      // Initialize with -1 (no answer selected)
      setAnswers(new Array(quiz.questions.length).fill(-1));
    }
  }, [quiz.questions, answers.length]);

  const handleAnswer = (value: string) => {
    const answerIndex = parseInt(value, 10);
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateScore = (): number => {
    if (!quiz.questions || quiz.questions.length === 0) return 0;

    let correctCount = 0;
    answers.forEach((answer, index) => {
      if (answer === quiz.questions[index].correctAnswer) {
        correctCount++;
      }
    });

    return Math.round((correctCount / quiz.questions.length) * 100);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Check if all questions are answered
    if (answers.includes(-1)) {
      toast({
        title: "Incomplete Quiz",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const score = calculateScore();
      console.log("Calculated score:", score);

      // Update quiz with submission status and score
      console.log("Updating quiz with score:", {
        quizId: quiz.id,
        userId,
        score,
      });
      const { error } = await supabase
        .from("quizzes")
        .update({
          submitted: true,
          score,
        })
        .eq("id", quiz.id)
        .eq("user_id", userId);

      if (error) {
        console.error("Error updating quiz record:", error);
        throw new Error(`Error updating quiz: ${error.message}`);
      }

      console.log("Quiz updated successfully, now saving submission");

      // Handle quiz_submissions separately with better error handling
      try {
        // First check if a submission already exists and delete it
        console.log("Checking for existing submission:", {
          quizId: quiz.id,
          userId,
        });
        const { error: deleteError } = await supabase
          .from("quiz_submissions")
          .delete()
          .eq("quiz_id", quiz.id)
          .eq("user_id", userId);

        if (deleteError) {
          console.warn("Could not delete existing submission:", deleteError);
          // Continue anyway - it might not exist
        }

        // Prepare simplified submission data
        const submissionData = {
          quiz_id: quiz.id,
          user_id: userId,
          answers: JSON.stringify(answers), // Convert array to JSON string
          score,
          time_taken: 0, // Add default time_taken to satisfy NOT NULL constraint
        };

        console.log("Inserting submission with data:", submissionData);

        // Now insert a new record
        const { data: insertData, error: insertError } = await supabase
          .from("quiz_submissions")
          .insert(submissionData)
          .select();

        if (insertError) {
          console.error("Error saving submission:", insertError);

          // More specific error handling based on error type
          if (insertError.code === "23505") {
            // Unique violation - submission already exists
            console.log("Submission already exists, attempting update instead");

            // Try an update instead of upsert
            const { data: updateData, error: updateError } = await supabase
              .from("quiz_submissions")
              .update({
                answers: JSON.stringify(answers),
                score,
              })
              .eq("quiz_id", quiz.id)
              .eq("user_id", userId)
              .select();

            if (updateError) {
              console.error("Error updating submission:", updateError);
              throw new Error(
                `Failed to update submission: ${updateError.message}`
              );
            } else {
              console.log("Submission updated successfully:", updateData);
              toast({
                title: "Quiz Submitted",
                description: `Your score: ${score}%`,
              });
            }
          } else {
            // For other types of errors
            throw new Error(
              `Failed to save submission: ${insertError.message}`
            );
          }
        } else {
          console.log("Submission saved successfully:", insertData);
          toast({
            title: "Quiz Submitted",
            description: `Your score: ${score}%`,
          });
        }

        // If we got here, the submission was successful
        setQuizSubmitted(true);
        setReviewMode(true);
      } catch (submissionError) {
        console.error("Detailed submission error:", submissionError);

        // Still set quiz as submitted, just without detailed answers
        setQuizSubmitted(true);
        setReviewMode(true);

        toast({
          title: "Partial Success",
          description:
            "Your score was saved, but we couldn't store your detailed answers. " +
            (submissionError instanceof Error ? submissionError.message : ""),
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Complete error submitting quiz:", error);
      toast({
        title: "Submission Failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not submit your quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (quiz.questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz Error</CardTitle>
          <CardDescription>This quiz has no questions.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => router.push("/quizzes")}>
            Back to Quizzes
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const question = quiz.questions[currentQuestion];
  const userAnswer = answers[currentQuestion];
  const isAnswered = userAnswer !== -1;
  const isCorrect = reviewMode && userAnswer === question.correctAnswer;

  const progressPercentage =
    ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <Progress
          value={progressPercentage}
          className="h-2"
          suppressHydrationWarning
        />
        <span
          className="text-sm text-muted-foreground whitespace-nowrap"
          suppressHydrationWarning
        >
          {currentQuestion + 1} / {quiz.questions.length}
        </span>
      </div>

      {/* Question card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl" suppressHydrationWarning>
            Question {currentQuestion + 1}
          </CardTitle>
          <CardDescription
            className="text-lg font-medium pt-2"
            suppressHydrationWarning
          >
            {question.question}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={userAnswer?.toString() || ""}
            onValueChange={!reviewMode ? handleAnswer : undefined}
            className="space-y-3"
            suppressHydrationWarning
          >
            {question.options.map((option, index) => (
              <div
                key={index}
                className={`flex items-center space-x-2 rounded-md border p-3 ${
                  reviewMode && index === question.correctAnswer
                    ? "border-green-500 bg-green-50"
                    : reviewMode &&
                      userAnswer === index &&
                      userAnswer !== question.correctAnswer
                    ? "border-red-500 bg-red-50"
                    : ""
                }`}
                suppressHydrationWarning
              >
                <RadioGroupItem
                  value={index.toString()}
                  id={`option-${index}`}
                  disabled={reviewMode}
                  suppressHydrationWarning
                />
                <Label
                  htmlFor={`option-${index}`}
                  className="flex-1 cursor-pointer text-base"
                  suppressHydrationWarning
                >
                  {option}
                </Label>
                {reviewMode && index === question.correctAnswer && (
                  <CheckCircle
                    className="h-5 w-5 text-green-500"
                    suppressHydrationWarning
                  />
                )}
                {reviewMode &&
                  userAnswer === index &&
                  userAnswer !== question.correctAnswer && (
                    <XCircle
                      className="h-5 w-5 text-red-500"
                      suppressHydrationWarning
                    />
                  )}
              </div>
            ))}
          </RadioGroup>

          {/* Only show explanation in review mode (after submission) */}
          {reviewMode && (
            <div
              className="mt-6 rounded-md bg-muted p-4"
              suppressHydrationWarning
            >
              <h4 className="font-medium mb-1">Explanation:</h4>
              <div className="space-y-3">
                <p
                  className="font-medium text-green-600"
                  suppressHydrationWarning
                >
                  Correct Answer: Option{" "}
                  {String.fromCharCode(65 + question.correctAnswer)} -{" "}
                  {question.options[question.correctAnswer]}
                </p>
                <p suppressHydrationWarning>{question.explanation}</p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between gap-2">
          <div>
            <Button
              variant="outline"
              onClick={previousQuestion}
              disabled={currentQuestion === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
          </div>
          <div className="flex gap-2">
            {currentQuestion < quiz.questions.length - 1 ? (
              <Button
                onClick={nextQuestion}
                disabled={!isAnswered && !reviewMode}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : !quizSubmitted ? (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !isAnswered}
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner className="mr-2" />
                    Submitting...
                  </>
                ) : (
                  "Submit Quiz"
                )}
              </Button>
            ) : (
              <Button onClick={() => router.push("/quizzes")}>
                Back to Quizzes
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Results section (only shown after submission) */}
      {quizSubmitted && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle>Quiz Results</CardTitle>
            <CardDescription suppressHydrationWarning>
              You scored {quiz.score || calculateScore()}% on this quiz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Progress
                value={quiz.score || calculateScore()}
                className="h-3"
                indicatorColor={
                  (quiz.score || calculateScore()) >= 80
                    ? "bg-green-500"
                    : (quiz.score || calculateScore()) >= 60
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }
                suppressHydrationWarning
              />
              <p
                className="text-sm text-muted-foreground"
                suppressHydrationWarning
              >
                {(quiz.score || calculateScore()) >= 80
                  ? "Excellent! You have a good understanding of this topic."
                  : (quiz.score || calculateScore()) >= 60
                  ? "Good job! You're on the right track."
                  : "You might want to review this topic again."}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Review each question above to see the correct answers and
                explanations.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
