import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const slideId = searchParams.get("slideId");

  if (!slideId) {
    return NextResponse.json(
      { error: "Missing slideId parameter" },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  // Verify authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the slide content
  const { data: slide, error: slideError } = await supabase
    .from("slides")
    .select("content, text_content, title, id, course_id")
    .eq("id", slideId)
    .single();

  if (slideError) {
    return NextResponse.json({ error: slideError.message }, { status: 500 });
  }

  if (!slide) {
    return NextResponse.json({ error: "Slide not found" }, { status: 404 });
  }

  // Clear cached flashcards for this slide
  const { error: deleteCacheError } = await supabase
    .from("cached_flashcards")
    .delete()
    .eq("slide_id", slideId);

  // Parse and analyze content if available
  let contentAnalysis = {};

  if (slide.content) {
    try {
      let parsedContent = null;
      try {
        parsedContent =
          typeof slide.content === "string"
            ? JSON.parse(slide.content)
            : slide.content;
      } catch (e) {
        parsedContent = {
          error: "Failed to parse content as JSON",
          raw: slide.content,
        };
      }

      contentAnalysis = {
        format: typeof parsedContent,
        isArray: Array.isArray(parsedContent),
        hasBlocks:
          parsedContent &&
          Array.isArray(parsedContent) &&
          parsedContent.some((item) => item.type === "paragraph"),
        sample: JSON.stringify(parsedContent).substring(0, 200),
        keys:
          parsedContent && typeof parsedContent === "object"
            ? Object.keys(parsedContent)
            : [],
      };
    } catch (e) {
      contentAnalysis = { error: e.message };
    }
  }

  return NextResponse.json({
    slideDetails: {
      id: slide.id,
      title: slide.title,
      course_id: slide.course_id,
      content_length: slide.content?.length || 0,
      text_content_length: slide.text_content?.length || 0,
      content_sample: slide.content?.substring(0, 100),
      text_content_sample: slide.text_content?.substring(0, 100),
      has_content: !!slide.content,
      has_text_content: !!slide.text_content,
    },
    fullContent: {
      content: slide.content,
      text_content: slide.text_content,
    },
    contentAnalysis,
    cache_cleared: !deleteCacheError,
  });
}
