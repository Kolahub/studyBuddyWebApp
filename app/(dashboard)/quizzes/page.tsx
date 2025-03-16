import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { QuizzesClient } from "./client-page";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Brain, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/shell";
import { DashboardHeader } from "@/components/dashboard/header";

export default async function QuizzesPage() {
  const supabase = createServerSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch user profile to check classification status
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_classified")
    .eq("user_id", session.user.id)
    .single();

  const isClassified = profile?.is_classified || false;

  // If user is not classified, show assessment notice
  if (!isClassified) {
    return (
      <DashboardShell>
        <DashboardHeader
          heading="Quizzes"
          text="Adaptive quizzes based on your learning style"
        />
        <div className="mb-8">
          <Alert className="bg-primary/10 border-primary">
            <Brain className="h-5 w-5 text-primary" />
            <AlertTitle className="text-lg font-semibold">
              Complete Your Learning Style Assessment First
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-4">
                Before accessing personalized quizzes, please take our quick
                learning style assessment. This will ensure that quiz difficulty
                and content are tailored to your learning speed.
              </p>
              <Button asChild size="lg">
                <Link href="/classification-test">
                  Take Assessment Now <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </DashboardShell>
    );
  }

  // If user is classified, show quizzes
  return <QuizzesClient />;
}
