"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/lib/supabase/provider";
import {
  checkSupabaseConnection,
  checkAuthStatus,
} from "@/lib/supabase/check-connection";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell } from "@/components/dashboard/shell";
import { DashboardAuthFallback } from "@/components/dashboard/auth-fallback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileUp,
  Search,
  AlertCircle,
  Loader2,
  FileType,
  SortAsc,
  Brain,
  ChevronRight,
} from "lucide-react";
import { FileUpload } from "@/components/content/file-upload";
import { SlideGrid } from "@/components/content/slide-grid";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

export default function ContentPage() {
  const { supabase, session, isLoading } = useSupabase();
  const { toast } = useToast();
  const [allSlides, setAllSlides] = useState<any[]>([]); // Store all slides before filtering
  const [filteredSlides, setFilteredSlides] = useState<any[]>([]); // Store filtered slides
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [courses, setCourses] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [connectionOK, setConnectionOK] = useState(true);
  const [diagnoseResult, setDiagnoseResult] = useState<any>(null);
  const [sortOrder, setSortOrder] = useState("newest");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isClassified, setIsClassified] = useState<boolean | null>(null);
  const [isFetchingSlides, setIsFetchingSlides] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUserIdColumn, setHasUserIdColumn] = useState(false); // Track if user_id column exists

  // Fetch user classification status
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .single();

        if (error) throw error;

        setUserProfile(data);
        setIsClassified(data?.is_classified || false);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setIsClassified(false);
      }
    };

    fetchUserProfile();
  }, [session, supabase]);

  // Fetch all slides from the database with graceful fallback for missing user_id column
  const fetchAllSlides = async (retryCount = 0) => {
    try {
      console.log("Fetching slides");
      setIsFetchingSlides(true);
      setError(null);

      // Verify Supabase connection before querying
      if (!supabase) {
        console.error("Supabase client is not initialized");
        setError(
          "Database connection not available. Please try refreshing the page."
        );
        setIsFetchingSlides(false);
        return;
      }

      // Check session
      if (!session) {
        console.error("No active session");
        setError("You need to be logged in to view slides.");
        setIsFetchingSlides(false);
        return;
      }

      // First, check if the user_id column exists in the slides table
      try {
        // Attempt to get the table definition
        const userId = session.user.id;
        console.log("Current user ID:", userId);

        // Create a query without filtering by user_id first
        let query = supabase.from("slides").select("*");

        // Apply sort order
        if (sortOrder === "newest") {
          query = query.order("created_at", { ascending: false });
        } else if (sortOrder === "oldest") {
          query = query.order("created_at", { ascending: true });
        } else if (sortOrder === "a-z") {
          query = query.order("title", { ascending: true });
        } else if (sortOrder === "z-a") {
          query = query.order("title", { ascending: false });
        }

        const { data: slideData, error: slidesError } = await query;

        if (slidesError) {
          console.error("Error in Supabase query:", slidesError);
          throw new Error(
            `Database query failed: ${
              slidesError.message || "Unknown database error"
            }`
          );
        }

        if (!slideData) {
          console.warn("No data returned but no error either");
          setAllSlides([]);
        } else {
          console.log(`Fetched ${slideData.length} slides from database`);

          // Check if any slide has a user_id property to detect if the column exists
          const hasUserIdProperty = slideData.some(
            (slide) => "user_id" in slide
          );
          setHasUserIdColumn(hasUserIdProperty);
          console.log("Database has user_id column:", hasUserIdProperty);

          // If the column exists, filter the slides by the current user's ID
          let userSlides = slideData;
          if (hasUserIdProperty) {
            userSlides = slideData.filter((slide) => slide.user_id === userId);
            console.log(
              `Filtered to ${userSlides.length} slides for user ${userId}`
            );
          } else {
            console.log("No user_id column found, showing all slides");
          }

          setAllSlides(userSlides);

          // Extract and update course list
          updateCoursesList(userSlides);

          // Apply filters to the fetched data
          applyFilters(userSlides);
        }
      } catch (queryError) {
        console.error("Query execution error:", queryError);
        throw queryError;
      }
    } catch (error) {
      // Reset state if we get an error
      setAllSlides([]);
      setFilteredSlides([]);

      // Improved error logging
      let errorMessage = "Unknown error";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "object" && error !== null) {
        // Try to extract any useful information from the error object
        errorMessage = JSON.stringify(error);
      }

      console.error("Error fetching slides:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsFetchingSlides(false);
    }
  };

  // Extract unique course IDs from slides
  const updateCoursesList = (slides: any[]) => {
    if (!slides || !Array.isArray(slides)) return;

    try {
      // Extract unique, non-empty course IDs and sort them
      const uniqueCourses = [
        ...new Set(
          slides
            .map((slide) => slide.course_id)
            .filter((id) => id && id.trim() !== "")
        ),
      ].sort();

      console.log("Updated courses list:", uniqueCourses);
      setCourses(uniqueCourses);
    } catch (error) {
      console.error("Error processing courses:", error);
    }
  };

  // Apply filters to all slides
  const applyFilters = (slides = allSlides) => {
    if (!slides || !Array.isArray(slides)) {
      setFilteredSlides([]);
      return;
    }

    console.log("Applying filters:", {
      searchQuery,
      courseFilter,
      slideCount: slides.length,
    });

    let filtered = [...slides];

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (slide) =>
          slide.title.toLowerCase().includes(query) ||
          (slide.description && slide.description.toLowerCase().includes(query))
      );
    }

    // Apply course filter
    if (courseFilter !== "") {
      filtered = filtered.filter((slide) => slide.course_id === courseFilter);
    }

    console.log(`Filtered from ${slides.length} to ${filtered.length} slides`);
    setFilteredSlides(filtered);
  };

  // Initial fetch when component mounts or session changes
  useEffect(() => {
    if (session) {
      fetchAllSlides();
    }
  }, [session, sortOrder]); // Only re-fetch from DB when session or sort order changes

  // Apply filters whenever filter criteria change
  useEffect(() => {
    applyFilters();
  }, [searchQuery, courseFilter, allSlides]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  // Handle course filter change
  const handleCourseFilterChange = (value: string) => {
    console.log("Course filter changed to:", value);
    setCourseFilter(value === "all" ? "" : value);
  };

  // Handle completed uploads
  const handleUploadComplete = (uploadedSlide: any) => {
    setIsUploading(false);
    toast({
      title: "Upload successful!",
      description: "Your slides have been added to your content library.",
    });

    // Refresh slides
    fetchAllSlides();
  };

  // Updated to handle missing user_id column
  const deleteSlide = async (slideId: string, filePath: string) => {
    if (!session || !supabase) {
      toast({
        title: "Error",
        description: "You need to be logged in to delete slides.",
        variant: "destructive",
      });
      return;
    }

    // Get the current user's ID
    const userId = session.user.id;

    try {
      // Update UI state immediately to remove the slide, improving perceived performance
      setAllSlides((prevSlides) =>
        prevSlides.filter((slide) => slide.id !== slideId)
      );

      // Track file deletion status
      let fileDeletedSuccessfully = false;

      // Delete the file from storage if filePath is provided
      if (filePath) {
        console.log(`Attempting to delete file: ${filePath}`);

        // For robust deletion, implement retry logic
        const maxRetries = 3;
        let retryCount = 0;
        let storageError = null;

        while (retryCount < maxRetries && !fileDeletedSuccessfully) {
          try {
            const { error: deleteError } = await supabase.storage
              .from("content")
              .remove([filePath]);

            if (deleteError) {
              throw deleteError;
            }

            console.log("File deleted successfully from storage");
            fileDeletedSuccessfully = true;
            break;
          } catch (err) {
            console.error("Unexpected error during file deletion:", err);
            storageError = new Error(
              err instanceof Error ? err.message : "Unknown file deletion error"
            );
            retryCount++;

            if (retryCount < maxRetries) {
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * retryCount)
              );
            }
          }
        }

        // If we couldn't delete the file after all retries, at least log it
        if (storageError) {
          console.error(
            "Error deleting file from storage after retries:",
            storageError
          );

          // Continue with database deletion anyway
          console.warn(
            "Continuing with database record deletion despite storage error"
          );
        }
      }

      // Delete the database record, conditionally filtering by user_id
      console.log(`Attempting to delete slide record with ID: ${slideId}`);

      try {
        // Create a delete query
        let deleteQuery = supabase.from("slides").delete().eq("id", slideId);

        // Only add the user_id filter if the column exists
        if (hasUserIdColumn) {
          deleteQuery = deleteQuery.eq("user_id", userId);
        }

        const deleteResult = await deleteQuery.select();

        const { error: dbError, data: deleteData, status } = deleteResult;

        console.log("Database deletion result:", deleteResult);

        // If we get a permission error, it might be due to missing RLS policy
        if (
          dbError &&
          (dbError.message.includes("permission") ||
            dbError.message.includes("policy"))
        ) {
          console.warn("Permission error, trying alternative approach...");

          // Try a more direct approach that might work even without proper RLS
          const fallbackParams: any = { slide_id: slideId };

          // Add user_id to params only if the column exists
          if (hasUserIdColumn) {
            fallbackParams.user_id = userId;
          }

          const fallbackResult = await supabase.rpc(
            "delete_slide",
            fallbackParams
          );

          if (fallbackResult.error) {
            throw fallbackResult.error;
          }

          console.log("Fallback deletion result:", fallbackResult);
        } else if (dbError) {
          throw dbError;
        }

        // Fetch slides again to ensure UI state matches database state
        await fetchAllSlides();

        toast({
          title: "Slide deleted",
          description: fileDeletedSuccessfully
            ? "The slide and file have been successfully deleted."
            : "The slide has been deleted but there may have been an issue removing the file.",
        });
      } catch (dbError) {
        console.error("Error deleting slide from database:", dbError);
        toast({
          title: "Error deleting slide",
          description:
            dbError instanceof Error
              ? dbError.message
              : "Failed to delete slide from database.",
          variant: "destructive",
        });

        // Refresh slides to restore the UI in case of error
        await fetchAllSlides();

        return;
      }
    } catch (error) {
      console.error("Unexpected error during slide deletion:", error);

      let errorMessage = "An unexpected error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      // Refresh slides to restore the UI in case of error
      await fetchAllSlides();
    }
  };

  // Add a diagnostics function
  const runDiagnostics = async () => {
    console.log("Running Supabase diagnostics...");
    try {
      // Test basic Supabase authentication first
      const authCheck = await supabase.auth.getSession();
      console.log("Auth session check:", {
        hasSession: !!authCheck.data?.session,
        hasError: !!authCheck.error,
      });

      if (authCheck.error) {
        console.error("Auth error:", authCheck.error);
        toast({
          title: "Authentication Error",
          description:
            "There's an issue with your authentication. Try logging out and back in.",
          variant: "destructive",
        });
        return; // Exit early if auth fails
      }

      // Then test connection
      const connectionStatus = await checkSupabaseConnection();
      console.log("Connection status:", connectionStatus);

      // Check authentication
      const authStatus = await checkAuthStatus();
      console.log("Authentication status:", authStatus);

      // Check environment variables
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      console.log("Environment check:", {
        hasSupabaseUrl: !!supabaseUrl,
        hasAnonKey,
        url: supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : "missing",
      });

      // Simple direct test query
      console.log("Performing direct test query...");
      try {
        const directTest = await supabase.from("slides").select("id").limit(1);
        console.log("Direct test result:", {
          status: directTest.status,
          hasData: !!directTest.data,
          hasError: !!directTest.error,
        });
      } catch (directError) {
        console.error("Direct test error:", directError);
      }

      // Test RLS policies
      let rlsStatus = "Unknown";
      try {
        const rlsTest = await supabase
          .from("slides")
          .delete()
          .eq("id", "00000000-0000-0000-0000-000000000000") // Non-existent ID
          .select();

        // If no permission error, RLS is likely set correctly
        rlsStatus =
          rlsTest.error && rlsTest.error.message.includes("permission")
            ? "Failed: No permission to delete"
            : "Success: Delete policy exists";

        console.log("RLS policy test:", rlsStatus, rlsTest);
      } catch (rlsError) {
        console.error("RLS test error:", rlsError);
        rlsStatus = "Error testing RLS";
      }

      // Show complete diagnostics results
      toast({
        title: "Diagnostics Results",
        description: (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span>Connection:</span>
              <span
                className={
                  connectionStatus.connected ? "text-green-500" : "text-red-500"
                }
              >
                {connectionStatus.connected ? "✓ Connected" : "✗ Failed"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Authentication:</span>
              <span
                className={
                  authStatus.authenticated ? "text-green-500" : "text-red-500"
                }
              >
                {authStatus.authenticated
                  ? "✓ Authenticated"
                  : "✗ Not authenticated"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>RLS Policy:</span>
              <span
                className={
                  rlsStatus.includes("Success")
                    ? "text-green-500"
                    : "text-red-500"
                }
              >
                {rlsStatus.includes("Success")
                  ? "✓ Configured"
                  : "✗ Not configured"}
              </span>
            </div>
            {!connectionStatus.connected && (
              <p className="text-sm text-muted-foreground pt-2">
                Try refreshing the page or check your network connection.
              </p>
            )}
            {!authStatus.authenticated && (
              <p className="text-sm text-muted-foreground pt-2">
                Try logging out and back in to refresh your session.
              </p>
            )}
            {rlsStatus.includes("Failed") && (
              <p className="text-sm text-muted-foreground pt-2">
                The database needs RLS policies for delete operations. Run the
                SQL script in fix-rls-policies.sql.
              </p>
            )}
          </div>
        ) as any,
        variant:
          connectionStatus.connected &&
          authStatus.authenticated &&
          rlsStatus.includes("Success")
            ? "default"
            : "destructive",
      });
    } catch (error) {
      console.error("Diagnostics error:", error);
      toast({
        title: "Diagnostics Failed",
        description:
          "Could not complete diagnostics. Check console for details.",
        variant: "destructive",
      });
    }
  };

  // Run diagnostics if we encounter errors
  useEffect(() => {
    if (error) {
      runDiagnostics();
    }
  }, [error]);

  // If loading, show loading state
  if (isLoading) {
    return (
      <DashboardShell>
        <DashboardHeader
          heading="Loading"
          text="Please wait while we load your content..."
        />
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  // If no session, show auth fallback
  if (!session) {
    return <DashboardAuthFallback />;
  }

  // Show classification notice for unclassified users
  if (isClassified === false) {
    return (
      <DashboardShell>
        <DashboardHeader
          heading="Learning Content"
          text="Access your learning materials and resources"
        />
        <div className="mb-8">
          <Alert className="bg-primary/10 border-primary">
            <Brain className="h-5 w-5 text-primary" />
            <AlertTitle className="text-lg font-semibold">
              Complete Your Learning Style Assessment First
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-4">
                Before accessing personalized learning content, please take our
                quick learning style assessment. This will help us tailor
                content summaries, flashcards, and quizzes to your preferred
                learning speed.
              </p>
              <Button asChild size="lg">
                <Link href="/classification-test">
                  Take Assessment Now <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Why Classification Matters</CardTitle>
              <CardDescription>
                The learning style assessment helps us provide the right level
                of detail in your learning materials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                After taking the assessment, you'll receive:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>Summaries tailored to your preferred level of detail</li>
                <li>Flashcards optimized for your learning speed</li>
                <li>Quizzes with appropriate difficulty and question count</li>
                <li>
                  A personalized learning dashboard with relevant analytics
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Learning Content"
        text="Access your learning materials and resources"
      >
        <Button onClick={() => setIsUploading(!isUploading)}>
          <FileUp className="mr-2 h-4 w-4" />
          {isUploading ? "Cancel Upload" : "Upload Slides"}
        </Button>
      </DashboardHeader>

      <div className="grid gap-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Content</AlertTitle>
            <AlertDescription className="flex flex-col space-y-2">
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-fit mt-2 outline-none"
                onClick={runDiagnostics}
              >
                Run Diagnostics
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col space-y-4">
          <div className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search slides..."
                    className="pl-8 outline-none focus-visible:ring-0 focus-visible:ring-transparent"
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                </div>

                <Select
                  value={sortOrder}
                  onValueChange={(value) => {
                    setSortOrder(value as "asc" | "desc");
                  }}
                >
                  <SelectTrigger className="w-[160px] outline-none focus-visible:ring-0">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Newest First</SelectItem>
                    <SelectItem value="desc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={courseFilter}
                  onValueChange={handleCourseFilterChange}
                >
                  <SelectTrigger className="w-[180px] outline-none focus-visible:ring-0">
                    <SelectValue placeholder="Filter by course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course} value={course}>
                        {course}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isUploading && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Upload New Slides</CardTitle>
                  <CardDescription>
                    Upload PDF documents or images to share with your students
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUpload onUploadComplete={handleUploadComplete} />
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {isFetchingSlides ? (
                <div className="w-full flex justify-center items-center py-8">
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Loading slides...
                    </p>
                  </div>
                </div>
              ) : (
                <SlideGrid
                  slides={filteredSlides}
                  emptyMessage={
                    courseFilter
                      ? `No slides found for course "${courseFilter}". Try selecting a different course or adjusting your filters.`
                      : "No slides found. Try uploading some content or adjusting your filters."
                  }
                  onDeleteSlide={deleteSlide}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
