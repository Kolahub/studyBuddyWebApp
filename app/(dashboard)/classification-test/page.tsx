"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/lib/supabase/provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Brain } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Classification test questions
const questions = [
  {
    id: 1,
    question: "How quickly do you typically read and comprehend new materials?",
    options: [
      {
        value: "slow",
        label:
          "I read thoroughly and may re-read sections to ensure complete understanding",
      },
      {
        value: "moderate",
        label:
          "I read at an average pace, occasionally pausing on complex sections",
      },
      {
        value: "fast",
        label:
          "I scan material quickly and can extract key information rapidly",
      },
    ],
  },
  {
    id: 2,
    question: "When studying a complex concept, what approach do you prefer?",
    options: [
      {
        value: "slow",
        label: "Step-by-step explanations with many detailed examples",
      },
      {
        value: "moderate",
        label: "A balance of conceptual explanations and practical examples",
      },
      {
        value: "fast",
        label:
          "Brief theoretical explanations followed by challenging applications",
      },
    ],
  },
  {
    id: 3,
    question: "How do you typically handle information retention?",
    options: [
      {
        value: "slow",
        label:
          "I need multiple exposures to information with spaced repetition",
      },
      {
        value: "moderate",
        label: "I remember most content after a couple of review sessions",
      },
      {
        value: "fast",
        label: "I often recall information accurately after a single exposure",
      },
    ],
  },
  {
    id: 4,
    question:
      "What is your optimal content length preference for learning sessions?",
    options: [
      {
        value: "slow",
        label:
          "Shorter, more focused sessions with frequent breaks (15-20 minutes)",
      },
      {
        value: "moderate",
        label: "Medium-length focused study periods (30-45 minutes)",
      },
      {
        value: "fast",
        label:
          "Extended, intensive study sessions (60+ minutes without breaks)",
      },
    ],
  },
  {
    id: 5,
    question: "How do you approach new problem-solving tasks?",
    options: [
      {
        value: "slow",
        label:
          "I methodically analyze problems and consider multiple approaches before starting",
      },
      {
        value: "moderate",
        label: "I spend some time planning, then adjust my approach as needed",
      },
      {
        value: "fast",
        label:
          "I quickly identify patterns and jump into solving with rapid iterations",
      },
    ],
  },
  {
    id: 6,
    question:
      "When consuming educational videos, what speed setting do you typically use?",
    options: [
      {
        value: "slow",
        label: "0.75x or 1x speed, often pausing to take notes",
      },
      {
        value: "moderate",
        label: "1x speed, occasionally pausing at complex points",
      },
      {
        value: "fast",
        label: "1.5x to 2x speed, rarely needing to pause",
      },
    ],
  },
  {
    id: 7,
    question: "How do you prefer information to be structured?",
    options: [
      {
        value: "slow",
        label: "Hierarchical organization with clear sections and subsections",
      },
      {
        value: "moderate",
        label:
          "A mix of organized structure with some connections between concepts",
      },
      {
        value: "fast",
        label: "Network-style with many interconnected concepts and references",
      },
    ],
  },
];

export default function ClassificationTest() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});

  const handleAnswerSelect = (questionId: number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const nextQuestion = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevQuestion = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isCurrentQuestionAnswered = () => {
    return answers[questions[currentStep].id] !== undefined;
  };

  const isAllQuestionsAnswered = () => {
    return questions.every((q) => answers[q.id] !== undefined);
  };

  const classifyLearningSpeed = () => {
    // Count occurrences of each learning speed
    const counts = Object.values(answers).reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find the most common learning speed
    let maxCount = 0;
    let learningSpeed = "moderate"; // Default

    for (const [speed, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        learningSpeed = speed;
      }
    }

    return learningSpeed;
  };

  const handleSubmit = async () => {
    if (!isAllQuestionsAnswered()) {
      toast({
        title: "Please answer all questions",
        description: "All questions must be answered before submission.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const learningSpeed = classifyLearningSpeed();
      console.log("Classified learning speed:", learningSpeed);

      // First try with only the learning_speed parameter
      try {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            learning_speed: learningSpeed,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to update profile");
        }

        toast({
          title: "Classification complete!",
          description: "Your learning profile has been updated successfully.",
        });

        // Redirect to dashboard with router
        console.log("Attempting to redirect to dashboard...");
        router.push("/dashboard");

        // Add a fallback redirect in case router.push doesn't work
        setTimeout(() => {
          console.log("Using fallback navigation...");
          window.location.href = "/dashboard";
        }, 1000); // Wait 1 second before trying fallback
      } catch (error: any) {
        console.error("First attempt error:", error);

        // If we get a schema error, notify the user
        if (
          error.message.includes("column") ||
          error.message.includes("schema")
        ) {
          toast({
            title: "Database update required",
            description:
              "We need to update the database structure. Trying again...",
          });

          // Wait a moment to allow DB migration to complete
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Try again with the API
          const secondResponse = await fetch("/api/profile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              learning_speed: learningSpeed,
            }),
          });

          const secondResult = await secondResponse.json();

          if (!secondResponse.ok) {
            throw new Error(
              secondResult.error ||
                "Failed to update profile after schema update"
            );
          }

          toast({
            title: "Classification complete!",
            description:
              "Your learning profile has been updated successfully after database update.",
          });

          // Redirect to dashboard
          console.log(
            "Attempting to redirect to dashboard after schema update..."
          );
          router.push("/dashboard");

          // Add a fallback redirect in case router.push doesn't work
          setTimeout(() => {
            console.log("Using fallback navigation after schema update...");
            window.location.href = "/dashboard";
          }, 1000); // Wait 1 second before trying fallback
        } else {
          // If it's not a schema error, rethrow
          throw error;
        }
      }
    } catch (error: any) {
      console.error("Classification submission error:", error);
      toast({
        title: "Classification failed",
        description:
          error.message ||
          "An error occurred while saving your classification.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = questions[currentStep];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <Brain className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Learning Style Assessment</CardTitle>
          <CardDescription>
            Help us personalize your learning experience by answering a few
            questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div className="text-center text-sm text-muted-foreground">
              Question {currentStep + 1} of {questions.length}
            </div>

            <div className="text-lg font-medium">
              {currentQuestion.question}
            </div>

            <RadioGroup
              key={`question-${currentQuestion.id}`}
              value={answers[currentQuestion.id] || ""}
              onValueChange={(value) =>
                handleAnswerSelect(currentQuestion.id, value)
              }
              className="space-y-4"
            >
              {currentQuestion.options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    id={`option-${option.value}`}
                    value={option.value}
                  />
                  <Label
                    htmlFor={`option-${option.value}`}
                    className="text-base"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevQuestion}
            disabled={currentStep === 0}
            suppressHydrationWarning
          >
            Previous
          </Button>

          {currentStep < questions.length - 1 ? (
            <Button
              onClick={nextQuestion}
              disabled={!isCurrentQuestionAnswered()}
              suppressHydrationWarning
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !isCurrentQuestionAnswered()}
              suppressHydrationWarning
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Complete Assessment"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
