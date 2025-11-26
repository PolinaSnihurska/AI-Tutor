# AI Service

AI-powered explanation and content generation service for the AI Tutoring Platform.

## Features

- **Topic Explanations**: Generate age-appropriate explanations for any topic
- **Example Generation**: Create practical examples to illustrate concepts
- **Streaming Support**: Stream long explanations for better UX
- **Caching**: Redis-based caching for common queries
- **Prompt Management**: Versioned prompts with A/B testing capability
- **Context Management**: Maintain conversation history for follow-up questions

## Setup

### Prerequisites

- Python 3.11+
- Redis (for caching)
- OpenAI API key

### Installation

```bash
cd packages/ai-service
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file or set the following environment variables:

```bash
# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Redis
REDIS_URL=redis://:redis@localhost:6379

# Service
AI_SERVICE_PORT=8000
NODE_ENV=development
LOG_LEVEL=INFO
```

## Running the Service

### Development

```bash
python main.py
```

The service will start on `http://localhost:8000`

### Production

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### Health Check

```bash
GET /health
```

Returns service status and dependency health.

### Generate Explanation

```bash
POST /explanations/
Content-Type: application/json

{
  "topic": "Pythagorean theorem",
  "subject": "Mathematics",
  "student_level": 8,
  "context": "Student is preparing for geometry exam"
}
```

Returns a structured explanation with examples and related topics.

### Stream Explanation

```bash
POST /explanations/stream
Content-Type: application/json

{
  "topic": "Photosynthesis",
  "subject": "Biology",
  "student_level": 10
}
```

Streams the explanation content as Server-Sent Events.

### Generate Examples

```bash
GET /explanations/examples?topic=Quadratic%20equations&subject=Mathematics&student_level=9&num_examples=3
```

Returns specific examples for a topic.

## Architecture

### Components

- **FastAPI Application**: Main web framework
- **OpenAI Client**: Wrapper for OpenAI API with retry logic
- **Redis Client**: Caching layer for responses
- **Prompt Manager**: Manages prompt templates and versioning
- **Context Manager**: Handles conversation history
- **Explanation Service**: Business logic for generating explanations

### Prompt System

The service uses LangChain for prompt management with different templates:

- **Explanation**: Standard explanations for middle school students
- **Simplification**: Simple explanations for younger students (grades 1-5)
- **Advanced**: Detailed explanations for high school students (grades 9-12)
- **Example Generation**: Creating practical examples
- **Conversational**: Follow-up questions in context

### Caching Strategy

- Common explanations are cached in Redis for 24 hours
- Cache keys are generated from topic, subject, and student level
- Cache can be bypassed by setting `use_cache=false` in requests

## Development

### Project Structure

```
app/
├── main.py                 # FastAPI application
├── config.py              # Configuration management
├── logging_config.py      # Logging setup
├── clients/               # External service clients
│   ├── openai_client.py   # OpenAI API wrapper
│   └── redis_client.py    # Redis cache client
├── models/                # Pydantic models
│   ├── requests.py        # Request models
│   └── responses.py       # Response models
├── prompts/               # Prompt management
│   ├── templates.py       # Prompt templates
│   └── prompt_manager.py  # Prompt versioning
├── routes/                # API endpoints
│   ├── health.py          # Health checks
│   └── explanations.py    # Explanation endpoints
└── services/              # Business logic
    ├── explanation_service.py  # Explanation generation
    └── context_manager.py      # Conversation context
```

### Adding New Prompt Templates

1. Define the template in `app/prompts/templates.py`
2. Register it in `app/prompts/prompt_manager.py`
3. Add formatting method if needed

### Error Handling

The service includes comprehensive error handling:

- OpenAI API errors (rate limits, connection issues)
- Validation errors for requests
- General exceptions with logging

All errors are logged and returned with appropriate HTTP status codes.

## Monitoring

### Health Endpoints

- `/health` - Overall service health
- `/health/ready` - Readiness check
- `/health/live` - Liveness check

### Logging

Structured logging with configurable log levels:

```bash
LOG_LEVEL=DEBUG python main.py
```

## Performance

- **Response Time**: <2 seconds for explanations (requirement)
- **Caching**: Reduces response time to <100ms for cached queries
- **Streaming**: Improves perceived performance for long explanations
- **Retry Logic**: Automatic retries for transient failures

## Testing

Run tests with:

```bash
pytest
```

## License

Proprietary - AI Tutoring Platform
