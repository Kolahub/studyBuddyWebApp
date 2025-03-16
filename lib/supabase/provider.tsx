"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import {
  createClientComponentClient,
  type SupabaseClient,
} from "@supabase/auth-helpers-nextjs";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { toast } from "@/components/ui/use-toast";

type SupabaseContext = {
  supabase: SupabaseClient;
  session: Session | null;
  isLoading: boolean;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

// Add rate limiting handling with exponential backoff
const createSupabaseClient = () => {
  try {
    console.log("Initializing Supabase client");
    console.log("SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    // Don't log the actual key for security, just log if it exists
    console.log(
      "SUPABASE_ANON_KEY exists:",
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      console.error("Missing Supabase environment variables");
      throw new Error("Missing required Supabase configuration");
    }

    // Custom fetch function with built-in retry and exponential backoff
    const fetchWithRetry = async (
      url: RequestInfo | URL,
      options: RequestInit,
      retries = 3,
      initialBackoff = 300
    ) => {
      let currentRetry = 0;
      let backoff = initialBackoff;

      while (currentRetry <= retries) {
        try {
          const response = await fetch(url, options);

          // Check if we hit rate limits (429)
          if (response.status === 429) {
            // Get retry-after header if available
            const retryAfter = response.headers.get("retry-after");
            const waitTime = retryAfter
              ? parseInt(retryAfter, 10) * 1000
              : backoff;

            console.warn(
              `Rate limit hit. Retrying after ${waitTime}ms. Attempt ${
                currentRetry + 1
              } of ${retries + 1}`
            );

            // Wait for the backoff period
            await new Promise((resolve) => setTimeout(resolve, waitTime));

            // Increase backoff for next attempt
            backoff *= 2;
            currentRetry++;
            continue;
          }

          return response;
        } catch (error) {
          if (currentRetry === retries) {
            console.error("Fetch failed after maximum retries:", error);
            throw error;
          }

          console.warn(
            `Request failed, retrying (${currentRetry + 1}/${retries + 1})...`,
            error
          );

          // Wait for the backoff period
          await new Promise((resolve) => setTimeout(resolve, backoff));

          // Increase backoff for next attempt (exponential backoff)
          backoff *= 2;
          currentRetry++;
        }
      }

      // This should never happen, but TypeScript requires a return value
      throw new Error("Unexpected error in fetch retry logic");
    };

    const client = createClientComponentClient({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      options: {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: "pkce",
          // Add specific retry options for auth
          retryAttempts: 0, // Disable Supabase's built-in retries to use our custom retry logic
        },
        // Add a global error handler with retry
        global: {
          fetch: fetchWithRetry,
          headers: {
            // Add rate limit handling headers
            "X-Client-Info": "study-buddy-web-app",
          },
        },
        // Reduce request concurrency to avoid hitting rate limits
        realtime: {
          params: {
            eventsPerSecond: 2, // Limit events per second
          },
        },
      },
    });
    console.log("Supabase client initialized successfully");
    return client;
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    // Return a basic client as fallback
    toast({
      title: "Connection Error",
      description:
        "Failed to initialize authentication. Please reload the page.",
      variant: "destructive",
    });
    return createClientComponentClient();
  }
};

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(createSupabaseClient);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Track if we've already redirected to prevent loops
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log("Getting initial session");
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Authentication error:", error.message);
          toast({
            title: "Authentication Error",
            description:
              "Failed to connect to authentication service. Please try again later.",
            variant: "destructive",
          });
        } else {
          console.log(
            "Session retrieved:",
            data.session ? "Valid session" : "No session"
          );
        }

        setSession(data.session);
        setIsLoading(false);
      } catch (error) {
        console.error("Error getting session:", error);
        setIsLoading(false);

        // Handle network errors gracefully
        if (error instanceof Error) {
          if (error.message.includes("Failed to fetch")) {
            toast({
              title: "Connection Error",
              description:
                "Unable to connect to authentication service. Please check your internet connection and try again.",
              variant: "destructive",
            });
          }
        }
      }
    };

    initializeAuth();

    // Set up auth state change listener
    console.log("Setting up auth state change listener");
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("Auth state change event:", event);

      // Update session state
      setSession(newSession);

      // Handle auth state changes with error handling
      try {
        if (event === "SIGNED_IN" && !hasRedirected) {
          console.log("User signed in, redirecting");
          setHasRedirected(true);

          // Force a router refresh
          router.refresh();

          // Redirect to dashboard if on an auth page
          if (pathname?.includes("/login") || pathname?.includes("/signup")) {
            // Use a short timeout to ensure state updates complete
            setTimeout(() => {
              router.push("/dashboard");
            }, 100);
          }
        } else if (event === "SIGNED_OUT") {
          console.log("User signed out");
          setHasRedirected(false);

          // Force a router refresh first
          router.refresh();

          // Use a short timeout to ensure state updates are complete
          setTimeout(() => {
            // Use replace instead of push to avoid history issues
            router.replace("/");
          }, 200);
        } else if (event === "TOKEN_REFRESHED") {
          console.log("Token refreshed successfully");
        } else if (event === "USER_UPDATED") {
          console.log("User updated");
        }
      } catch (error) {
        console.error("Auth state change error:", error);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router, pathname, hasRedirected]);

  return (
    <Context.Provider value={{ supabase, session, isLoading }}>
      {children}
    </Context.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider");
  }
  return context;
};
