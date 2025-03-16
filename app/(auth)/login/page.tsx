"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "@/lib/supabase/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Brain, Loader2, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { supabase, session, isLoading: isSessionLoading } = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Track if we're in the process of redirecting
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Add rate limiting protection
  const [retryTimeout, setRetryTimeout] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Add a persistedAttempts counter to track login attempts across page refreshes
  const [persistedAttempts, setPersistedAttempts] = useState(0);

  // Add this useEffect to load persisted attempts from localStorage
  useEffect(() => {
    // Load persisted attempts from localStorage
    const storedAttempts = localStorage.getItem("loginAttempts");
    const storedTimestamp = localStorage.getItem("loginAttemptsTimestamp");

    if (storedAttempts && storedTimestamp) {
      const attempts = parseInt(storedAttempts, 10);
      const timestamp = parseInt(storedTimestamp, 10);
      const now = Date.now();

      // If the timestamp is less than 15 minutes old, use the stored attempts
      if (now - timestamp < 15 * 60 * 1000) {
        setPersistedAttempts(attempts);

        // If we have already had multiple failed attempts, pre-emptively set rate limit
        if (attempts >= 5) {
          const remainingTime = Math.ceil(
            (timestamp + 15 * 60 * 1000 - now) / 1000
          );
          if (remainingTime > 0) {
            setIsRateLimited(true);
            setRetryTimeout(remainingTime);

            // Create countdown timer
            const timer = setInterval(() => {
              setRetryTimeout((prev) => {
                if (prev <= 1) {
                  clearInterval(timer);
                  setIsRateLimited(false);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
        }
      } else {
        // Clear old attempts if they're more than 15 minutes old
        localStorage.removeItem("loginAttempts");
        localStorage.removeItem("loginAttemptsTimestamp");
      }
    }
  }, []);

  // Handle session changes
  useEffect(() => {
    if (session && !isRedirecting) {
      setIsRedirecting(true);

      // Check if user has taken the classification test
      const checkClassification = async () => {
        try {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("is_classified")
            .eq("user_id", session.user.id)
            .single();

          if (error) throw error;

          // Redirect based on classification status
          if (profile && profile.is_classified) {
            router.push("/dashboard");
          } else {
            router.push("/classification-test");
          }
        } catch (error) {
          console.error("Error checking classification status:", error);
          // If there's an error, redirect to dashboard as a fallback
          router.push("/dashboard");
        }
      };

      checkClassification();
    }
  }, [session, router, isRedirecting, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isLoading || isRedirecting || isRateLimited) return;

    // Validate inputs
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    // Track login attempts
    const newAttemptCount = persistedAttempts + 1;
    setPersistedAttempts(newAttemptCount);
    localStorage.setItem("loginAttempts", newAttemptCount.toString());
    localStorage.setItem("loginAttemptsTimestamp", Date.now().toString());

    // Pre-emptively rate limit after too many attempts
    if (newAttemptCount >= 10) {
      setIsRateLimited(true);
      const waitTime = 60; // 1 minute timeout after 10 attempts
      setRetryTimeout(waitTime);

      // Create countdown timer
      const timer = setInterval(() => {
        setRetryTimeout((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsRateLimited(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      toast({
        title: "Too many login attempts",
        description: `Please wait ${waitTime} seconds before trying again.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    console.log("Attempting login with email:", email);

    try {
      // Check if Supabase is properly initialized
      if (!supabase || !supabase.auth) {
        throw new Error("Authentication service not initialized");
      }

      console.log("Calling signInWithPassword");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);

        // Handle rate limiting specifically - improved detection
        if (
          error.message?.includes("rate limit") ||
          error.message?.includes("too many") ||
          error.status === 429 ||
          error.name === "AuthApiError"
        ) {
          setIsRateLimited(true);
          // Increase timeout for additional protection
          const waitTime = Math.min(60 * newAttemptCount, 300); // Scale up to max 5 minutes
          setRetryTimeout(waitTime);

          // Create a countdown timer
          const timer = setInterval(() => {
            setRetryTimeout((prev) => {
              if (prev <= 1) {
                clearInterval(timer);
                setIsRateLimited(false);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          toast({
            title: "Rate limit reached",
            description: `Please wait ${waitTime} seconds before trying again. This helps protect your account.`,
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        console.log("Login successful, user:", data.user?.id);
      toast({
        title: "Login successful",
        description: "Welcome back to Study Buddy!",
        });

        // Force a client-side navigation to dashboard
        setTimeout(() => {
          router.push("/dashboard");
        }, 500);
      }
    } catch (error: any) {
      console.error("Login failed with error:", error);

      // Provide more specific error messages
      let errorMessage = "Please check your credentials and try again.";

      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Email or password is incorrect. Please try again.";
      } else if (error.message?.includes("network")) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      if (!isRateLimited) {
        setIsLoading(false);
      }
    }
  };

  // Show loading state while checking session
  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <Brain className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || isRedirecting}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || isRedirecting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : (
                    <Eye
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Hide password" : "Show password"}
                  </span>
                </Button>
              </div>
            </div>
            {isRateLimited ? (
              <Button type="submit" className="w-full" disabled={true}>
                Try again in {retryTimeout} seconds
              </Button>
            ) : (
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isRedirecting}
              >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : isRedirecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-center text-sm text-muted-foreground mt-2">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
