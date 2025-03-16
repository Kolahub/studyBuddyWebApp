import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      console.error("API: Unauthorized attempt to update content progress");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    console.log(`API: Processing content progress update for user ${userId}`);

    const body = await request.json();
    const { slideId, completed, lastPosition } = body;

    console.log("API: Content progress request data:", {
      slideId,
      completed,
      lastPosition,
      userId,
    });

    if (!slideId) {
      console.error("API: Missing slideId in content progress update");
      return NextResponse.json(
        { error: "Slide ID is required" },
        { status: 400 }
      );
    }

    // Verify the slide exists
    const { data: slideData, error: slideError } = await supabase
      .from("slides")
      .select("id")
      .eq("id", slideId)
      .single();

    if (slideError) {
      console.error(`API: Error verifying slide ${slideId}:`, slideError);
      return NextResponse.json(
        { error: `Invalid slide ID: ${slideError.message}` },
        { status: 400 }
      );
    }

    // Check if a record already exists for this user and slide
    console.log(
      `API: Checking for existing progress record for slide ${slideId}`
    );
    const { data: existingProgress, error: queryError } = await supabase
      .from("content_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("slide_id", slideId)
      .single();

    if (queryError && queryError.code !== "PGRST116") {
      // PGRST116 is "no rows returned" error
      console.error("API: Error checking existing progress:", queryError);
      return NextResponse.json(
        { error: `Failed to check progress: ${queryError.message}` },
        { status: 500 }
      );
    }

    let result;

    if (existingProgress) {
      // Update existing record
      console.log(
        `API: Updating existing progress record ${existingProgress.id}`
      );
      result = await supabase
        .from("content_progress")
        .update({
          completed: completed ?? existingProgress.completed,
          last_position: lastPosition ?? existingProgress.last_position,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProgress.id)
        .select();
    } else {
      // Insert new record
      console.log(`API: Creating new progress record for slide ${slideId}`);
      result = await supabase
        .from("content_progress")
        .insert({
          user_id: userId,
          slide_id: slideId,
          completed: completed ?? false,
          last_position: lastPosition ?? 0,
        })
        .select();
    }

    if (result.error) {
      console.error("API: Error updating content progress:", result.error);
      return NextResponse.json(
        { error: `Failed to update progress: ${result.error.message}` },
        { status: 500 }
      );
    }

    console.log("API: Content progress updated successfully");
    return NextResponse.json({
      success: true,
      data: result.data[0],
    });
  } catch (error) {
    console.error("API: Unexpected error in content progress API:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      console.error("API: Unauthorized attempt to fetch content progress");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(request.url);
    const slideId = url.searchParams.get("slideId");

    console.log(
      `API: Fetching content progress for user ${userId}${
        slideId ? `, slide ${slideId}` : ""
      }`
    );

    if (!slideId) {
      // If no slideId is provided, return all progress for the user
      console.log("API: Fetching all progress records for user");

      const { data, error } = await supabase
        .from("content_progress")
        .select("*, slides(title, course_id)")
        .eq("user_id", userId);

      if (error) {
        console.error("API: Error fetching all content progress:", error);
        return NextResponse.json(
          { error: `Failed to fetch progress: ${error.message}` },
          { status: 500 }
        );
      }

      console.log(`API: Retrieved ${data?.length || 0} progress records`);
      return NextResponse.json({ data });
    } else {
      // Return progress for a specific slide
      console.log(`API: Fetching specific progress for slide ${slideId}`);

      const { data, error } = await supabase
        .from("content_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("slide_id", slideId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("API: Error fetching specific content progress:", error);
        return NextResponse.json(
          { error: `Failed to fetch progress: ${error.message}` },
          { status: 500 }
        );
      }

      console.log(
        `API: Progress data for slide ${slideId}:`,
        data || "No record found"
      );
      return NextResponse.json({
        data: data || { exists: false, completed: false, last_position: 0 },
      });
    }
  } catch (error) {
    console.error("API: Unexpected error in content progress API:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
