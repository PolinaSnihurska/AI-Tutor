import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const aiResponseTime = new Trend('ai_response_time');
const testGenerationTime = new Trend('test_generation_time');
const learningPlanTime = new Trend('learning_plan_time');
const analyticsUpdateTime = new Trend('analytics_update_time');
const requestCount = new Counter('request_count');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 500 },   // Ramp up to 500 users
    { duration: '3m', target: 1000 },  // Ramp up to 1000 users
    { duration: '3m', target: 1000 },  // Stay at 1000 users
    { duration: '1m', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% of requests should be below 2s
    'http_req_failed': ['rate<0.01'],    // Error rate should be below 1%
    'ai_response_time': ['p(95)<2000'],  // AI responses under 2s (Requirement 7.1)
    'test_generation_time': ['p(95)<1000'], // Test generation under 1s (Requirement 7.2)
    'learning_plan_time': ['p(95)<5000'],   // Learning plan under 5s (Requirement 2.1)
    'analytics_update_time': ['p(95)<10000'], // Analytics under 10s (Requirement 4.4)
  },
};

// Environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_SERVICE_URL = __ENV.AUTH_SERVICE_URL || 'http://localhost:3001';
const AI_SERVICE_URL = __ENV.AI_SERVICE_URL || 'http://localhost:8000';
const TEST_SERVICE_URL = __ENV.TEST_SERVICE_URL || 'http://localhost:3003';
const LEARNING_PLAN_SERVICE_URL = __ENV.LEARNING_PLAN_SERVICE_URL || 'http://localhost:3004';
const ANALYTICS_SERVICE_URL = __ENV.ANALYTICS_SERVICE_URL || 'http://localhost:3005';

// Test data
const testUsers = [
  { email: 'student1@loadtest.com', password: 'Test123!@#', role: 'student' },
  { email: 'student2@loadtest.com', password: 'Test123!@#', role: 'student' },
  { email: 'parent1@loadtest.com', password: 'Test123!@#', role: 'parent' },
];

const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'History'];
const topics = [
  'Algebra', 'Geometry', 'Calculus', 'Mechanics', 'Thermodynamics',
  'Organic Chemistry', 'Cell Biology', 'World War II', 'Ancient Rome'
];

// Helper function to get random element from array
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Setup function - runs once per VU
export function setup() {
  console.log('Setting up load test...');
  
  // Create test users if they don't exist
  const tokens = {};
  
  testUsers.forEach(user => {
    const registerRes = http.post(`${AUTH_SERVICE_URL}/api/auth/register`, JSON.stringify({
      email: user.email,
      password: user.password,
      role: user.role,
      firstName: 'Load',
      lastName: 'Test',
      age: 16,
      grade: 10,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    // Login to get token
    const loginRes = http.post(`${AUTH_SERVICE_URL}/api/auth/login`, JSON.stringify({
      email: user.email,
      password: user.password,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (loginRes.status === 200) {
      const body = JSON.parse(loginRes.body);
      tokens[user.email] = body.accessToken;
    }
  });
  
  return { tokens };
}

// Main test function
export default function(data) {
  const user = getRandomElement(testUsers);
  const token = data.tokens[user.email];
  
  if (!token) {
    console.error(`No token for user ${user.email}`);
    return;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  
  // Simulate realistic user behavior with different scenarios
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    // 30% - AI Explanation Request
    testAIExplanation(headers);
  } else if (scenario < 0.5) {
    // 20% - Test Generation and Taking
    testTestGeneration(headers);
  } else if (scenario < 0.7) {
    // 20% - Learning Plan Access
    testLearningPlan(headers);
  } else if (scenario < 0.9) {
    // 20% - Analytics Access
    testAnalytics(headers);
  } else {
    // 10% - Mixed workflow
    testMixedWorkflow(headers);
  }
  
  // Random sleep between 1-5 seconds to simulate user think time
  sleep(Math.random() * 4 + 1);
}

function testAIExplanation(headers) {
  group('AI Explanation', () => {
    const subject = getRandomElement(subjects);
    const topic = getRandomElement(topics);
    
    const startTime = Date.now();
    const res = http.post(`${AI_SERVICE_URL}/api/explanations`, JSON.stringify({
      topic: topic,
      subject: subject,
      studentLevel: Math.floor(Math.random() * 3) + 1,
      context: 'I need help understanding this concept',
    }), { headers });
    
    const duration = Date.now() - startTime;
    aiResponseTime.add(duration);
    requestCount.add(1);
    
    const success = check(res, {
      'AI response status is 200': (r) => r.status === 200,
      'AI response time < 2s': (r) => duration < 2000,
      'AI response has content': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.content && body.content.length > 0;
        } catch (e) {
          return false;
        }
      },
    });
    
    errorRate.add(!success);
  });
}

function testTestGeneration(headers) {
  group('Test Generation', () => {
    const subject = getRandomElement(subjects);
    
    // Generate test
    const startTime = Date.now();
    const generateRes = http.post(`${TEST_SERVICE_URL}/api/tests/generate`, JSON.stringify({
      subject: subject,
      topics: [getRandomElement(topics), getRandomElement(topics)],
      difficulty: Math.floor(Math.random() * 3) + 1,
      questionCount: 10,
      format: 'mixed',
    }), { headers });
    
    const duration = Date.now() - startTime;
    testGenerationTime.add(duration);
    requestCount.add(1);
    
    const success = check(generateRes, {
      'Test generation status is 200': (r) => r.status === 200,
      'Test generation time < 1s': (r) => duration < 1000,
      'Test has questions': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.questions && body.questions.length > 0;
        } catch (e) {
          return false;
        }
      },
    });
    
    errorRate.add(!success);
    
    // If test generated successfully, submit answers
    if (generateRes.status === 200) {
      try {
        const test = JSON.parse(generateRes.body);
        
        sleep(2); // Simulate time taking test
        
        const answers = test.questions.map(q => ({
          questionId: q.id,
          answer: Array.isArray(q.options) ? getRandomElement(q.options) : 'Sample answer',
        }));
        
        const submitRes = http.post(`${TEST_SERVICE_URL}/api/tests/${test.id}/submit`, JSON.stringify({
          answers: answers,
          startTime: new Date(Date.now() - 120000).toISOString(),
          endTime: new Date().toISOString(),
        }), { headers });
        
        requestCount.add(1);
        
        check(submitRes, {
          'Test submission status is 200': (r) => r.status === 200,
          'Test result has score': (r) => {
            try {
              const body = JSON.parse(r.body);
              return typeof body.score === 'number';
            } catch (e) {
              return false;
            }
          },
        });
      } catch (e) {
        console.error('Error in test submission:', e);
      }
    }
  });
}

function testLearningPlan(headers) {
  group('Learning Plan', () => {
    // Generate learning plan
    const startTime = Date.now();
    const generateRes = http.post(`${LEARNING_PLAN_SERVICE_URL}/api/learning-plans/generate`, JSON.stringify({
      subjects: [getRandomElement(subjects), getRandomElement(subjects)],
      examType: 'NMT',
      examDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      currentLevel: Math.floor(Math.random() * 3) + 1,
    }), { headers });
    
    const duration = Date.now() - startTime;
    learningPlanTime.add(duration);
    requestCount.add(1);
    
    const success = check(generateRes, {
      'Learning plan generation status is 200': (r) => r.status === 200,
      'Learning plan generation time < 5s': (r) => duration < 5000,
      'Learning plan has tasks': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.dailyTasks && body.dailyTasks.length > 0;
        } catch (e) {
          return false;
        }
      },
    });
    
    errorRate.add(!success);
    
    sleep(1);
    
    // Get learning plan
    const getRes = http.get(`${LEARNING_PLAN_SERVICE_URL}/api/learning-plans`, { headers });
    requestCount.add(1);
    
    check(getRes, {
      'Get learning plan status is 200': (r) => r.status === 200,
    });
  });
}

function testAnalytics(headers) {
  group('Analytics', () => {
    // Get progress
    const progressRes = http.get(
      `${ANALYTICS_SERVICE_URL}/api/analytics/progress?period=30d`,
      { headers }
    );
    requestCount.add(1);
    
    check(progressRes, {
      'Progress status is 200': (r) => r.status === 200,
      'Progress has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.overallScore !== undefined;
        } catch (e) {
          return false;
        }
      },
    });
    
    sleep(0.5);
    
    // Get heatmap
    const heatmapRes = http.get(`${ANALYTICS_SERVICE_URL}/api/analytics/heatmap`, { headers });
    requestCount.add(1);
    
    check(heatmapRes, {
      'Heatmap status is 200': (r) => r.status === 200,
    });
    
    sleep(0.5);
    
    // Get predictions
    const startTime = Date.now();
    const predictionRes = http.get(
      `${ANALYTICS_SERVICE_URL}/api/analytics/predictions?examType=NMT`,
      { headers }
    );
    const duration = Date.now() - startTime;
    analyticsUpdateTime.add(duration);
    requestCount.add(1);
    
    check(predictionRes, {
      'Prediction status is 200': (r) => r.status === 200,
      'Prediction time < 10s': (r) => duration < 10000,
    });
  });
}

function testMixedWorkflow(headers) {
  group('Mixed Workflow', () => {
    // Simulate a realistic user session
    
    // 1. Check learning plan
    http.get(`${LEARNING_PLAN_SERVICE_URL}/api/learning-plans`, { headers });
    requestCount.add(1);
    sleep(1);
    
    // 2. Ask AI question
    const aiStartTime = Date.now();
    const aiRes = http.post(`${AI_SERVICE_URL}/api/explanations`, JSON.stringify({
      topic: getRandomElement(topics),
      subject: getRandomElement(subjects),
      studentLevel: 2,
    }), { headers });
    aiResponseTime.add(Date.now() - aiStartTime);
    requestCount.add(1);
    sleep(2);
    
    // 3. Check analytics
    http.get(`${ANALYTICS_SERVICE_URL}/api/analytics/progress?period=7d`, { headers });
    requestCount.add(1);
    sleep(1);
    
    // 4. Take a quick test
    const testStartTime = Date.now();
    const testRes = http.post(`${TEST_SERVICE_URL}/api/tests/generate`, JSON.stringify({
      subject: getRandomElement(subjects),
      topics: [getRandomElement(topics)],
      difficulty: 2,
      questionCount: 5,
      format: 'multiple_choice',
    }), { headers });
    testGenerationTime.add(Date.now() - testStartTime);
    requestCount.add(1);
    
    check(aiRes, { 'AI request successful': (r) => r.status === 200 });
    check(testRes, { 'Test generation successful': (r) => r.status === 200 });
  });
}

// Teardown function
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Total requests: ${requestCount.value}`);
}
