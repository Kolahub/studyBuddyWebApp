"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/lib/supabase/provider";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DebugProfilePage() {
  const { supabase, session, isLoading } = useSupabase();
  const { toast } = useToast();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [isBusy, setIsBusy] = useState(false);

  const fetchProfile = async () => {
    if (!session?.user?.id) return;

    setIsBusy(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error fetching profile",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setProfile(data);
        console.log("Profile data:", data);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setIsBusy(false);
    }
  };

  const updateClassification = async () => {
    setIsBusy(true);
    try {
      // Try direct Supabase update
      if (profile) {
        const { error } = await supabase
          .from("profiles")
          .update({
            is_classified: true,
            learning_speed: profile.learning_speed || "moderate",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", session?.user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert({
          user_id: session?.user.id,
          is_classified: true,
          learning_speed: "moderate",
        });

        if (error) throw error;
      }

      toast({
        title: "Profile updated",
        description: "Classification status set to true",
      });

      // Refresh profile data
      await fetchProfile();
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      });

      // Try using the API endpoint as fallback
      try {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            learning_speed: profile?.learning_speed || "moderate",
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to update via API");
        }

        toast({
          title: "Profile updated via API",
          description: "Classification status set to true",
        });

        // Refresh profile data
        await fetchProfile();
      } catch (apiErr: any) {
        toast({
          title: "API update failed",
          description: apiErr.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsBusy(false);
    }
  };

  const testRedirect = () => {
    console.log("Testing redirect to dashboard...");
    router.push("/dashboard");

    // Fallback
    setTimeout(() => {
      console.log("Using fallback navigation...");
      window.location.href = "/dashboard";
    }, 1000);
  };

  useEffect(() => {
    if (session) {
      fetchProfile();
    }
  }, [session]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Debug Profile</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profile Status</CardTitle>
        </CardHeader>
        <CardContent>
          {profile ? (
            <div className="space-y-4">
              <div>
                <p className="font-semibold">User ID:</p>
                <p className="text-sm text-muted-foreground">
                  {profile.user_id}
                </p>
              </div>
              <div>
                <p className="font-semibold">Classification Status:</p>
                <p className="text-sm">
                  {profile.is_classified
                    ? "Classified ✅"
                    : "Not Classified ❌"}
                </p>
              </div>
              <div>
                <p className="font-semibold">Learning Speed:</p>
                <p className="text-sm">{profile.learning_speed || "Not set"}</p>
              </div>
              <div>
                <p className="font-semibold">Last Updated:</p>
                <p className="text-sm">
                  {profile.updated_at
                    ? new Date(profile.updated_at).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </div>
          ) : (
            <p>No profile found for this user</p>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={fetchProfile} variant="outline" disabled={isBusy}>
            {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh Profile
          </Button>
          <Button onClick={updateClassification} disabled={isBusy}>
            {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Set Classified = True
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Navigation Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Test if redirection to dashboard works correctly
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={testRedirect}>Test Dashboard Redirect</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
