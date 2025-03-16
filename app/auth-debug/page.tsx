"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AuthDebugPage() {
  const { supabase, session, isLoading } = useSupabase();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authState, setAuthState] = useState<any>({
    session: null,
    user: null,
    error: null,
  });
  const [isTestingAuth, setIsTestingAuth] = useState(false);
  const [envVars, setEnvVars] = useState<Record<string, string | undefined>>(
    {}
  );

  useEffect(() => {
    // Get environment variables
    setEnvVars({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_URL_SET: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Yes" : "No",
      SUPABASE_KEY_SET: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? "Yes"
        : "No",
    });

    // Get current session
    if (session) {
      setAuthState({
        session: {
          expires_at: session.expires_at,
          created_at: session.created_at,
        },
        user: session.user
          ? {
              id: session.user.id,
              email: session.user.email,
              role: session.user.role,
              created_at: session.user.created_at,
            }
          : null,
        error: null,
      });
    }
  }, [session]);

  const testAuth = async () => {
    setIsTestingAuth(true);
    try {
      // Test connection to Supabase
      const startTime = Date.now();
      const { data, error } = await supabase.auth.getSession();
      const endTime = Date.now();

      if (error) {
        setAuthState({
          session: null,
          user: null,
          error: {
            message: error.message,
            code: error.code,
            stack: error.stack,
          },
        });
        toast({
          title: "Connection Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setAuthState({
          session: data.session
            ? {
                expires_at: data.session.expires_at,
                created_at: data.session.created_at,
              }
            : null,
          user: data.session?.user
            ? {
                id: data.session.user.id,
                email: data.session.user.email,
                role: data.session.user.role,
                created_at: data.session.user.created_at,
              }
            : null,
          responseTime: `${endTime - startTime}ms`,
          error: null,
        });
        toast({
          title: "Connection Successful",
          description: `Response time: ${endTime - startTime}ms`,
        });
      }
    } catch (error: any) {
      setAuthState({
        session: null,
        user: null,
        error: {
          message: error.message,
          stack: error.stack,
        },
      });
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTestingAuth(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please provide both email and password",
        variant: "destructive",
      });
      return;
    }

    setIsTestingAuth(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthState({
          session: null,
          user: null,
          error: {
            message: error.message,
            code: error.code,
            stack: error.stack,
          },
        });
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setAuthState({
          session: data.session
            ? {
                expires_at: data.session.expires_at,
                created_at: data.session.created_at,
              }
            : null,
          user: data.user
            ? {
                id: data.user.id,
                email: data.user.email,
                role: data.user.role,
                created_at: data.user.created_at,
              }
            : null,
          error: null,
        });
        toast({
          title: "Login Successful",
          description: "You have been logged in successfully",
        });
      }
    } catch (error: any) {
      setAuthState({
        session: null,
        user: null,
        error: {
          message: error.message,
          stack: error.stack,
        },
      });
      toast({
        title: "Login Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTestingAuth(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully",
      });
    } catch (error: any) {
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Debug</CardTitle>
            <CardDescription>Loading authentication data...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Authentication Debugger</h1>

      <Tabs defaultValue="status">
        <TabsList className="mb-4">
          <TabsTrigger value="status">Auth Status</TabsTrigger>
          <TabsTrigger value="login">Test Login</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Status</CardTitle>
              <CardDescription>Current authentication state</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Session:</h3>
                <pre className="bg-muted p-4 rounded-md overflow-auto max-h-40">
                  {JSON.stringify(authState.session, null, 2) ||
                    "No active session"}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">User:</h3>
                <pre className="bg-muted p-4 rounded-md overflow-auto max-h-40">
                  {JSON.stringify(authState.user, null, 2) ||
                    "No authenticated user"}
                </pre>
              </div>

              {authState.error && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-500">Error:</h3>
                  <pre className="bg-red-50 p-4 rounded-md overflow-auto max-h-40 text-red-600">
                    {JSON.stringify(authState.error, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button onClick={testAuth} disabled={isTestingAuth}>
                {isTestingAuth ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>

              {authState.user && (
                <Button variant="destructive" onClick={handleSignOut}>
                  Sign Out
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Test Login</CardTitle>
              <CardDescription>
                Test authentication with your credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-email">Email</Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-password">Password</Label>
                <Input
                  id="test-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleLogin} disabled={isTestingAuth}>
                {isTestingAuth ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Test Login"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Environment and configuration information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Environment Variables:</h3>
                <pre className="bg-muted p-4 rounded-md overflow-auto">
                  {JSON.stringify(envVars, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Supabase Client Status:</h3>
                <p className="bg-muted p-3 rounded-md">
                  Supabase initialized: {supabase ? "Yes" : "No"}
                </p>
                <p className="bg-muted p-3 rounded-md mt-2">
                  Auth module available:{" "}
                  {supabase && supabase.auth ? "Yes" : "No"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
