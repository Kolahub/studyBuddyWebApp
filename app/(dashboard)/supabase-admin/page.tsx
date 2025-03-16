"use client";

import { useState } from "react";
import { useSupabase } from "@/lib/supabase/provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SupabaseAdminPage() {
  const { supabase, session, isLoading } = useSupabase();
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("custom");

  // Sample queries
  const sampleQueries = {
    checkProfiles: `SELECT * FROM pg_tables WHERE tablename = 'profiles';`,
    checkRLS: `SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd AS operation,
      qual AS using_expression,
      with_check
    FROM
      pg_policies
    WHERE
      tablename = 'profiles';`,
    showTableConstraints: `SELECT
      tc.constraint_name, tc.table_name, kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.table_name = 'profiles';`,
    fixRLSForProfiles: `
    -- Fix profiles table RLS policies
    -- Enable RLS on profiles table (in case it's not enabled)
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist to avoid conflicts
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    
    -- Create policies
    CREATE POLICY "Users can view their own profile" 
    ON public.profiles 
    FOR SELECT 
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);`,
  };

  const executeSQL = async (sql: string = sqlQuery) => {
    if (!sql.trim()) {
      setError("Please enter an SQL query");
      return;
    }

    setIsExecuting(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc("execute_sql", {
        sql_query: sql,
      });

      if (error) throw error;

      setQueryResult(data);
    } catch (err: any) {
      console.error("SQL execution error:", err);
      setError(err.message || "Failed to execute SQL query");
      setQueryResult(null);
    } finally {
      setIsExecuting(false);
    }
  };

  const runPresetQuery = (query: string) => {
    setSqlQuery(query);
    executeSQL(query);
    setActiveTab("custom");
  };

  // If loading or no session, handle appropriately
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
            <CardTitle>Supabase Admin</CardTitle>
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
      <h1 className="text-3xl font-bold mb-6">Supabase Admin</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="custom">Custom SQL</TabsTrigger>
          <TabsTrigger value="preset">Preset Queries</TabsTrigger>
          <TabsTrigger value="fix">Fix Scripts</TabsTrigger>
        </TabsList>

        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle>Execute SQL Query</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="Enter SQL query here..."
                  className="min-h-[200px] font-mono"
                />

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => executeSQL()} disabled={isExecuting}>
                {isExecuting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  "Execute Query"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="preset">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Check Profiles Table</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-48">
                  {sampleQueries.checkProfiles}
                </pre>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => runPresetQuery(sampleQueries.checkProfiles)}
                >
                  Run Query
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Check RLS Policies</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-48">
                  {sampleQueries.checkRLS}
                </pre>
              </CardContent>
              <CardFooter>
                <Button onClick={() => runPresetQuery(sampleQueries.checkRLS)}>
                  Run Query
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Show Table Constraints</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-48">
                  {sampleQueries.showTableConstraints}
                </pre>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() =>
                    runPresetQuery(sampleQueries.showTableConstraints)
                  }
                >
                  Run Query
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fix">
          <Card>
            <CardHeader>
              <CardTitle>Fix RLS for Profiles</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-48">
                {sampleQueries.fixRLSForProfiles}
              </pre>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => runPresetQuery(sampleQueries.fixRLSForProfiles)}
              >
                Run Fix Script
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {queryResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              Query Result
              <Badge variant="outline" className="ml-auto">
                {Array.isArray(queryResult)
                  ? `${queryResult.length} rows`
                  : "Query executed successfully"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-[400px]">
              {JSON.stringify(queryResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
