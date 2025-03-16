/**
 * Sample course data for common computer science topics
 * This provides high-quality fallback content when OpenAI is unavailable
 * or when slide content is insufficient
 */

export const sampleCourseData = {
  "Data Structures": {
    definition:
      "Data structures are specialized formats for organizing, processing, and storing data that provide efficient access and modification.",
    topics: [
      {
        name: "Arrays",
        definition:
          "Contiguous collection of elements that can be accessed by index",
        characteristics:
          "Fast access by index, fixed size in many languages, efficient memory usage",
        examples: "int[] numbers = {1, 2, 3, 4, 5}",
        applications:
          "Storing ordered collections of similar items, implementing other data structures",
      },
      {
        name: "Linked Lists",
        definition:
          "Linear collection of elements called nodes, where each node points to the next node",
        characteristics:
          "Dynamic size, efficient insertion/deletion, sequential access only",
        examples:
          "Node { data, next } -> Node { data, next } -> Node { data, next }",
        applications:
          "Implementation of stacks, queues, and other dynamic data structures",
      },
      {
        name: "Stacks",
        definition:
          "Last-In-First-Out (LIFO) data structure where elements are added and removed from the same end",
        characteristics:
          "Push and pop operations, tracks recently visited elements",
        examples: "Browser history, undo functionality in applications",
        applications:
          "Expression evaluation, syntax parsing, backtracking algorithms",
      },
      {
        name: "Queues",
        definition:
          "First-In-First-Out (FIFO) data structure where elements are added at one end and removed from the other",
        characteristics:
          "Enqueue and dequeue operations, maintains order of arrival",
        examples: "Print queue, process scheduling",
        applications: "Breadth-first search, task scheduling, buffering",
      },
      {
        name: "Trees",
        definition:
          "Hierarchical structure with a root node and child nodes organized in levels",
        characteristics:
          "Parent-child relationships, recursive structure, no cycles",
        examples: "Binary tree, binary search tree, AVL tree",
        applications:
          "Hierarchical data representation, efficient searching and sorting",
      },
      {
        name: "Hash Tables",
        definition:
          "Data structure that maps keys to values using a hash function",
        characteristics:
          "Fast lookups, insertions, and deletions; potential for collisions",
        examples: "Dictionary, object in JavaScript, Map in Java",
        applications: "Database indexing, caching, symbol tables in compilers",
      },
      {
        name: "Graphs",
        definition:
          "Collection of nodes (vertices) connected by edges, representing relationships between objects",
        characteristics:
          "Can be directed or undirected, weighted or unweighted, cyclic or acyclic",
        examples: "Social networks, road maps, web pages and links",
        applications:
          "Network analysis, pathfinding algorithms, recommendation systems",
      },
    ],
    questions: [
      {
        question:
          "What is the primary difference between arrays and linked lists?",
        answer:
          "Arrays store elements in contiguous memory locations with direct index access, while linked lists store elements in separate nodes that point to the next node, requiring sequential access. Arrays have fixed size in many languages and offer faster random access, while linked lists provide better performance for insertions and deletions and can dynamically resize.",
      },
      {
        question: "How do stacks and queues differ in their operation?",
        answer:
          "Stacks follow Last-In-First-Out (LIFO) principle where the most recently added element is removed first (push/pop operations). Queues follow First-In-First-Out (FIFO) principle where the element that has been in the queue the longest is removed first (enqueue/dequeue operations).",
      },
      {
        question: "What makes hash tables efficient for data retrieval?",
        answer:
          "Hash tables achieve efficiency through their hash function that maps keys directly to array indices, allowing for O(1) average-case time complexity for lookups, insertions, and deletions. The hash function converts the key into an array index, enabling direct access to the stored value without needing to search through the entire data structure.",
      },
      {
        question: "How are trees useful in representing hierarchical data?",
        answer:
          "Trees naturally model hierarchical relationships through their parent-child structure. Each node can have multiple children, creating a branching structure that mirrors real-world hierarchies like file systems, organization charts, or family trees. This structure enables efficient searching, insertion, and deletion operations while preserving relationships between data elements.",
      },
      {
        question: "What are the trade-offs between different data structures?",
        answer:
          "Different data structures offer trade-offs between time complexity, space complexity, and implementation simplicity. Arrays provide fast random access but slow insertions/deletions. Linked lists enable efficient insertions/deletions but slow random access. Hash tables offer fast average-case operations but may require more memory. Trees balance search, insertion, and deletion operations for ordered data. The choice depends on the specific requirements of the application and the operations that will be performed most frequently.",
      },
    ],
  },
  Algorithms: {
    definition:
      "Algorithms are step-by-step procedures or formulas for solving problems, consisting of well-defined instructions.",
    topics: [
      {
        name: "Sorting Algorithms",
        definition:
          "Algorithms that arrange elements in a certain order (ascending or descending)",
        examples: "Bubble Sort, Merge Sort, Quick Sort, Insertion Sort",
        complexity:
          "Ranges from O(n²) for simple algorithms to O(n log n) for efficient ones",
        applications:
          "Database operations, organizing data for search operations",
      },
      {
        name: "Search Algorithms",
        definition:
          "Algorithms that retrieve information stored within a data structure",
        examples:
          "Linear Search, Binary Search, Depth-First Search, Breadth-First Search",
        complexity:
          "Ranges from O(n) for linear search to O(log n) for binary search on sorted data",
        applications: "Finding elements in collections, pathfinding in graphs",
      },
      {
        name: "Dynamic Programming",
        definition:
          "Method for solving complex problems by breaking them down into simpler subproblems",
        characteristics: "Overlapping subproblems, optimal substructure",
        examples:
          "Fibonacci sequence calculation, Knapsack problem, Longest Common Subsequence",
        applications: "Optimization problems, resource allocation",
      },
      {
        name: "Greedy Algorithms",
        definition:
          "Algorithms that make locally optimal choices at each stage with the hope of finding a global optimum",
        characteristics:
          "Make best choice at moment without considering future implications",
        examples: "Kruskal's algorithm, Huffman coding, Dijkstra's algorithm",
        applications: "Minimum spanning trees, data compression",
      },
      {
        name: "Divide and Conquer",
        definition:
          "Approach that breaks a problem into smaller subproblems, solves them, and combines their solutions",
        characteristics: "Recursive decomposition, combination of solutions",
        examples: "Merge sort, Quick sort, Binary search",
        applications: "Efficient sorting and searching, computational geometry",
      },
    ],
    questions: [
      {
        question: "How does binary search achieve logarithmic time complexity?",
        answer:
          "Binary search achieves O(log n) time complexity by repeatedly dividing the search interval in half. It compares the target value to the middle element of the sorted array and eliminates half of the remaining elements with each comparison. This approach creates a logarithmic relationship between the input size and the number of comparisons needed, making it significantly faster than linear search for large datasets.",
      },
      {
        question: "What is the difference between Merge Sort and Quick Sort?",
        answer:
          "Merge Sort and Quick Sort are both efficient sorting algorithms with average case O(n log n) complexity, but they use different approaches. Merge Sort follows a divide-and-conquer strategy by splitting the array in half recursively, sorting each half, and then merging them back together. It guarantees O(n log n) performance but requires additional memory for the merge operation. Quick Sort selects a pivot element and partitions the array around it, then recursively sorts the sub-arrays. While Quick Sort is often faster in practice and sorts in-place, it can degrade to O(n²) in worst-case scenarios with poor pivot selection.",
      },
      {
        question:
          "Why is dynamic programming effective for optimization problems?",
        answer:
          "Dynamic programming is effective for optimization problems because it breaks complex problems into simpler overlapping subproblems and stores their solutions to avoid redundant computations. By solving each subproblem only once and saving its result in a table (memoization), dynamic programming eliminates the exponential explosion of recursive calls. This approach works particularly well for problems with optimal substructure, where the optimal solution to the original problem can be constructed from optimal solutions of its subproblems.",
      },
      {
        question:
          "When would you choose a greedy algorithm over dynamic programming?",
        answer:
          "Choose a greedy algorithm over dynamic programming when the problem exhibits a 'greedy choice property' and has optimal substructure. Greedy algorithms make locally optimal choices without reconsidering previous decisions, making them simpler and more efficient than dynamic programming when applicable. They're appropriate when each local optimal choice leads to a global optimum. Greedy algorithms typically require less memory and run faster but work for fewer problems. Use them for interval scheduling, Huffman coding, or minimum spanning trees, but prefer dynamic programming for complex optimization problems like the knapsack problem where greedy approaches fail to find optimal solutions.",
      },
      {
        question: "How does the choice of algorithm affect program efficiency?",
        answer:
          "The choice of algorithm dramatically affects program efficiency through its time and space complexity characteristics. An inefficient algorithm may work fine for small inputs but become prohibitively slow as data size increases. For example, replacing a O(n²) sorting algorithm with a O(n log n) alternative can reduce processing time from hours to seconds on large datasets. Algorithm selection should consider the expected input size, available memory, required operation types, and whether the data has special properties (sorted, mostly sorted, etc.). The right algorithm can make the difference between a program that scales successfully and one that fails under real-world conditions.",
      },
    ],
  },
  "Data Representation": {
    definition:
      "Data representation refers to how information is encoded, stored, and manipulated in computer systems.",
    topics: [
      {
        name: "Number Systems",
        definition: "Methods of representing numeric values in different bases",
        examples:
          "Binary (base-2), Octal (base-8), Decimal (base-10), Hexadecimal (base-16)",
        applications: "Memory addressing, color codes, digital logic",
      },
      {
        name: "Binary Representation",
        definition:
          "Representation of data using only two symbols, typically 0 and 1",
        characteristics:
          "Fundamental to all digital computing, basis for Boolean logic",
        applications:
          "Storage of all data types in computers, digital communication",
      },
      {
        name: "Character Encoding",
        definition: "Systems for representing text characters as numbers",
        examples: "ASCII, Unicode (UTF-8, UTF-16), ISO-8859",
        applications: "Text storage and processing, internationalization",
      },
      {
        name: "Floating-Point Representation",
        definition: "Method for representing real numbers with decimal points",
        characteristics: "Uses sign, mantissa, and exponent components",
        examples: "IEEE 754 standard",
        applications: "Scientific calculations, graphics processing",
      },
      {
        name: "Data Compression",
        definition:
          "Techniques to reduce data size while preserving information",
        types:
          "Lossless (perfect reconstruction) and lossy (approximate reconstruction)",
        examples: "ZIP, JPEG, MP3 formats",
        applications:
          "File storage, multimedia transmission, bandwidth optimization",
      },
    ],
    questions: [
      {
        question:
          "Why is binary the fundamental representation system in computers?",
        answer:
          "Binary is the fundamental representation system in computers because digital electronic components naturally operate in two states: on or off, high voltage or low voltage, magnetized or demagnetized. This binary property aligns perfectly with Boolean logic (true/false) and makes hardware implementation simpler and more reliable. Using just two digits (0 and 1) allows for straightforward circuit design using logic gates and enables error detection and correction. While other number systems like hexadecimal are used for convenience, they're ultimately converted to binary for computer processing.",
      },
      {
        question: "How does UTF-8 improve upon ASCII for character encoding?",
        answer:
          "UTF-8 improves upon ASCII by supporting the entire Unicode character set (over 143,000 characters) while maintaining backward compatibility with ASCII. ASCII only encodes 128 characters, primarily English letters, numbers, and basic symbols. UTF-8 is a variable-width encoding that uses 1 byte for standard ASCII characters but can expand to up to 4 bytes for other characters, making it space-efficient. This allows UTF-8 to represent characters from virtually all modern writing systems, including Chinese, Arabic, and emoji, enabling true internationalization of software while preserving compatibility with existing ASCII-based systems.",
      },
      {
        question:
          "What are the trade-offs between lossy and lossless compression?",
        answer:
          "Lossy compression achieves higher compression ratios by permanently discarding some data deemed less important, resulting in smaller file sizes but with some quality degradation. It's commonly used for multimedia where perfect reconstruction isn't essential (JPEG, MP3). Lossless compression preserves all original data and allows perfect reconstruction, but achieves lower compression ratios. It's used when data integrity is critical, such as with text documents, program code, or medical images. The choice between them depends on the application's requirements for file size versus data integrity.",
      },
      {
        question:
          "How does floating-point representation affect precision in calculations?",
        answer:
          "Floating-point representation affects precision through inherent limitations in representing real numbers with finite bits. The IEEE 754 standard uses a sign bit, exponent, and mantissa to cover a wide range of values, but with varying precision. This leads to rounding errors when representing numbers that don't convert exactly to binary fractions (like 0.1), causing accumulation of errors in calculations. The precision is higher for numbers closer to zero and decreases for very large or small numbers. These limitations can cause surprising results, such as 0.1 + 0.2 ≠ 0.3 exactly, making floating-point arithmetic unsuitable for applications requiring exact decimal arithmetic, like financial calculations.",
      },
      {
        question:
          "Why is hexadecimal commonly used when working with binary data?",
        answer:
          "Hexadecimal is commonly used when working with binary data because it provides a more compact and readable representation while maintaining a simple conversion to and from binary. Each hexadecimal digit represents exactly 4 binary digits (bits), making the conversion straightforward: 0-F in hex maps directly to 0000-1111 in binary. This creates a human-readable shorthand that reduces the length of binary values by 75%. Hexadecimal is particularly useful for displaying memory addresses, machine code, color values, and other binary-based entities where seeing the actual bit patterns is important but reading long strings of 1s and 0s would be error-prone and inefficient.",
      },
    ],
  },
};

// Helper function to get content based on a topic
export function getTopicContent(topic: string): string {
  // Find the most relevant topic match
  const topicKey = Object.keys(sampleCourseData).find(
    (key) =>
      topic.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(topic.toLowerCase())
  );

  if (!topicKey) return "";

  const data = sampleCourseData[topicKey as keyof typeof sampleCourseData];

  // Construct a comprehensive text about the topic
  let content = `${topicKey}: ${data.definition}\n\n`;

  // Add information about sub-topics
  if (data.topics) {
    content += "Key concepts:\n";
    data.topics.forEach((topic) => {
      content += `- ${topic.name}: ${topic.definition}\n`;
      if (topic.characteristics)
        content += `  Characteristics: ${topic.characteristics}\n`;
      if (topic.examples) content += `  Examples: ${topic.examples}\n`;
      if (topic.applications)
        content += `  Applications: ${topic.applications}\n`;
      content += "\n";
    });
  }

  return content;
}

// Helper function to get sample questions based on a topic
export function getTopicQuestions(
  topic: string
): Array<{ question: string; answer: string }> {
  // Find the most relevant topic match
  const topicKey = Object.keys(sampleCourseData).find(
    (key) =>
      topic.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(topic.toLowerCase())
  );

  if (!topicKey) return [];

  const data = sampleCourseData[topicKey as keyof typeof sampleCourseData];
  return data.questions || [];
}
