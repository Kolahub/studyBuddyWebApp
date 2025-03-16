import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Mock BART model function for summaries (to be replaced with actual model integration)
function getBartModelSummary(
  slideTitle: string,
  slideDescription: string,
  learningSpeed: string
) {
  // Adjust the summary based on learning speed
  let summaryLength: number;
  let detailLevel: string;

  // Configure the summary parameters based on learning speed
  switch (learningSpeed) {
    case "slow":
      summaryLength = 0.275; // 25-30% of original content (more concise)
      detailLevel = "concise";
      break;
    case "moderate":
      summaryLength = 0.375; // 35-40% of original content (balanced)
      detailLevel = "balanced";
      break;
    case "fast":
      summaryLength = 0.475; // 45-50% of original content (more detailed)
      detailLevel = "detailed";
      break;
    default:
      summaryLength = 0.375;
      detailLevel = "balanced";
  }

  // Generate a meaningful mock summary based on the slide title
  let mockSummary = "";
  const titleWords = slideTitle.split(" ");

  // If description is too short, generate a more elaborate fake content
  if (!slideDescription || slideDescription.split(" ").length < 30) {
    // Create topic-specific content based on common educational topics in the title
    if (
      slideTitle.toLowerCase().includes("data structure") ||
      slideTitle.toLowerCase().includes("algorithm")
    ) {
      mockSummary = generateComputerScienceSummary(slideTitle, detailLevel);
    } else if (
      slideTitle.toLowerCase().includes("math") ||
      slideTitle.toLowerCase().includes("calculus") ||
      slideTitle.toLowerCase().includes("algebra")
    ) {
      mockSummary = generateMathSummary(slideTitle, detailLevel);
    } else if (
      slideTitle.toLowerCase().includes("history") ||
      slideTitle.toLowerCase().includes("civilization")
    ) {
      mockSummary = generateHistorySummary(slideTitle, detailLevel);
    } else if (
      slideTitle.toLowerCase().includes("biology") ||
      slideTitle.toLowerCase().includes("chemistry") ||
      slideTitle.toLowerCase().includes("physics")
    ) {
      mockSummary = generateScienceSummary(slideTitle, detailLevel);
    } else {
      // Generic academic summary
      mockSummary = generateGenericSummary(slideTitle, detailLevel);
    }
  } else {
    // Use actual description if it's substantial
    const content = slideDescription;
    // In a real implementation, this would pass the content to the BART model
    mockSummary = `This ${detailLevel} summary covers the key points of "${slideTitle}". ${
      detailLevel === "concise"
        ? "The most essential concepts include the fundamental principles and core ideas without additional details."
        : detailLevel === "balanced"
        ? "It provides a balanced overview that includes main concepts and supporting examples."
        : "It explores the topic in depth, covering main concepts, supporting details, and contextual information."
    } The summary is tailored for ${learningSpeed} learners, focusing on ${
      learningSpeed === "slow"
        ? "clarity and simplicity"
        : learningSpeed === "moderate"
        ? "balanced content delivery"
        : "comprehensive understanding and connections"
    }.`;
  }

  return {
    summary: mockSummary,
    detail_level: detailLevel,
    learning_speed: learningSpeed,
  };
}

// Helper functions to generate realistic mock summaries for different subjects
function generateComputerScienceSummary(title: string, detailLevel: string) {
  // Create longer base content that will be trimmed based on detail level
  const baseContent = [
    `This summary covers key concepts in ${title}.`,
    `Data structures organize and store data efficiently, enabling effective data manipulation and retrieval.`,
    `Common structures include arrays, linked lists, stacks, queues, trees, and graphs.`,
    `Each structure has specific use cases based on operations like insertion, deletion, and searching.`,
    `Algorithms are step-by-step procedures to solve computational problems, evaluated by time and space complexity.`,
    `Big O notation measures algorithm efficiency.`,
    `Array operations have different complexities: access is O(1), while searching is O(n) in the worst case.`,
    `Linked lists offer efficient insertion and deletion but slower access times.`,
    `Stacks follow Last-In-First-Out (LIFO) principles, useful for function calls and expression evaluation.`,
    `Queues use First-In-First-Out (FIFO) ordering, important for scheduling and breadth-first searches.`,
    `Binary search trees offer O(log n) operations when balanced.`,
    `Hash tables provide near-constant time access but may face collision issues.`,
    `Graphs represent connections between entities and solve complex relationship problems.`,
    `Dynamic programming optimizes solutions by breaking problems into simpler subproblems.`,
    `Greedy algorithms make locally optimal choices at each step.`,
    `Choosing the right data structure significantly impacts application performance and scalability.`,
    `Understanding these concepts helps optimize software design for performance, resource utilization, and maintainability.`,
    `Real-world applications include database systems, network routing, and artificial intelligence.`,
    `Algorithm analysis requires considering both worst-case and average-case performance scenarios.`,
    `Space complexity is as important as time complexity when evaluating algorithms.`,
    `Recursive algorithms solve problems by breaking them down into smaller instances of the same problem.`,
    `Problem-solving patterns like divide-and-conquer can be applied across different domains.`,
  ];

  // Select sentences based on detail level
  let sentences;
  if (detailLevel === "concise") {
    // 25-30% - About 5 sentences
    sentences = baseContent.slice(0, 5);
    sentences.push(
      "Focus on core data structures like arrays and linked lists to build a strong foundation."
    );
  } else if (detailLevel === "balanced") {
    // 35-40% - About 8-9 sentences
    sentences = baseContent.slice(0, 9);
    sentences.push(
      "Practice implementing these structures to understand their real-world applications."
    );
  } else {
    // 45-50% - About 15-18 sentences for fast learners (expanded)
    sentences = baseContent.slice(0, 18);
    sentences.push(
      "Advanced concepts include balancing trees, graph traversals, and algorithm optimization techniques."
    );
    sentences.push(
      "Studying space-time tradeoffs helps develop efficient solutions to complex computational problems."
    );
    sentences.push(
      "Understanding algorithmic paradigms enables solving novel problems by applying established patterns."
    );
    sentences.push(
      "Mastery of these concepts is essential for technical interviews and high-performance software development."
    );
  }

  return sentences.join(" ");
}

function generateMathSummary(title: string, detailLevel: string) {
  // Create longer base content that will be trimmed based on detail level
  const baseContent = [
    `This summary covers fundamental concepts in ${title}.`,
    `Mathematical principles provide frameworks for solving problems through precise logic and quantitative analysis.`,
    `Key areas include numerical operations, algebraic expressions, geometric principles, and statistical analysis.`,
    `Core concepts build the foundation for understanding more complex mathematical ideas.`,
    `Problem-solving strategies are essential for applying mathematical knowledge effectively.`,
    `Mathematical notation provides a precise language for expressing relationships and operations.`,
    `Formulas represent key relationships that can be applied to solve specific types of problems.`,
    `Practice with varied examples strengthens mathematical intuition and problem-solving abilities.`,
    `Understanding proofs develops logical reasoning and validates mathematical principles.`,
    `Advanced topics build on foundational concepts to address more complex scenarios.`,
    `Applications in real-world contexts demonstrate the practical value of mathematical concepts.`,
    `Interdisciplinary connections show how mathematics supports other fields like science and economics.`,
    `Historical context explains how mathematical concepts evolved over time to address new challenges.`,
    `Visual representations help conceptualize abstract mathematical ideas.`,
    `Technology and computational tools extend mathematical capabilities for complex calculations.`,
    `Mathematical reasoning skills transfer across disciplines, supporting logical thinking in many fields.`,
    `Axiomatic systems provide the foundation for mathematical theories and their consistent applications.`,
    `Mathematical modeling translates real-world problems into abstract representations for analysis.`,
    `Number theory explores properties of integers and has applications in cryptography and computer science.`,
    `Differential equations describe how quantities change and are fundamental to physics and engineering.`,
    `Probability theory quantifies uncertainty and forms the basis of statistical inference.`,
    `Optimization techniques identify the best solution from a set of alternatives under given constraints.`,
  ];

  // Select sentences based on detail level
  let sentences;
  if (detailLevel === "concise") {
    // 25-30% - About 5 sentences
    sentences = baseContent.slice(0, 5);
    sentences.push(
      "Focus on mastering core formulas and their practical applications."
    );
  } else if (detailLevel === "balanced") {
    // 35-40% - About 8-9 sentences
    sentences = baseContent.slice(0, 9);
    sentences.push(
      "Balancing conceptual understanding with procedural fluency leads to stronger mathematical competence."
    );
  } else {
    // 45-50% - About 15-18 sentences for fast learners (expanded)
    sentences = baseContent.slice(0, 18);
    sentences.push(
      "Exploring connections between different mathematical areas reveals the unified nature of mathematical thinking."
    );
    sentences.push(
      "Understanding both abstract theory and concrete applications develops robust problem-solving capabilities."
    );
    sentences.push(
      "Advanced mathematical thinking involves pattern recognition, abstraction, and systematic reasoning."
    );
    sentences.push(
      "Mastery requires both breadth across mathematical domains and depth in specialized areas of interest."
    );
  }

  return sentences.join(" ");
}

function generateHistorySummary(title: string, detailLevel: string) {
  // Create longer base content that will be trimmed based on detail level
  const baseContent = [
    `This summary examines key developments in ${title}.`,
    `Historical analysis considers political, economic, social, and cultural factors that shaped significant events.`,
    `Understanding historical context helps explain cause-and-effect relationships and patterns across time.`,
    `Major events and key figures provide reference points for examining historical periods.`,
    `Chronological frameworks organize historical developments into coherent narratives.`,
    `Primary sources provide direct evidence from the period being studied.`,
    `Secondary sources offer interpretations and analysis by historians.`,
    `Historical perspectives often change as new evidence emerges or societal values evolve.`,
    `Comparative approaches examine similarities and differences between historical periods or regions.`,
    `Political history focuses on governance, power structures, and conflicts between nations.`,
    `Economic history examines production, distribution, and consumption of goods and resources.`,
    `Social history explores the lives of ordinary people and group experiences.`,
    `Cultural history studies art, literature, beliefs, and intellectual developments.`,
    `Historiography examines how historical narratives themselves change over time.`,
    `Interdisciplinary approaches incorporate methods from archaeology, anthropology, and other fields.`,
    `Critical analysis of historical sources considers bias, authenticity, and cultural context.`,
    `Long-term historical trends reveal patterns that may not be evident in shorter timeframes.`,
    `Counterfactual analysis explores alternative scenarios to understand historical contingencies.`,
    `Microhistory examines small-scale events or individuals to illuminate broader historical patterns.`,
    `Global history connects developments across different regions and civilizations.`,
    `Environmental history considers the relationship between human societies and natural environments.`,
    `Digital humanities applies computational methods to historical research and analysis.`,
  ];

  // Select sentences based on detail level
  let sentences;
  if (detailLevel === "concise") {
    // 25-30% - About 5 sentences
    sentences = baseContent.slice(0, 5);
    sentences.push(
      "Focus on understanding major historical turning points and their immediate consequences."
    );
  } else if (detailLevel === "balanced") {
    // 35-40% - About 8-9 sentences
    sentences = baseContent.slice(0, 9);
    sentences.push(
      "This balanced approach combines factual knowledge with analytical perspectives on historical developments."
    );
  } else {
    // 45-50% - About 15-18 sentences for fast learners (expanded)
    sentences = baseContent.slice(0, 18);
    sentences.push(
      "Multiple interpretations of the same events demonstrate how history is constantly reexamined and recontextualized."
    );
    sentences.push(
      "Understanding historical actors' motivations requires considering the values and constraints of their time period."
    );
    sentences.push(
      "Critical engagement with historical sources develops analytical skills applicable across academic disciplines."
    );
    sentences.push(
      "Connecting past developments to contemporary issues helps develop nuanced perspectives on current challenges."
    );
  }

  return sentences.join(" ");
}

function generateScienceSummary(title: string, detailLevel: string) {
  // Create longer base content that will be trimmed based on detail level
  const baseContent = [
    `This summary explores essential concepts in ${title}.`,
    `Scientific disciplines use the scientific method to investigate natural phenomena.`,
    `The scientific method involves observation, hypothesis formation, experimentation, and theory development.`,
    `Understanding fundamental principles provides the foundation for analyzing complex systems.`,
    `Empirical evidence supports scientific conclusions and theoretical frameworks.`,
    `Scientific models simplify complex phenomena to highlight key relationships and mechanisms.`,
    `Laboratory work demonstrates principles in action and develops technical skills.`,
    `Quantitative analysis applies mathematical tools to interpret scientific data.`,
    `Scientific literacy involves understanding both theoretical concepts and practical applications.`,
    `Interdisciplinary research combines insights from multiple scientific disciplines.`,
    `Technological applications translate scientific knowledge into practical solutions.`,
    `Ethical considerations guide research practices and applications of scientific knowledge.`,
    `Scientific consensus emerges through rigorous peer review and replication of results.`,
    `Historical developments show how scientific understanding evolves over time.`,
    `Current research frontiers continue to expand knowledge boundaries.`,
    `Scientific reasoning skills transfer to many contexts, supporting critical thinking and problem-solving.`,
    `Systems thinking examines how components interact within complex natural and artificial systems.`,
    `Experimental design controls variables to establish causal relationships between phenomena.`,
    `Statistical analysis helps quantify uncertainty and evaluate the significance of research findings.`,
    `Scientific paradigms provide frameworks for interpreting observations and guiding research.`,
    `Computational methods enhance scientific capabilities for modeling complex systems and analyzing large datasets.`,
    `Scientific communication disseminates knowledge through technical publications and public engagement.`,
  ];

  // Select sentences based on detail level
  let sentences;
  if (detailLevel === "concise") {
    // 25-30% - About 5 sentences
    sentences = baseContent.slice(0, 5);
    sentences.push(
      "Focus on mastering core principles and their fundamental applications."
    );
  } else if (detailLevel === "balanced") {
    // 35-40% - About 8-9 sentences
    sentences = baseContent.slice(0, 9);
    sentences.push(
      "This approach balances theoretical understanding with practical applications in scientific contexts."
    );
  } else {
    // 45-50% - About 15-18 sentences for fast learners (expanded)
    sentences = baseContent.slice(0, 18);
    sentences.push(
      "Advanced topics explore theoretical underpinnings, experimental methodologies, and cutting-edge applications."
    );
    sentences.push(
      "Understanding both established principles and current research supports comprehensive scientific literacy."
    );
    sentences.push(
      "Scientific fields continually evolve as new evidence challenges existing theories and opens new research directions."
    );
    sentences.push(
      "Integrating knowledge across multiple scientific domains enables innovative approaches to complex problems."
    );
  }

  return sentences.join(" ");
}

function generateGenericSummary(title: string, detailLevel: string) {
  // Create longer base content that will be trimmed based on detail level
  const baseContent = [
    `This summary addresses key aspects of ${title}.`,
    `The subject explores important concepts, principles, and applications relevant to its domain.`,
    `Understanding foundational elements provides context for more advanced topics.`,
    `Key terminology helps establish precise communication within the field.`,
    `Core principles organize the subject's knowledge base into coherent frameworks.`,
    `Historical development provides context for current understanding.`,
    `Theoretical frameworks explain relationships between concepts and phenomena.`,
    `Practical applications demonstrate how knowledge translates to real-world contexts.`,
    `The field encompasses both abstract concepts and concrete implementations.`,
    `Critical analysis of major theories encourages nuanced understanding.`,
    `Case studies and examples illustrate abstract concepts in concrete situations.`,
    `Interdisciplinary connections show how this subject relates to other fields.`,
    `Ongoing research continues to expand knowledge boundaries in this area.`,
    `Methodological approaches vary depending on specific research questions.`,
    `Ethical considerations guide responsible implementation of knowledge.`,
    `Developing expertise requires both breadth across the field and depth in specialized areas.`,
    `Professional practices establish standards for applying knowledge in practical contexts.`,
    `Technological innovations continually transform approaches to long-standing challenges in the field.`,
    `Global perspectives highlight cultural and regional variations in understanding and application.`,
    `Communication skills enable effective sharing of specialized knowledge with diverse audiences.`,
    `Reflective practice supports ongoing professional development and knowledge integration.`,
    `Problem-based learning connects theoretical knowledge with practical challenges.`,
  ];

  // Select sentences based on detail level
  let sentences;
  if (detailLevel === "concise") {
    // 25-30% - About 5 sentences
    sentences = baseContent.slice(0, 5);
    sentences.push(
      "Focus on mastering essential concepts and their primary applications."
    );
  } else if (detailLevel === "balanced") {
    // 35-40% - About 8-9 sentences
    sentences = baseContent.slice(0, 9);
    sentences.push(
      "This balanced approach combines theoretical understanding with practical knowledge application."
    );
  } else {
    // 45-50% - About 15-18 sentences for fast learners (expanded)
    sentences = baseContent.slice(0, 18);
    sentences.push(
      "Advanced study integrates theoretical frameworks with specialized applications across various contexts."
    );
    sentences.push(
      "Understanding both established principles and emerging developments supports comprehensive mastery."
    );
    sentences.push(
      "Critical engagement with multiple perspectives fosters sophisticated understanding of complex issues."
    );
    sentences.push(
      "Connecting theoretical knowledge with real-world applications develops adaptive problem-solving capabilities."
    );
  }

  return sentences.join(" ");
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Verify authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the request body
    const body = await request.json();
    const { slideId } = body;

    if (!slideId) {
      return NextResponse.json(
        { error: "Slide ID is required" },
        { status: 400 }
      );
    }

    // Get user's learning speed from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("learning_speed, is_classified")
      .eq("user_id", session.user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to get user profile" },
        { status: 500 }
      );
    }

    // Default to moderate if not classified
    const learningSpeed = profile?.is_classified
      ? profile.learning_speed
      : "moderate";

    // Check if a cached summary exists for this slide and learning speed
    const { data: cachedSummary, error: cacheError } = await supabase
      .from("cached_summaries")
      .select("*")
      .eq("slide_id", slideId)
      .eq("learning_speed", learningSpeed)
      .single();

    if (!cacheError && cachedSummary) {
      // Return the cached summary
      return NextResponse.json({
        summary: JSON.parse(cachedSummary.summary_data),
        cached: true,
      });
    }

    // Get the slide title and description
    const { data: slide, error: slideError } = await supabase
      .from("slides")
      .select("title, description")
      .eq("id", slideId)
      .single();

    if (slideError || !slide) {
      return NextResponse.json(
        { error: "Failed to get slide data" },
        { status: 404 }
      );
    }

    // Generate summary using BART model (or mock for now)
    const summary = getBartModelSummary(
      slide.title,
      slide.description || "",
      learningSpeed
    );

    // Cache the generated summary
    await supabase.from("cached_summaries").upsert({
      slide_id: slideId,
      learning_speed: learningSpeed,
      summary_data: JSON.stringify(summary),
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      summary,
      cached: false,
    });
  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { error: "An error occurred while generating the summary" },
      { status: 500 }
    );
  }
}
