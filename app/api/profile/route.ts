import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Handle POST request to update user profile
export async function POST(request: NextRequest) {
  try {
    // Parse the JSON body
    const requestData = await request.json();
    const { learning_speed } = requestData;
    // Don't use is_classified from request since column might not exist

    // Create a Supabase client
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if profile exists
    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Try to update with learning_speed only first (safer)
    try {
      // If profile exists, update it
      if (existingProfile) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            learning_speed,
            is_classified: true,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Profile update error:", updateError);
          throw updateError;
        }
      } else {
        // If profile doesn't exist, create a new one
        const { error: insertError } = await supabase.from("profiles").insert({
          user_id: user.id,
          learning_speed,
          is_classified: true,
        });

        if (insertError) {
          console.error("Profile insert error:", insertError);
          throw insertError;
        }
      }

      return NextResponse.json({
        success: true,
        message: "Profile updated successfully",
      });
    } catch (error: any) {
      console.error("Could not update profile:", error);

      // Run the SQL migration to add the column
      try {
        // Try to add the column directly
        await supabase.rpc("execute_sql", {
          sql_query:
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_classified BOOLEAN DEFAULT FALSE;",
        });

        // Try the update again with both fields
        if (existingProfile) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              learning_speed,
              is_classified: true,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({
              user_id: user.id,
              learning_speed,
              is_classified: true,
            });

          if (insertError) throw insertError;
        }

        return NextResponse.json({
          success: true,
          message: "Profile updated successfully after schema update",
        });
      } catch (schemaError: any) {
        return NextResponse.json(
          { error: `Schema update failed: ${schemaError.message}` },
          { status: 500 }
        );
      }
    }
  } catch (error: any) {
    console.error("Profile update exception:", error);
    return NextResponse.json(
      { error: `Unexpected error: ${error.message}` },
      { status: 500 }
    );
  }
}

// Handle GET request to get user profile
export async function GET() {
  try {
    // Create a Supabase client
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Profile fetch error:", profileError);
      return NextResponse.json(
        { error: `Failed to fetch profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(profile || { is_classified: false });
  } catch (error: any) {
    console.error("Profile fetch exception:", error);
    return NextResponse.json(
      { error: `Unexpected error: ${error.message}` },
      { status: 500 }
    );
  }
}
