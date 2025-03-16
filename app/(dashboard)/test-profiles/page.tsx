"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/lib/supabase/provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export default function TestProfilesPage() {
  const { supabase, session, isLoading } = useSupabase();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isClassified, setIsClassified] = useState<boolean | null>(null);
  const [testResults, setTestResults] = useState<
    Array<{ action: string; success: boolean; message: string }>
  >([]);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      setUserId(session.user.id);
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        setProfileData(null);
        setIsClassified(false);
      } else {
        console.log("Profile data:", data);
        setProfileData(data);
        setIsClassified(data?.is_classified || false);
      }
    } catch (err) {
      console.error("Exception fetching profile:", err);
    }
  };

  const runDiagnostics = async () => {
    setIsTesting(true);
    setTestResults([]);
    if (!session?.user?.id) {
      setTestResults([
        {
          action: "Check session",
          success: false,
          message: "No user session found. Please log in.",
        },
      ]);
      setIsTesting(false);
      return;
    }

    // Test 1: Get user
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      setTestResults((prev) => [
        ...prev,
        {
          action: "Get User",
          success: true,
          message: `Success: User ID ${data.user.id}`,
        },
      ]);
    } catch (error: any) {
      setTestResults((prev) => [
        ...prev,
        {
          action: "Get User",
          success: false,
          message: `Error: ${error.message}`,
        },
      ]);
      setIsTesting(false);
      return;
    }

    // Test 2: Check if profile exists
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setTestResults((prev) => [
          ...prev,
          {
            action: "Check Profile",
            success: true,
            message: `Profile exists with ID ${data.id}`,
          },
        ]);
      } else {
        setTestResults((prev) => [
          ...prev,
          {
            action: "Check Profile",
            success: true,
            message: "Profile doesn't exist, will create",
          },
        ]);
      }
    } catch (error: any) {
      setTestResults((prev) => [
        ...prev,
        {
          action: "Check Profile",
          success: false,
          message: `Error checking profile: ${error.message}`,
        },
      ]);
    }

    // Test 3: Try to create a profile
    try {
      const { error } = await supabase.from("profiles").insert({
        user_id: session.user.id,
        learning_speed: "moderate",
        is_classified: true,
      });

      if (error) {
        // If error is about duplicate key, that's ok
        if (error.code === "23505") {
          setTestResults((prev) => [
            ...prev,
            {
              action: "Insert Profile",
              success: true,
              message: "Profile already exists (duplicate key)",
            },
          ]);
        } else {
          throw error;
        }
      } else {
        setTestResults((prev) => [
          ...prev,
          {
            action: "Insert Profile",
            success: true,
            message: "Successfully created profile",
          },
        ]);
      }
    } catch (error: any) {
      setTestResults((prev) => [
        ...prev,
        {
          action: "Insert Profile",
          success: false,
          message: `Error creating profile: ${error.message}`,
        },
      ]);
    }

    // Test 4: Try to update the profile
    try {
      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from("profiles")
        .update({
          learning_speed: "fast",
          is_classified: true,
          updated_at: timestamp,
        })
        .eq("user_id", session.user.id);

      if (error) throw error;

      setTestResults((prev) => [
        ...prev,
        {
          action: "Update Profile",
          success: true,
          message: `Successfully updated profile at ${timestamp}`,
        },
      ]);
    } catch (error: any) {
      setTestResults((prev) => [
        ...prev,
        {
          action: "Update Profile",
          success: false,
          message: `Error updating profile: ${error.message}`,
        },
      ]);
    }

    // Test 5: Try using the API endpoint
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          learning_speed: "moderate",
          is_classified: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update profile via API");
      }

      setTestResults((prev) => [
        ...prev,
        {
          action: "API Update Profile",
          success: true,
          message: "Successfully updated profile via API endpoint",
        },
      ]);
    } catch (error: any) {
      setTestResults((prev) => [
        ...prev,
        {
          action: "API Update Profile",
          success: false,
          message: `Error updating profile via API: ${error.message}`,
        },
      ]);
    }

    // Final fetch to confirm changes
    await fetchProfile();
    setIsTesting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Profile Testing</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You need to be logged in to use this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Profile Diagnostics</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Profile Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">User ID:</p>
                <p className="text-sm font-mono bg-muted p-2 rounded">
                  {userId || "Not logged in"}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Profile Status:</p>
                {profileData ? (
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800"
                  >
                    Profile Exists
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-yellow-100 text-yellow-800"
                  >
                    No Profile
                  </Badge>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-1">
                  Classification Status:
                </p>
                {isClassified ? (
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800"
                  >
                    Classified ({profileData?.learning_speed})
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-yellow-100 text-yellow-800"
                  >
                    Not Classified
                  </Badge>
                )}
              </div>

              {profileData && (
                <div>
                  <p className="text-sm font-medium mb-1">Profile Details:</p>
                  <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-48">
                    {JSON.stringify(profileData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={fetchProfile} variant="outline" className="mr-2">
              Refresh Profile
            </Button>
            <Button
              onClick={runDiagnostics}
              disabled={isTesting}
              className="mr-2"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Run Diagnostics"
              )}
            </Button>
            <Button
              onClick={async () => {
                try {
                  setIsTesting(true);
                  const response = await fetch("/api/profile", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      learning_speed: "moderate",
                      is_classified: true,
                    }),
                  });

                  const result = await response.json();

                  if (!response.ok) {
                    throw new Error(
                      result.error || "Failed to update profile via API"
                    );
                  }

                  toast({
                    title: "Success!",
                    description: "Profile updated via API endpoint",
                  });

                  // Refresh profile
                  await fetchProfile();
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: `Failed to update profile: ${error.message}`,
                    variant: "destructive",
                  });
                } finally {
                  setIsTesting(false);
                }
              }}
              disabled={isTesting}
              variant="secondary"
            >
              Test API Fix
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Run diagnostics to see results
              </p>
            ) : (
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div key={index} className="border rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{result.action}</p>
                      <Badge
                        variant="outline"
                        className={
                          result.success
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {result.success ? "Success" : "Failed"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
