"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { useSupabase } from "@/lib/supabase/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { FileUp, X } from "lucide-react";
import { LoadingSpinner, LoadingButton } from "@/components/ui/loading-spinner";
import { ErrorMessage } from "@/components/ui/error-message";
import { api } from "@/lib/api";

interface FileUploadProps {
  onUploadComplete: (fileUrl: string, metadata: any) => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const { supabase, session } = useSupabase();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [existingCourses, setExistingCourses] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasUserIdColumn, setHasUserIdColumn] = useState(false);

  // Check if the user_id column exists
  useEffect(() => {
    const checkUserIdColumn = async () => {
      if (!supabase || !session) return;

      try {
        // Make a simple query to get one slide
        const { data } = await supabase.from("slides").select("*").limit(1);

        // Check if the user_id property exists on any returned slide
        if (data && data.length > 0) {
          const hasUserIdProperty = "user_id" in data[0];
          setHasUserIdColumn(hasUserIdProperty);
          console.log(
            "File Upload: Database has user_id column:",
            hasUserIdProperty
          );
        }
      } catch (error) {
        console.error("Error checking for user_id column:", error);
      }
    };

    checkUserIdColumn();
  }, [supabase, session]);

  // Fetch existing course IDs for suggestions with fallback for missing user_id column
  useEffect(() => {
    const fetchCourses = async () => {
      if (!supabase || !session) return;

      try {
        // Get the current user's ID
        const userId = session.user.id;

        // Create base query without user filter first
        let query = supabase
          .from("slides")
          .select("course_id")
          .order("course_id");

        // Add user_id filter only if the column exists
        if (hasUserIdColumn) {
          query = query.eq("user_id", userId);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching course IDs:", error);
          return;
        }

        if (data) {
          const uniqueCourses = [
            ...new Set(
              data
                .map((slide) => slide.course_id)
                .filter((id) => id && id.trim() !== "")
            ),
          ].sort();

          setExistingCourses(uniqueCourses);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    fetchCourses();
  }, [supabase, session, hasUserIdColumn]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Reset error state
    setError(null);

    // Check if file is PDF or image
    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
    ];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a PDF or image file (JPEG, PNG, GIF).");
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or image file (JPEG, PNG, GIF).",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("Please upload a file smaller than 10MB.");
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    // Reset error state
    setError(null);

    if (!selectedFile) {
      setError("Please select a file to upload.");
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title for your slide.");
      toast({
        title: "Title required",
        description: "Please enter a title for your slide.",
        variant: "destructive",
      });
      return;
    }

    if (!courseId.trim()) {
      setError("Please enter a course ID for your slide.");
      toast({
        title: "Course ID required",
        description: "Please enter a course ID for your slide.",
        variant: "destructive",
      });
      return;
    }

    // Check if user is authenticated
    if (!session) {
      setError("You need to be logged in to upload slides.");
      toast({
        title: "Authentication required",
        description: "You need to be logged in to upload slides.",
        variant: "destructive",
      });
      return;
    }

    // Get the current user's ID
    const userId = session.user.id;

    // Standardize course ID (trim whitespace and ensure consistent casing)
    const standardizedCourseId = courseId.trim();

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create form data for API
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("courseId", standardizedCourseId);
      formData.append("userId", userId); // Add user ID to form data

      // Set up progress tracking
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 5;
          return newProgress < 90 ? newProgress : prev;
        });
      }, 100);

      // Create a unique file name, optionally including the user ID
      const fileExt = selectedFile.name.split(".").pop();
      // Always create unique filenames, but only include userId in path if column exists
      const fileNameBase = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 15)}`;
      const filePath = hasUserIdColumn
        ? `slides/${userId}/${fileNameBase}.${fileExt}`
        : `slides/${fileNameBase}.${fileExt}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from("content")
        .upload(filePath, selectedFile);

      clearInterval(progressInterval);

      if (error) {
        throw error;
      }

      setUploadProgress(100);

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("content").getPublicUrl(filePath);

      // Prepare the slide data
      const slideData: any = {
        title,
        description,
        course_id: standardizedCourseId,
        file_path: filePath,
        file_url: publicUrl,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
      };

      // Add user_id field only if the column exists in the database
      if (hasUserIdColumn) {
        slideData.user_id = userId;
      }

      // Save metadata to database with the prepared data
      const { error: dbError } = await supabase
        .from("slides")
        .insert([slideData]);

      if (dbError) {
        throw dbError;
      }

      toast({
        title: "Upload successful",
        description: "Your slide has been uploaded successfully.",
      });

      // Prepare the metadata to return
      const returnMetadata: any = {
        title,
        description,
        courseId: standardizedCourseId,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        filePath: filePath,
      };

      // Include userId in metadata only if the column exists
      if (hasUserIdColumn) {
        returnMetadata.userId = userId;
      }

      // Call the callback with the file URL and metadata
      onUploadComplete(publicUrl, returnMetadata);

      // Reset form
      setSelectedFile(null);
      setTitle("");
      setDescription("");
      setCourseId("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      setError(error.message || "An error occurred during upload.");
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <ErrorMessage
          message={error}
          variant="destructive"
          onDismiss={() => setError(null)}
        />
      )}

      <div
        className={`file-drop-area ${isDragging ? "drag-active" : ""}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="file-input"
          onChange={handleFileInputChange}
          accept=".pdf,.jpg,.jpeg,.png,.gif"
        />
        <div className="text-center">
          <FileUp className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
          <h3 className="text-lg font-medium mb-1">Drag & Drop Files</h3>
          <p className="text-sm text-muted-foreground mb-4">
            or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Supports: PDF, JPEG, PNG, GIF (max 10MB)
          </p>
        </div>
      </div>

      {selectedFile && (
        <div className="p-4 bg-muted/50 rounded-lg flex justify-between items-center">
          <div>
            <p className="font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleRemoveFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Enter a title for your slide"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isUploading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="courseId">Course ID</Label>
          <div className="relative">
            <Input
              id="courseId"
              placeholder="Enter a course ID (e.g. CS101, MATH201)"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              disabled={isUploading}
              list="course-suggestions"
            />
            {existingCourses.length > 0 && (
              <datalist id="course-suggestions">
                {existingCourses.map((course) => (
                  <option key={course} value={course} />
                ))}
              </datalist>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            The course ID helps organize your slides and allows filtering.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Input
            id="description"
            placeholder="Enter a description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isUploading}
          />
        </div>

        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs mb-1">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="animate-progress" />
          </div>
        )}

        <LoadingButton
          isLoading={isUploading}
          disabled={!selectedFile || isUploading}
          onClick={handleUpload}
          className="w-full"
        >
          {isUploading ? "Uploading..." : "Upload Slide"}
        </LoadingButton>
      </div>
    </div>
  );
}
