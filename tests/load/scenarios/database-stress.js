import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for database performance
const dbErrorRate = new Rate('db_errors');
const dbQueryTime = new Trend('db_query_time');
const dbWriteTime = new Trend('db_write_time');
const dbReadTime = new Trend('db_read_time');
const dbRequestCount = new Counter('db_requests');

export const options = {
  stages: [
    { duration: '1m', target: 200 },
    { duration: '2m', target: 500 },
    { duration: '2m', target: 800 },
    { duration: '2m', target: 800 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'db_query_time': ['p(95)<500', 'p(99)<1000'],
    'db_write_time': ['p(95)<1000'],
    'db_read_time': ['p(95)<300'],
    'db_errors': ['rate<0.01'],
  },
};

const AUTH_SERVICE_URL = __ENV.AUTH_SERVICE_URL || 'http://localhost:3001';
const TEST_SERVICE_URL = __ENV.TEST_SERVICE_URL || 'http://localhost:3003';
const ANALYTICS_SERVICE_URL = __ENV.ANALYTICS_SERVICE_URL || 'http://localhost:3005';
const LEARNING_PLAN_SERVICE_URL = __ENV.LEARNING_PLAN_SERVICE_URL || 'http://localhost:3004';

export function setup() {
  // Create multiple test users for concurrent database operations
  const tokens = [];
  
  for (let i = 0; i < 10; i++) {
    const email = `dbtest${i}@loadtest.com`;
    
    // Register
    http.post(`${AUTH_SERVICE_URL}/api/auth/register`, JSON.stringify({
      email: email,
      password: 'Test123!@#',
      role: 'student',
      firstName: 'DB',
      lastName: `Test${i}`,
      age: 16,
      grade: 10,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    // Login
    const loginRes = http.post(`${AUTH_SERVICE_URL}/api/auth/login`, JSON.stringify({
      email: email,
      password: 'Test123!@#',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (loginRes.status === 200) {
      const body = JSON.parse(loginRes.body);
      tokens.push(body.accessToken);
    }
  }
  
  return { tokens };
}

export default function(data) {
  if (!data.tokens || data.tokens.length === 0) {
    console.error('No authentication tokens available');
    return;
  }
  
  const token = data.tokens[Math.floor(Math.random() * data.tokens.length)];
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  
  // Simulate different database-intensive operations
  const operation = Math.random();
  
  if (operation < 0.25) {
    // Heavy read operations - Analytics queries
    testAnalyticsQueries(headers);
  } else if (operation < 0.5) {
    // Write operations - Test submissions
    testTestSubmissions(headers);
  } else if (operation < 0.75) {
    // Complex queries - Learning plan with joins
    testLearningPlanQueries(headers);
  } else {
    // Mixed operations
    testMixedDatabaseOperations(headers);
  }
  
  sleep(Math.random() * 2 + 0.5);
}

function testAnalyticsQueries(headers) {
  group('Analytics Database Queries', () => {
    // Query 1: Get progress (aggregation query)
    const startTime1 = Date.now();
    const progressRes = http.get(
      `${ANALYTICS_SERVICE_URL}/api/analytics/progress?period=90d`,
      { headers }
    );
    const duration1 = Date.now() - startTime1;
    dbReadTime.add(duration1);
    dbQueryTime.add(duration1);
    dbRequestCount.add(1);
    
    check(progressRes, {
      'progress query successful': (r) => r.status === 200,
      'progress query time acceptable': (r) => duration1 < 500,
    });
    
    sleep(0.2);
    
    // Query 2: Get heatmap (complex aggregation)
    const startTime2 = Date.now();
    const heatmapRes = http.get(
      `${ANALYTICS_SERVICE_URL}/api/analytics/heatmap`,
      { headers }
    );
    const duration2 = Date.now() - startTime2;
    dbReadTime.add(duration2);
    dbQueryTime.add(duration2);
    dbRequestCount.add(1);
    
    check(heatmapRes, {
      'heatmap query successful': (r) => r.status === 200,
      'heatmap query time acceptable': (r) => duration2 < 1000,
    });
    
    sleep(0.2);
    
    // Query 3: Get performance trends (time-series query)
    const startTime3 = Date.now();
    const trendsRes = http.get(
      `${ANALYTICS_SERVICE_URL}/api/analytics/trends?period=30d`,
      { headers }
    );
    const duration3 = Date.now() - startTime3;
    dbReadTime.add(duration3);
    dbQueryTime.add(duration3);
    dbRequestCount.add(1);
    
    check(trendsRes, {
      'trends query successful': (r) => r.status === 200,
    });
  });
}

function testTestSubmissions(headers) {
  group('Test Submission Database Writes', () => {
    // Generate a test first
    const generateRes = http.post(`${TEST_SERVICE_URL}/api/tests/generate`, JSON.stringify({
      subject: 'Mathematics',
      topics: ['Algebra'],
      difficulty: 2,
      questionCount: 10,
      format: 'multiple_choice',
    }), { headers });
    
    if (generateRes.status !== 200) {
      dbErrorRate.add(1);
      return;
    }
    
    const test = JSON.parse(generateRes.body);
    
    // Submit test results (database write)
    const answers = test.questions.map(q => ({
      questionId: q.id,
      answer: Array.isArray(q.options) ? q.options[0] : 'Answer',
    }));
    
    const startTime = Date.now();
    const submitRes = http.post(`${TEST_SERVICE_URL}/api/tests/${test.id}/submit`, JSON.stringify({
      answers: answers,
      startTime: new Date(Date.now() - 600000).toISOString(),
      endTime: new Date().toISOString(),
    }), { headers });
    const duration = Date.now() - startTime;
    
    dbWriteTime.add(duration);
    dbQueryTime.add(duration);
    dbRequestCount.add(1);
    
    const success = check(submitRes, {
      'test submission successful': (r) => r.status === 200,
      'test submission time acceptable': (r) => duration < 1000,
    });
    
    dbErrorRate.add(!success);
    
    sleep(0.5);
    
    // Read back test results (database read)
    const startTime2 = Date.now();
    const historyRes = http.get(`${TEST_SERVICE_URL}/api/tests/history`, { headers });
    const duration2 = Date.now() - startTime2;
    
    dbReadTime.add(duration2);
    dbQueryTime.add(duration2);
    dbRequestCount.add(1);
    
    check(historyRes, {
      'test history query successful': (r) => r.status === 200,
    });
  });
}

function testLearningPlanQueries(headers) {
  group('Learning Plan Database Operations', () => {
    // Create learning plan (complex write with multiple tables)
    const startTime1 = Date.now();
    const createRes = http.post(`${LEARNING_PLAN_SERVICE_URL}/api/learning-plans/generate`, JSON.stringify({
      subjects: ['Mathematics', 'Physics'],
      examType: 'NMT',
      examDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      currentLevel: 2,
    }), { headers });
    const duration1 = Date.now() - startTime1;
    
    dbWriteTime.add(duration1);
    dbQueryTime.add(duration1);
    dbRequestCount.add(1);
    
    check(createRes, {
      'learning plan creation successful': (r) => r.status === 200,
      'learning plan creation time acceptable': (r) => duration1 < 5000,
    });
    
    sleep(0.5);
    
    // Get learning plan (read with joins)
    const startTime2 = Date.now();
    const getRes = http.get(`${LEARNING_PLAN_SERVICE_URL}/api/learning-plans`, { headers });
    const duration2 = Date.now() - startTime2;
    
    dbReadTime.add(duration2);
    dbQueryTime.add(duration2);
    dbRequestCount.add(1);
    
    check(getRes, {
      'learning plan query successful': (r) => r.status === 200,
      'learning plan query time acceptable': (r) => duration2 < 500,
    });
    
    if (getRes.status === 200) {
      const plan = JSON.parse(getRes.body);
      
      if (plan.id) {
        sleep(0.3);
        
        // Update task completion (write operation)
        const startTime3 = Date.now();
        const updateRes = http.patch(
          `${LEARNING_PLAN_SERVICE_URL}/api/learning-plans/${plan.id}/tasks/1`,
          JSON.stringify({ completed: true }),
          { headers }
        );
        const duration3 = Date.now() - startTime3;
        
        dbWriteTime.add(duration3);
        dbQueryTime.add(duration3);
        dbRequestCount.add(1);
        
        check(updateRes, {
          'task update successful': (r) => r.status === 200,
        });
      }
    }
  });
}

function testMixedDatabaseOperations(headers) {
  group('Mixed Database Operations', () => {
    // Simulate a realistic user session with multiple database operations
    
    // 1. Read user profile
    const startTime1 = Date.now();
    const profileRes = http.get(`${AUTH_SERVICE_URL}/api/users/profile`, { headers });
    dbReadTime.add(Date.now() - startTime1);
    dbRequestCount.add(1);
    
    sleep(0.2);
    
    // 2. Read analytics
    const startTime2 = Date.now();
    const analyticsRes = http.get(
      `${ANALYTICS_SERVICE_URL}/api/analytics/progress?period=7d`,
      { headers }
    );
    dbReadTime.add(Date.now() - startTime2);
    dbRequestCount.add(1);
    
    sleep(0.2);
    
    // 3. Read learning plan
    const startTime3 = Date.now();
    const planRes = http.get(`${LEARNING_PLAN_SERVICE_URL}/api/learning-plans`, { headers });
    dbReadTime.add(Date.now() - startTime3);
    dbRequestCount.add(1);
    
    sleep(0.2);
    
    // 4. Read test history
    const startTime4 = Date.now();
    const historyRes = http.get(`${TEST_SERVICE_URL}/api/tests/history`, { headers });
    dbReadTime.add(Date.now() - startTime4);
    dbRequestCount.add(1);
    
    const allSuccess = check(profileRes, { 'profile ok': (r) => r.status === 200 }) &&
                       check(analyticsRes, { 'analytics ok': (r) => r.status === 200 }) &&
                       check(planRes, { 'plan ok': (r) => r.status === 200 }) &&
                       check(historyRes, { 'history ok': (r) => r.status === 200 });
    
    dbErrorRate.add(!allSuccess);
  });
}

export function teardown(data) {
  console.log('Database Stress Test Completed');
  console.log(`Total database requests: ${dbRequestCount.value}`);
}
