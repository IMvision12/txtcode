"""Realistic prompt generation for different workload types."""

from typing import List, Dict, Any
import random
import json


class PromptGenerator:
    """Generate realistic prompts for benchmarking."""
    
    # Sample data for realistic prompts
    CHAT_TEMPLATES = [
        "Hello! Can you help me understand {topic}?",
        "I'm working on {topic} and need some guidance. Can you explain the key concepts?",
        "What are the best practices for {topic}?",
        "Can you provide a detailed explanation of {topic}?",
        "I'm learning about {topic}. What should I know?",
        "Explain {topic} in simple terms.",
        "What are common mistakes when working with {topic}?",
        "How does {topic} work in practice?",
    ]
    
    TOPICS = [
        "machine learning", "web development", "data structures", "algorithms",
        "cloud computing", "database design", "API development", "security",
        "distributed systems", "microservices", "containerization", "CI/CD",
    ]
    
    RAG_QUERIES = [
        "Summarize the key findings from the document about {topic}",
        "What does the document say about {topic}?",
        "Extract the main points regarding {topic}",
        "Based on the provided context, explain {topic}",
        "Find information about {topic} in the documents",
        "What are the recommendations for {topic}?",
        "Compare different approaches to {topic} mentioned in the text",
    ]
    
    DOCUMENT_SNIPPETS = [
        "In recent studies, researchers have found that {topic} plays a crucial role...",
        "The implementation of {topic} requires careful consideration of...",
        "Best practices for {topic} include the following approaches...",
        "When analyzing {topic}, it's important to consider multiple factors...",
        "The evolution of {topic} has led to significant improvements in...",
    ]
    
    @staticmethod
    def generate_chat_prompts(
        count: int,
        context_length: int = 2048,
        vary_length: bool = True
    ) -> List[str]:
        """Generate realistic chat prompts."""
        prompts = []
        
        for i in range(count):
            template = random.choice(PromptGenerator.CHAT_TEMPLATES)
            topic = random.choice(PromptGenerator.TOPICS)
            prompt = template.format(topic=topic)
            
            # Add context to reach desired length
            if vary_length:
                target_length = random.randint(context_length // 2, context_length)
            else:
                target_length = context_length
            
            # Pad with additional context if needed
            while len(prompt.split()) < target_length // 4:  # Rough token estimate
                prompt += f" Additionally, consider the implications of {random.choice(PromptGenerator.TOPICS)}."
            
            prompts.append(prompt)
        
        return prompts
    
    @staticmethod
    def generate_rag_prompts(
        count: int,
        document_count: int = 100,
        context_length: int = 4096,
        query_pattern: str = "hot"
    ) -> List[str]:
        """Generate RAG prompts with document context."""
        prompts = []
        
        # Simulate hot/cold query patterns
        if query_pattern == "hot":
            # Hot: Same documents queried repeatedly
            hot_topics = random.sample(PromptGenerator.TOPICS, min(3, len(PromptGenerator.TOPICS)))
            topics_pool = hot_topics * (count // len(hot_topics) + 1)
        else:
            # Cold: Different documents each time
            topics_pool = [random.choice(PromptGenerator.TOPICS) for _ in range(count)]
        
        for i in range(count):
            topic = topics_pool[i]
            query = random.choice(PromptGenerator.RAG_QUERIES).format(topic=topic)
            
            # Add document context
            num_docs = random.randint(3, 10)
            context_docs = []
            for _ in range(num_docs):
                doc = random.choice(PromptGenerator.DOCUMENT_SNIPPETS).format(topic=topic)
                context_docs.append(doc)
            
            context = "\n\n".join(context_docs)
            prompt = f"Context:\n{context}\n\nQuery: {query}"
            
            prompts.append(prompt)
        
        return prompts
    
    @staticmethod
    def generate_structured_prompts(
        count: int,
        schema: Dict[str, Any] = None
    ) -> List[str]:
        """Generate prompts for structured output generation."""
        if schema is None:
            schema = {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "age": {"type": "integer"},
                    "email": {"type": "string"},
                    "interests": {"type": "array", "items": {"type": "string"}},
                }
            }
        
        prompts = []
        schema_str = json.dumps(schema, indent=2)
        
        for i in range(count):
            prompt = f"""Generate a JSON object matching this schema:

{schema_str}

Create realistic data for user profile {i}. Ensure all fields are properly formatted."""
            prompts.append(prompt)
        
        return prompts
    
    @staticmethod
    def generate_tool_calling_prompts(
        count: int,
        parallel_tools: int = 5
    ) -> List[str]:
        """Generate prompts that require tool/function calling."""
        tools = [
            {"name": "get_weather", "params": ["location", "units"]},
            {"name": "search_web", "params": ["query", "num_results"]},
            {"name": "calculate", "params": ["expression"]},
            {"name": "get_stock_price", "params": ["symbol"]},
            {"name": "translate", "params": ["text", "target_language"]},
            {"name": "send_email", "params": ["to", "subject", "body"]},
        ]
        
        prompts = []
        
        for i in range(count):
            # Select random tools to call
            selected_tools = random.sample(tools, min(parallel_tools, len(tools)))
            
            prompt = f"Please help me with the following tasks:\n"
            for j, tool in enumerate(selected_tools, 1):
                if tool["name"] == "get_weather":
                    prompt += f"{j}. Get the weather for New York in celsius\n"
                elif tool["name"] == "search_web":
                    prompt += f"{j}. Search for information about {random.choice(PromptGenerator.TOPICS)}\n"
                elif tool["name"] == "calculate":
                    prompt += f"{j}. Calculate {random.randint(10, 100)} * {random.randint(10, 100)}\n"
                elif tool["name"] == "get_stock_price":
                    prompt += f"{j}. Get the current stock price for AAPL\n"
                elif tool["name"] == "translate":
                    prompt += f"{j}. Translate 'Hello world' to Spanish\n"
                elif tool["name"] == "send_email":
                    prompt += f"{j}. Draft an email about {random.choice(PromptGenerator.TOPICS)}\n"
            
            prompts.append(prompt)
        
        return prompts
    
    @staticmethod
    def generate_coding_prompts(count: int) -> List[str]:
        """Generate coding-related prompts."""
        tasks = [
            "Write a Python function to implement binary search",
            "Create a REST API endpoint for user authentication",
            "Implement a LRU cache in Python",
            "Write a SQL query to find the top 10 customers by revenue",
            "Create a React component for a todo list",
            "Implement a merge sort algorithm",
            "Write a function to validate email addresses",
            "Create a Docker compose file for a web application",
        ]
        
        prompts = []
        for i in range(count):
            task = random.choice(tasks)
            prompt = f"{task}. Include error handling and documentation."
            prompts.append(prompt)
        
        return prompts
