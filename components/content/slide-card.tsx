"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Download,
  Eye,
  Clock,
  Trash,
  Loader2,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Repeat,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { useSupabase } from "@/lib/supabase/provider";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface SlideCardProps {
  slide: {
    id: string;
    title: string;
    description?: string;
    course_id: string;
    file_url: string;
    file_type: string;
    file_path?: string;
    created_at: string;
  };
  onDelete?: (slideId: string, filePath: string) => Promise<void>;
}

interface FlashcardData {
  id: string;
  front: string;
  back: string;
  difficulty: string;
}

interface GeneratedFlashcards {
  flashcards: FlashcardData[];
  detail_level: string;
  learning_speed: string;
}

export function SlideCard({ slide, onDelete }: SlideCardProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { supabase, session } = useSupabase();
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFlashcardsDialogOpen, setIsFlashcardsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState<
    "summary" | "flashcards" | "quiz" | null
  >(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{
    type: string;
    data: any;
  } | null>(null);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentProgress, setContentProgress] = useState<{
    completed: boolean;
    last_position: number;
  } | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  // Determine file type for display
  const fileType =
    slide.file_type || slide.file_url?.split(".").pop()?.toLowerCase();
  const isPdf = fileType === "pdf";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(
    fileType || ""
  );

  // Format the created date
  const formattedDate = slide.created_at
    ? formatDistanceToNow(new Date(slide.created_at), { addSuffix: true })
    : "Unknown date";

  // Fetch content progress when component mounts
  useEffect(() => {
    const fetchContentProgress = async () => {
      if (!session) return;

      setIsLoadingProgress(true);
      console.log(
        `Fetching content progress for slide ${slide.id}, user ${session.user.id}`
      );
      try {
        const response = await fetch(
          `/api/content-progress?slideId=${slide.id}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Progress fetch error:", errorData);
          throw new Error(
            `Failed to fetch content progress: ${response.status}`
          );
        }

        const { data } = await response.json();
        console.log("Content progress data received:", data);
        setContentProgress(data);
      } catch (error) {
        console.error("Error fetching content progress:", error);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    fetchContentProgress();
  }, [slide.id, session]);

  // Update content progress when user views the slide
  const updateContentProgress = async (completed = false) => {
    if (!session) {
      console.log("No active session, skipping progress update");
      return;
    }

    console.log(
      `Updating content progress for slide ${slide.id}. Completed: ${completed}`
    );
    try {
      const response = await fetch("/api/content-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slideId: slide.id,
          completed,
          lastPosition: 100, // Assuming full view when modal is opened
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Progress update error:", errorData);
        throw new Error(
          `Failed to update content progress: ${response.status}`
        );
      }

      const { data } = await response.json();
      console.log("Progress update successful:", data);
      setContentProgress(data);
    } catch (error) {
      console.error("Error updating content progress:", error);
    }
  };

  // Track when user opens the view modal
  const handleViewSlide = () => {
    setIsViewModalOpen(true);
    updateContentProgress(true);
  };

  const handleDelete = async () => {
    if (onDelete) {
      setIsDeleting(true);
      try {
        await onDelete(slide.id, slide.file_path || "");
        // Automatically close the dialog when deletion is successful
        setIsDialogOpen(false);
      } catch (error) {
        console.error("Error deleting slide:", error);
        // In case of error, we keep the dialog open so the user can try again
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleGenerateFeature = async (feature: string) => {
    setIsGenerating(true);
    setError("");

    try {
      if (feature === "flashcards") {
        console.log("Generating flashcards for slide:", slide.id);

        // Use the new AI endpoint for flashcards
        const response = await fetch("/api/flashcards/ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            slideId: slide.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Flashcards API error:", errorData);
          throw new Error(
            `Flashcards API error: ${JSON.stringify(
              errorData.error || "Unknown error"
            )}`
          );
        }

        const flashcardsData = await response.json();
        console.log("Flashcards generated:", flashcardsData);

        if (
          !flashcardsData ||
          !flashcardsData.flashcards ||
          !Array.isArray(flashcardsData.flashcards)
        ) {
          console.error("Invalid flashcards data:", flashcardsData);
          throw new Error("Invalid flashcards data received");
        }

        // Set the flashcards data
        setGeneratedContent({
          type: "flashcards",
          data: flashcardsData,
        });
        setIsFlashcardsDialogOpen(true);
        toast({
          title: "Success",
          description: "Flashcards generated successfully!",
          variant: "default",
        });
      } else if (feature === "quiz") {
        // Make an actual API call to generate a quiz
        console.log("Generating quiz for slide:", slide);

        const requestBody = {
          slideId: slide.id,
          slideTitle: slide.title,
          courseId: slide.course_id,
        };

        console.log("Request body:", requestBody);

        const response = await fetch("/api/quizzes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const responseText = await response.text();
        console.log("API Response status:", response.status);
        console.log("API Response text:", responseText);

        if (!response.ok) {
          throw new Error(
            `Failed to generate quiz: ${response.status} - ${responseText}`
          );
        }

        const quiz = JSON.parse(responseText);

        toast({
          title: "Quiz Generated",
          description: "Quiz is now available on the quizzes page",
          variant: "default",
        });

        // Add a slight delay before redirecting to allow the user to see the toast
        setTimeout(() => {
          router.push("/quizzes");
        }, 1000);
      } else if (feature === "summary") {
        // Make an API call to generate a summary
        const response = await fetch("/api/summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            slideId: slide.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Summary API error:", errorData);
          throw new Error(errorData.error || "Failed to generate summary");
        }

        const data = await response.json();

        toast({
          title: "Summary Generated",
          description: "Your content summary has been generated successfully.",
          variant: "default",
        });

        // Display the summary in a dialog
        setGeneratedContent({
          type: "summary",
          data: data.summary,
        });
        setOpenDialog(true);
      }
    } catch (error) {
      console.error("Error generating feature:", error);
      setError(error instanceof Error ? error.message : "An error occurred");

      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to generate feature",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(null);
    }
  };

  const handleNextFlashcard = () => {
    if (generatedContent?.type === "flashcards") {
      const flashcards = generatedContent.data.flashcards;
      if (currentFlashcardIndex < flashcards.length - 1) {
        setCurrentFlashcardIndex(currentFlashcardIndex + 1);
        setIsFlipped(false);
      }
    }
  };

  const handlePreviousFlashcard = () => {
    if (currentFlashcardIndex > 0) {
      setCurrentFlashcardIndex(currentFlashcardIndex - 1);
      setIsFlipped(false);
    }
  };

  const toggleFlashcard = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (generatedContent?.type === "flashcards") {
      if (event.key === "ArrowRight" || event.key === " ") {
        handleNextFlashcard();
      } else if (event.key === "ArrowLeft") {
        handlePreviousFlashcard();
      } else if (event.key === "Enter" || event.key === "f") {
        toggleFlashcard();
      }
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [currentFlashcardIndex, generatedContent]);

  return (
    <>
      <Card className="slide-card overflow-hidden">
        <div className="aspect-video bg-muted relative flex items-center justify-center">
          {isImage ? (
            <img
              src={slide.file_url || "/placeholder.svg"}
              alt={slide.title}
              className="object-cover w-full h-full"
            />
          ) : isPdf ? (
            <div className="flex flex-col items-center justify-center">
              <FileText className="h-12 w-12 text-primary/50" />
              <span className="text-sm text-muted-foreground mt-2">
                PDF Document
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <FileText className="h-12 w-12 text-primary/50" />
              <span className="text-sm text-muted-foreground mt-2">
                Document
              </span>
            </div>
          )}

          {/* Progress indicator */}
          {contentProgress && contentProgress.completed && (
            <div className="absolute top-2 right-2">
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800 border-green-200"
              >
                Viewed
              </Badge>
            </div>
          )}
        </div>

        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg line-clamp-1">
              {slide.title}
            </CardTitle>
            <Badge variant="outline">{slide.course_id}</Badge>
          </div>
        </CardHeader>

        <CardContent className="pb-2">
          {slide.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {slide.description}
            </p>
          )}
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            <span>Uploaded {formattedDate}</span>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-2">
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleViewSlide}>
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={slide.file_url} download={slide.title}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </a>
              </Button>
            </div>

            {onDelete && (
              <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive hover:bg-destructive/10"
                  >
                    <Trash className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the slide "{slide.title}".
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* AI Generation Features */}
          <div className="flex w-full mt-2">
            <div className="grid grid-cols-3 gap-2 w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleGenerateFeature("summary")}
                disabled={isGenerating !== null}
              >
                {isGenerating === "summary" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                Summarize
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleGenerateFeature("flashcards")}
                disabled={isGenerating !== null}
              >
                {isGenerating === "flashcards" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                Flashcards
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleGenerateFeature("quiz")}
                disabled={isGenerating !== null}
              >
                {isGenerating === "quiz" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                Create Quiz
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Modal for viewing slides */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl w-full h-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>{slide.title}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsViewModalOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1 h-full max-h-[calc(90vh-120px)]">
            {isImage ? (
              <img
                src={slide.file_url}
                alt={slide.title}
                className="w-full h-auto"
              />
            ) : isPdf ? (
              <iframe
                src={`${slide.file_url}#toolbar=0`}
                title={slide.title}
                className="w-full h-full min-h-[70vh]"
              />
            ) : (
              <iframe
                src={slide.file_url}
                title={slide.title}
                className="w-full h-full min-h-[70vh]"
              />
            )}
          </div>
          <DialogFooter className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {slide.description}
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={slide.file_url} download={slide.title}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for generated content */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-3xl font-serif tracking-tight mb-1">
              {generatedContent?.type === "summary"
                ? "Content Summary"
                : generatedContent?.type === "flashcards"
                ? "Flashcards"
                : "Generated Content"}
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              {generatedContent?.type === "flashcards"
                ? `Card ${currentFlashcardIndex + 1} of ${
                    generatedContent.data.flashcards.length
                  }`
                : "Personalized based on your learning style"}
            </DialogDescription>
          </DialogHeader>

          {generatedContent?.type === "summary" && (
            <div
              className="space-y-6 py-4 overflow-y-auto pr-2"
              style={{ maxHeight: "calc(70vh - 160px)" }}
            >
              {/* Summary metadata */}
              <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-muted/30 rounded-md border border-border/60">
                <Badge
                  variant="outline"
                  className="font-medium bg-primary/5 text-primary px-3 py-1"
                >
                  {generatedContent.data.learning_speed === "slow"
                    ? "Concise"
                    : generatedContent.data.learning_speed === "moderate"
                    ? "Balanced"
                    : "Detailed"}{" "}
                  Format
                </Badge>
                <span className="text-sm text-muted-foreground">•</span>
                <Badge
                  variant="outline"
                  className="font-medium bg-secondary/5 text-secondary px-3 py-1"
                >
                  {generatedContent.data.learning_speed} pace
                </Badge>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  Optimized for your learning profile
                </span>
              </div>

              {/* Summary content */}
              <div className="bg-white rounded-lg border border-border shadow p-6">
                <h2 className="text-2xl font-serif font-medium tracking-tight text-primary mb-4">
                  {generatedContent.data.detail_level === "concise"
                    ? "Essential Concepts"
                    : generatedContent.data.detail_level === "balanced"
                    ? "Key Points & Applications"
                    : "Comprehensive Analysis"}
                </h2>

                {/* Convert the summary into paragraphs and lists */}
                <div className="space-y-4 text-base leading-relaxed font-serif">
                  {generatedContent.data.summary
                    .split(". ")
                    .reduce(
                      (
                        acc: JSX.Element[],
                        sentence: string,
                        i: number,
                        arr: string[]
                      ) => {
                        // Every 3-4 sentences, create a new paragraph
                        if (i % 4 === 0) {
                          // Create a paragraph with this and the next 3 sentences
                          const paragraphText =
                            arr.slice(i, i + 4).join(". ") +
                            (i + 4 < arr.length ? "." : "");
                          if (paragraphText.trim()) {
                            acc.push(
                              <p key={`p-${i}`} className="mb-3">
                                {paragraphText}
                              </p>
                            );
                          }
                        }

                        // Every 4th paragraph, add a subheading based on context
                        if (i % 16 === 0 && i > 0) {
                          const headings = [
                            "Key Concepts",
                            "Important Principles",
                            "Applications & Examples",
                            "Further Considerations",
                            "Advanced Topics",
                          ];
                          acc.push(
                            <h3
                              key={`h-${i}`}
                              className="text-lg font-medium text-primary/90 mt-6 mb-3"
                            >
                              {headings[Math.floor(i / 16) % headings.length]}
                            </h3>
                          );
                        }

                        return acc;
                      },
                      []
                    )}
                </div>

                {/* Add some bullet points for key takeaways */}
                <div className="mt-6 pt-4 border-t border-border/50">
                  <h3 className="text-lg font-medium mb-3">Key Takeaways</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    {(() => {
                      // Get sentences from the summary
                      const sentences =
                        generatedContent.data.summary.split(/\.\s+/);

                      // If very few sentences, just use all of them
                      if (sentences.length <= 5) {
                        return sentences.map((point, i) => (
                          <li key={i}>
                            <span className="text-sm font-medium">
                              {point}.
                            </span>
                          </li>
                        ));
                      }

                      // Otherwise, select strategic sentences for takeaways:
                      // - First sentence (introduction)
                      // - Sentences containing keywords like "important", "key", "essential", etc.
                      // - Every 5th sentence to get distributed coverage
                      // - Last sentence (conclusion)

                      const keywordSentences = sentences.filter(
                        (sentence) =>
                          sentence.toLowerCase().includes("important") ||
                          sentence.toLowerCase().includes("key") ||
                          sentence.toLowerCase().includes("essential") ||
                          sentence.toLowerCase().includes("significant") ||
                          sentence.toLowerCase().includes("critical") ||
                          sentence.toLowerCase().includes("fundamental")
                      );

                      // Get distributed sentences (every 5th sentence but limit to 3)
                      const distributedSentences = sentences
                        .filter((_, i) => i % 5 === 0)
                        .slice(0, 3);

                      // Combine strategies with deduplication
                      const takeaways = [
                        sentences[0], // First sentence
                        ...keywordSentences.slice(0, 2), // Up to 2 keyword-containing sentences
                        ...distributedSentences, // Distributed sentences
                        sentences[sentences.length - 1], // Last sentence
                      ]
                        .filter(
                          (item, index, self) =>
                            // Remove duplicates and empty strings
                            item && item.trim() && self.indexOf(item) === index
                        )
                        .slice(0, 5); // Limit to 5 total takeaways

                      // If we still don't have takeaways, just use the first 3-5 sentences
                      if (takeaways.length === 0 && sentences.length > 0) {
                        return sentences
                          .slice(0, Math.min(5, sentences.length))
                          .map((point, i) => (
                            <li key={i}>
                              <span className="text-sm font-medium">
                                {point.trim().endsWith(".")
                                  ? point.trim()
                                  : `${point.trim()}.`}
                              </span>
                            </li>
                          ));
                      }

                      return takeaways.map((point, i) => (
                        <li key={i}>
                          <span className="text-sm font-medium">
                            {point.trim().endsWith(".")
                              ? point.trim()
                              : `${point.trim()}.`}
                          </span>
                        </li>
                      ));
                    })()}
                  </ul>
                </div>
              </div>

              {/* Learning insights panel */}
              <div className="bg-primary/5 p-5 rounded-md">
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                    <path d="m9 12 2 2 4-4"></path>
                  </svg>
                  Learning Profile Insights
                </h3>

                <div className="space-y-3">
                  <p className="text-sm">
                    This summary is optimized for{" "}
                    <strong>
                      {generatedContent.data.learning_speed} learners
                    </strong>
                    , with emphasis on:
                  </p>

                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {generatedContent.data.learning_speed === "slow" ? (
                      <>
                        <li>Essential concepts with clarity and simplicity</li>
                        <li>Focused information with minimal distractions</li>
                        <li>Direct language for better comprehension</li>
                      </>
                    ) : generatedContent.data.learning_speed === "moderate" ? (
                      <>
                        <li>Balanced presentation of concepts and examples</li>
                        <li>Practical applications of theoretical knowledge</li>
                        <li>Moderate level of detail and context</li>
                      </>
                    ) : (
                      <>
                        <li>Comprehensive coverage with rich detail</li>
                        <li>Connections between multiple concepts</li>
                        <li>Advanced applications and implications</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {generatedContent?.type === "flashcards" && (
            <div className="space-y-6 py-4">
              <div className="relative">
                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {currentFlashcardIndex + 1} /{" "}
                      {generatedContent.data.flashcards.length}
                    </span>
                  </div>
                  <Progress
                    value={
                      ((currentFlashcardIndex + 1) /
                        generatedContent.data.flashcards.length) *
                      100
                    }
                    className="h-2"
                    indicatorColor="bg-primary"
                  />
                </div>

                {/* Flashcard */}
                <Card
                  className={cn(
                    "w-full flex items-center justify-center cursor-pointer",
                    "transition-all duration-500 perspective-1000 relative",
                    "hover:shadow-lg transform-gpu"
                  )}
                  onClick={toggleFlashcard}
                  style={{
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    transformStyle: "preserve-3d",
                    minHeight: "300px",
                    height: "auto",
                    maxHeight: "60vh",
                  }}
                >
                  <div
                    className={cn(
                      "absolute inset-0 backface-hidden p-6",
                      "flex flex-col items-center justify-center text-center",
                      "bg-gradient-to-br from-card to-background",
                      isFlipped ? "hidden" : ""
                    )}
                  >
                    <Badge variant="outline" className="mb-4 text-xs">
                      {
                        generatedContent.data.flashcards[currentFlashcardIndex]
                          .difficulty
                      }
                    </Badge>
                    <h3 className="text-xl sm:text-2xl font-semibold mb-4 max-w-2xl">
                      {
                        generatedContent.data.flashcards[currentFlashcardIndex]
                          .front
                      }
                    </h3>
                    <p className="text-sm text-muted-foreground mt-auto flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-muted rounded text-xs">
                        Space
                      </kbd>
                      or click to flip
                    </p>
                  </div>
                  <div
                    className={cn(
                      "absolute inset-0 backface-hidden p-6",
                      "flex flex-col items-start justify-start",
                      "bg-gradient-to-br from-card to-background",
                      !isFlipped ? "hidden" : ""
                    )}
                    style={{ transform: "rotateY(180deg)" }}
                  >
                    <div className="overflow-y-auto max-h-[calc(60vh - 8rem)] w-full pr-2 mb-4 flex-grow">
                      <div className="text-left">
                        <p className="text-base sm:text-lg whitespace-pre-line">
                          {
                            generatedContent.data.flashcards[
                              currentFlashcardIndex
                            ].back
                          }
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-auto self-center flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-muted rounded text-xs">
                        Space
                      </kbd>
                      or click to flip back
                    </p>
                  </div>
                </Card>

                {/* Navigation buttons */}
                <div className="flex justify-between items-center mt-6">
                  <Button
                    onClick={handlePreviousFlashcard}
                    disabled={currentFlashcardIndex === 0}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                    <kbd className="ml-2 hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium">
                      ←
                    </kbd>
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFlashcard}
                      className="hidden sm:flex"
                    >
                      <Repeat className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={handleNextFlashcard}
                    disabled={
                      currentFlashcardIndex ===
                      generatedContent.data.flashcards.length - 1
                    }
                    className="flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                    <kbd className="ml-2 hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-primary/20 px-1.5 text-[10px] font-medium">
                      →
                    </kbd>
                  </Button>
                </div>

                {/* Keyboard shortcuts help */}
                <div className="mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground text-center">
                    Keyboard shortcuts:
                    <kbd className="mx-2 px-2 py-1 bg-muted rounded text-xs">
                      ←
                    </kbd>
                    Previous card
                    <kbd className="mx-2 px-2 py-1 bg-muted rounded text-xs">
                      →
                    </kbd>
                    or
                    <kbd className="mx-2 px-2 py-1 bg-muted rounded text-xs">
                      Space
                    </kbd>
                    Next card
                    <kbd className="mx-2 px-2 py-1 bg-muted rounded text-xs">
                      F
                    </kbd>
                    or
                    <kbd className="mx-2 px-2 py-1 bg-muted rounded text-xs">
                      Enter
                    </kbd>
                    Flip card
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 mt-4 pt-2 border-t">
            <div className="flex-1 flex justify-start">
              <Button
                variant="outline"
                onClick={() => setOpenDialog(false)}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="w-full sm:w-auto">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                </svg>
                Edit
              </Button>
              <Button className="w-full sm:w-auto">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2"
                >
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save to Notes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flashcards Dialog */}
      <Dialog
        open={isFlashcardsDialogOpen}
        onOpenChange={setIsFlashcardsDialogOpen}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Flashcards - {slide.title}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFlashcardsDialogOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Study the content using these AI-generated flashcards
            </DialogDescription>
          </DialogHeader>

          {generatedContent?.type === "flashcards" && (
            <div className="space-y-6 py-4">
              <div className="relative">
                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {currentFlashcardIndex + 1} /{" "}
                      {generatedContent.data.flashcards.length}
                    </span>
                  </div>
                  <Progress
                    value={
                      ((currentFlashcardIndex + 1) /
                        generatedContent.data.flashcards.length) *
                      100
                    }
                    className="h-2"
                    indicatorColor="bg-primary"
                  />
                </div>

                {/* Flashcard */}
                <Card
                  className={cn(
                    "w-full flex items-center justify-center cursor-pointer",
                    "transition-all duration-500 perspective-1000 relative",
                    "hover:shadow-lg transform-gpu"
                  )}
                  onClick={toggleFlashcard}
                  style={{
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    transformStyle: "preserve-3d",
                    minHeight: "300px",
                    height: "auto",
                    maxHeight: "60vh",
                  }}
                >
                  <div
                    className={cn(
                      "absolute inset-0 backface-hidden p-6",
                      "flex flex-col items-center justify-center text-center",
                      "bg-gradient-to-br from-card to-background",
                      isFlipped ? "hidden" : ""
                    )}
                  >
                    <Badge variant="outline" className="mb-4 text-xs">
                      {
                        generatedContent.data.flashcards[currentFlashcardIndex]
                          .difficulty
                      }
                    </Badge>
                    <h3 className="text-xl sm:text-2xl font-semibold mb-4 max-w-2xl">
                      {
                        generatedContent.data.flashcards[currentFlashcardIndex]
                          .front
                      }
                    </h3>
                    <p className="text-sm text-muted-foreground mt-auto flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-muted rounded text-xs">
                        Space
                      </kbd>
                      or click to flip
                    </p>
                  </div>
                  <div
                    className={cn(
                      "absolute inset-0 backface-hidden p-6",
                      "flex flex-col items-start justify-start",
                      "bg-gradient-to-br from-card to-background",
                      !isFlipped ? "hidden" : ""
                    )}
                    style={{ transform: "rotateY(180deg)" }}
                  >
                    <div className="overflow-y-auto max-h-[calc(60vh - 8rem)] w-full pr-2 mb-4 flex-grow">
                      <div className="text-left">
                        <p className="text-base sm:text-lg whitespace-pre-line">
                          {
                            generatedContent.data.flashcards[
                              currentFlashcardIndex
                            ].back
                          }
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-auto self-center flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-muted rounded text-xs">
                        Space
                      </kbd>
                      or click to flip back
                    </p>
                  </div>
                </Card>

                {/* Navigation buttons */}
                <div className="flex justify-between items-center mt-6">
                  <Button
                    onClick={handlePreviousFlashcard}
                    disabled={currentFlashcardIndex === 0}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                    <kbd className="ml-2 hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium">
                      ←
                    </kbd>
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFlashcard}
                      className="hidden sm:flex"
                    >
                      <Repeat className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={handleNextFlashcard}
                    disabled={
                      currentFlashcardIndex ===
                      generatedContent.data.flashcards.length - 1
                    }
                    className="flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                    <kbd className="ml-2 hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-primary/20 px-1.5 text-[10px] font-medium">
                      →
                    </kbd>
                  </Button>
                </div>

                {/* Keyboard shortcuts help */}
                <div className="mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground text-center">
                    Keyboard shortcuts:
                    <kbd className="mx-2 px-2 py-1 bg-muted rounded text-xs">
                      ←
                    </kbd>
                    Previous card
                    <kbd className="mx-2 px-2 py-1 bg-muted rounded text-xs">
                      →
                    </kbd>
                    or
                    <kbd className="mx-2 px-2 py-1 bg-muted rounded text-xs">
                      Space
                    </kbd>
                    Next card
                    <kbd className="mx-2 px-2 py-1 bg-muted rounded text-xs">
                      F
                    </kbd>
                    or
                    <kbd className="mx-2 px-2 py-1 bg-muted rounded text-xs">
                      Enter
                    </kbd>
                    Flip card
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
