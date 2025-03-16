-- Migration to add ai_content table for enhanced flashcard generation

-- Check if the table already exists
CREATE TABLE IF NOT EXISTS ai_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create unique index on topic to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS ai_content_topic_idx ON ai_content (topic);

-- Add comment explaining the table purpose
COMMENT ON TABLE ai_content IS 'Stores AI-generated supplementary content for topics with minimal slide content';

-- Add data for common computer science topics
INSERT INTO ai_content (topic, content, category)
VALUES 
  ('Data Structures', 'Data structures are specialized formats for organizing, processing, and storing data in computers. They provide efficient ways to access and modify information.

Common data structures include:
- Arrays: Contiguous memory locations storing elements of the same type
- Linked Lists: Nodes containing data and references to the next node
- Stacks: Last-in, first-out (LIFO) collection of elements
- Queues: First-in, first-out (FIFO) collection of elements
- Trees: Hierarchical structures with parent-child relationships
- Graphs: Collections of nodes connected by edges
- Hash Tables: Data structures that map keys to values using a hash function

Choosing the appropriate data structure affects algorithm efficiency, memory usage, and overall performance of software applications.', 'Computer Science'),
  
  ('Data Representation', 'Data representation refers to how information is encoded, stored, and manipulated in computer systems. It involves various formats and methods to represent different types of data.

Key aspects of data representation include:
- Binary representation: Using 0s and 1s as the fundamental unit of data
- Number systems: Binary, octal, decimal, and hexadecimal
- Character encoding: ASCII, Unicode, UTF-8 for representing text
- Floating-point representation: IEEE 754 standard for representing real numbers
- Fixed-point representation: Alternative to floating-point for specific applications
- Image representation: Pixels, color models (RGB, CMYK), compression formats
- Audio/video representation: Sampling, quantization, compression algorithms

Understanding data representation is crucial for efficient algorithm design, data compression, and handling data integrity issues.', 'Computer Science'),
  
  ('Algorithms', 'Algorithms are step-by-step procedures or formulas for solving problems and performing computations. They form the foundation of all computer programming and problem-solving.

Key characteristics of algorithms:
- Input: Data provided to the algorithm
- Output: The result after processing
- Definiteness: Each step is precisely defined
- Finiteness: The algorithm terminates after a finite number of steps
- Effectiveness: Each step can be performed exactly in finite time

Common algorithm categories:
- Sorting algorithms: Bubble sort, merge sort, quicksort
- Search algorithms: Linear search, binary search
- Graph algorithms: BFS, DFS, Dijkstra''s algorithm
- Dynamic programming algorithms: Solving complex problems by breaking them down
- Greedy algorithms: Making locally optimal choices at each stage

Algorithm efficiency is typically measured using Big O notation, which describes how the runtime or space requirements grow as input size increases.', 'Computer Science'),

  ('Object-Oriented Programming', 'Object-Oriented Programming (OOP) is a programming paradigm based on the concept of "objects" containing data and code. It uses the concepts of classes and objects to structure and organize code.

Core principles of OOP:
- Encapsulation: Bundling data and methods that operate on the data
- Inheritance: Creating new classes that inherit properties and methods from existing classes
- Polymorphism: The ability to present the same interface for different underlying forms
- Abstraction: Hiding complex implementation details behind simple interfaces

Key OOP concepts:
- Classes: Templates or blueprints for creating objects
- Objects: Instances of classes with specific properties and behaviors
- Methods: Functions defined in classes that describe object behaviors
- Attributes: Data contained within objects
- Constructors: Special methods for initializing new objects

OOP is widely used in software engineering to create modular, reusable, and maintainable code structures.', 'Programming'),

  ('Database Systems', 'Database systems are organized collections of data with the software to access, manage, and update that data. They provide efficient storage, retrieval, and manipulation of information.

Key components of database systems:
- Database Management System (DBMS): Software that manages the database
- Data models: Relational, NoSQL, hierarchical, network models
- Schema: Structure defining how data is organized
- Query language: Languages like SQL used to interact with databases
- Transactions: Logical units of work performed within a database
- Indexing: Techniques to improve query performance
- Normalization: Process of organizing data to reduce redundancy

Common database types:
- Relational databases: MySQL, PostgreSQL, Oracle, SQL Server
- NoSQL databases: MongoDB, Cassandra, Redis, CouchDB
- In-memory databases: Redis, Memcached
- Graph databases: Neo4j, Amazon Neptune
- Time-series databases: InfluxDB, TimescaleDB

Database systems enable data persistence, concurrent access, and data integrity for applications.', 'Computer Science'),

  ('Web Development', 'Web development involves creating websites and web applications that run on the internet. It encompasses front-end (client-side) and back-end (server-side) development.

Front-end development:
- HTML: Structure and content of web pages
- CSS: Styling and layout of web pages
- JavaScript: Adding interactivity and dynamic features
- Frameworks/libraries: React, Angular, Vue.js
- Responsive design: Adapting to different screen sizes

Back-end development:
- Server-side languages: Node.js, Python, PHP, Ruby, Java
- Web servers: Apache, Nginx, Express
- Databases: MySQL, PostgreSQL, MongoDB
- APIs: REST, GraphQL
- Authentication and authorization

Full-stack development combines both front-end and back-end skills. Modern web development also involves concepts like progressive web apps, serverless architectures, and microservices.', 'Programming'),

  ('Artificial Intelligence', 'Artificial Intelligence (AI) is the field of computer science focused on creating systems capable of performing tasks that typically require human intelligence. These tasks include learning, reasoning, problem-solving, perception, and language understanding.

Key branches of AI:
- Machine Learning: Systems that learn from data
- Deep Learning: Neural network-based approaches with multiple layers
- Natural Language Processing: Understanding and generating human language
- Computer Vision: Enabling computers to interpret visual information
- Robotics: Systems that perceive, reason, and act in the physical world
- Expert Systems: Knowledge-based systems emulating human expertise

AI techniques:
- Supervised learning: Training on labeled data
- Unsupervised learning: Finding patterns in unlabeled data
- Reinforcement learning: Learning through interaction with an environment
- Neural networks: Computing systems inspired by biological neural networks
- Genetic algorithms: Evolutionary problem-solving methods

AI applications span numerous fields including healthcare, finance, transportation, entertainment, and education.', 'Computer Science')
ON CONFLICT (topic) DO UPDATE
SET content = EXCLUDED.content, 
    category = EXCLUDED.category,
    updated_at = NOW();

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_content_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp on updates
DROP TRIGGER IF EXISTS update_ai_content_timestamp ON ai_content;
CREATE TRIGGER update_ai_content_timestamp
BEFORE UPDATE ON ai_content
FOR EACH ROW
EXECUTE FUNCTION update_ai_content_timestamp(); 