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
} from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

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

export function SlideCard({ slide, onDelete }: SlideCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const isImage = slide.file_type.startsWith("image/");
  const isPdf = slide.file_type === "application/pdf";
  const formattedDate = new Date(slide.created_at).toLocaleDateString();

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

  const handleGenerateFeature = async (
    featureType: "summary" | "flashcards" | "quiz"
  ) => {
    setIsGenerating(featureType);

    try {
      if (featureType === "quiz") {
        // Make an actual API call to generate a quiz
        const response = await fetch("/api/quizzes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            slideId: slide.id,
            slideTitle: slide.title,
            courseId: slide.course_id,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate quiz");
        }

        const quiz = await response.json();

        toast({
          title: "Quiz Generated Successfully",
          description:
            "Your quiz has been created and is now available on the quizzes page.",
          variant: "default",
        });

        // Add a slight delay before redirecting to allow the user to see the toast
        setTimeout(() => {
          router.push("/quizzes");
        }, 1000);
      } else {
        // For summary and flashcards, just simulate with a timeout
        // In a real app, you would make API calls here as well
        await new Promise((resolve) => setTimeout(resolve, 1500));

        toast({
          title: `${
            featureType.charAt(0).toUpperCase() + featureType.slice(1)
          } Generated`,
          description: `Your ${featureType} has been generated successfully.`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error(`Error generating ${featureType}:`, error);
      toast({
        title: "Generation Failed",
        description: `Failed to generate ${featureType}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(null);
    }
  };

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
            <span>Uploaded on {formattedDate}</span>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-2">
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsViewModalOpen(true)}
              >
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
    </>
  );
}
