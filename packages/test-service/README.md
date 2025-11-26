# Test Service

The Test Service is responsible for test generation, management, submission, and evaluation in the AI Tutoring Platform.

## Features

### 1. Test Generation
- **AI-Powered Generation**: Generates tests using OpenAI based on subject, topics, and difficulty
- **Multiple Question Types**: Supports multiple choice, true/false, and open-ended questions
- **Customizable Parameters**: Configure difficulty, question count, and topics

### 2. Test Management
- **CRUD Operations**: Create, read, update, and delete tests
- **Search & Filter**: Find tests by subject, topics, difficulty, and creator
- **Access Control**: Retrieve tests with or without answers based on user role

### 3. Test Submission & Evaluation
- **Answer Checking**: Automatic evaluation of multiple choice and true/false questions
- **Open-Ended Evaluation**: AI-powered evaluation for open-ended questions
- **Detailed Results**: Provides question-by-question breakdown with explanations
- **Performance Analysis**: Identifies weak topics and strong areas

### 4. Adaptive Questioning
- **Dynamic Difficulty**: Adjusts question difficulty based on student performance
- **Topic Selection**: Prioritizes topics where student needs more practice
- **Performance Tracking**: Maintains student performance profiles
- **Personalized Learning**: Generates adaptive tests tailored to student level

## API Endpoints

### Test Generation
```
POST /tests/generate
Body: {
  subject: string,
  topics: string[],
  difficulty: number (1-10),
  questionCount: number,
  questionTypes?: string[],
  studentLevel?: number (1-12)
}
```

### Get Test
```
GET /tests/:testId?includeAnswers=true
```

### Submit Test
```
POST /tests/submit
Body: {
  testId: string,
  studentId: string,
  answers: Array<{ questionId: string, answer: string | string[] }>,
  startTime: string,
  endTime: string
}
```

### Test History
```
GET /tests/history/:studentId?limit=20
```

### Test Results
```
GET /tests/results/:studentId?testId=xxx&limit=20
GET /tests/result/:resultId
```

### Search Tests
```
GET /tests?subject=xxx&topics=xxx,yyy&difficulty=5&createdBy=ai&limit=20
```

### Adaptive Testing
```
POST /tests/adaptive/generate
Body: {
  studentId: string,
  subject: string,
  topics: string[],
  questionCount: number
}

POST /tests/adaptive/next-question
Body: {
  studentId: string,
  subject: string,
  topics: string[]
}
```

## Database Schema

### Tests Collection (MongoDB)
```javascript
{
  _id: ObjectId,
  title: string,
  subject: string,
  topics: string[],
  questions: [{
    id: string,
    type: 'multiple_choice' | 'true_false' | 'open_ended',
    content: string,
    options?: string[],
    correctAnswer: string | string[],
    explanation: string,
    difficulty: number,
    topic: string,
    points: number
  }],
  timeLimit?: number,
  passingScore: number,
  createdBy: 'ai' | 'admin',
  createdAt: Date,
  updatedAt: Date
}
```

### Test Results Collection (MongoDB)
```javascript
{
  _id: ObjectId,
  testId: string,
  studentId: string,
  score: number,
  percentage: number,
  correctAnswers: number,
  totalQuestions: number,
  timeSpent: number,
  detailedResults: [{
    questionId: string,
    correct: boolean,
    userAnswer: string | string[],
    correctAnswer: string | string[],
    explanation: string
  }],
  weakTopics: string[],
  recommendations: string[],
  createdAt: Date
}
```

## Services

### TestService
- Manages test CRUD operations
- Integrates with AI service for test generation
- Handles test search and filtering

### TestSubmissionService
- Processes test submissions
- Evaluates answers
- Generates detailed results and recommendations

### EvaluationService
- Provides advanced answer evaluation
- Analyzes test performance patterns
- Generates personalized recommendations
- AI-powered evaluation for open-ended questions

### AdaptiveQuestioningService
- Maintains student performance profiles
- Calculates next difficulty level
- Selects optimal topics for practice
- Generates adaptive tests

## Environment Variables

```bash
TEST_SERVICE_PORT=3003
AI_SERVICE_URL=http://localhost:8000
MONGO_USER=mongo
MONGO_PASSWORD=mongo
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DB=ai_tutor
```

## Running the Service

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Integration with AI Service

The test service integrates with the AI service for:
1. **Test Generation**: Calls `/tests/generate` endpoint
2. **Open-Ended Evaluation**: Uses explanation endpoint for answer evaluation
3. **Adaptive Questions**: Generates questions at appropriate difficulty levels

## Adaptive Questioning Algorithm

The adaptive questioning system:

1. **Tracks Performance**: Monitors last 5 questions and consecutive correct/incorrect answers
2. **Adjusts Difficulty**: 
   - Level up after 3 consecutive correct answers
   - Level down after 2 consecutive incorrect answers
3. **Topic Selection**: Prioritizes topics with lowest mastery (< 50%)
4. **Mastery Calculation**: Updates topic mastery based on performance and question difficulty
5. **Success Prediction**: Estimates probability of correct answer based on profile

## Evaluation & Feedback

The evaluation system provides:

1. **Automatic Grading**: Instant evaluation of multiple choice and true/false
2. **AI Evaluation**: Intelligent evaluation of open-ended answers
3. **Performance Analysis**:
   - Weak topics (>50% error rate)
   - Strong topics (<20% error rate)
   - Difficulty analysis
4. **Personalized Recommendations**:
   - Study strategies
   - Topic-specific guidance
   - Next steps based on performance

## Requirements Covered

- **Requirement 3.1**: Test generation within 1 second ✓
- **Requirement 3.2**: Varying difficulty levels ✓
- **Requirement 3.3**: Detailed explanations for incorrect answers ✓
- **Requirement 3.4**: Adaptive questioning based on responses ✓
- **Requirement 12.2**: AI-powered test generation ✓
