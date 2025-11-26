import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for AI service
const aiErrorRate = new Rate('ai_errors');
const aiResponseTime = new Trend('ai_response_time');
const aiCacheHitRate = new Rate('ai_cache_hits');
const aiRequestCount = new Counter('ai_requests');

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 300 },
    { duration: '1m', target: 500 },
    { duration: '30s', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'ai_response_time': ['p(95)<2000', 'p(99)<3000'], // Requirement 7.1
    'ai_errors': ['rate<0.01'], // Less than 1% error rate
    'http_req_failed': ['rate<0.01'],
  },
};

const AI_SERVICE_URL = __ENV.AI_SERVICE_URL || 'http://localhost:8000';
const AUTH_SERVICE_URL = __ENV.AUTH_SERVICE_URL || 'http://localhost:3001';

// Common topics for cache testing
const commonTopics = [
  { subject: 'Mathematics', topic: 'Pythagorean Theorem' },
  { subject: 'Mathematics', topic: 'Quadratic Equations' },
  { subject: 'Physics', topic: 'Newton\'s Laws' },
  { subject: 'Physics', topic: 'Energy Conservation' },
  { subject: 'Chemistry', topic: 'Periodic Table' },
];

const rarTopics = [
  { subject: 'Biology', topic: 'Mitochondrial DNA Replication' },
  { subject: 'History', topic: 'Byzantine Empire Trade Routes' },
  { subject: 'Mathematics', topic: 'Riemann Hypothesis' },
];

export function setup() {
  // Login to get auth token
  const loginRes = http.post(`${AUTH_SERVICE_URL}/api/auth/login`, JSON.stringify({
    email: 'student1@loadtest.com',
    password: 'Test123!@#',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    return { token: body.accessToken };
  }
  
  return { token: null };
}

export default function(data) {
  if (!data.token) {
    console.error('No authentication token available');
    return;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };
  
  // 70% common topics (should hit cache), 30% rare topics
  const topicData = Math.random() < 0.7 
    ? commonTopics[Math.floor(Math.random() * commonTopics.length)]
    : rarTopics[Math.floor(Math.random() * rarTopics.length)];
  
  group('AI Explanation Request', () => {
    const startTime = Date.now();
    
    const res = http.post(`${AI_SERVICE_URL}/api/explanations`, JSON.stringify({
      topic: topicData.topic,
      subject: topicData.subject,
      studentLevel: Math.floor(Math.random() * 3) + 1,
      context: 'Please explain this concept clearly',
    }), { headers });
    
    const duration = Date.now() - startTime;
    aiResponseTime.add(duration);
    aiRequestCount.add(1);
    
    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 2s': (r) => duration < 2000,
      'has content': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.content && body.content.length > 50;
        } catch (e) {
          return false;
        }
      },
      'has examples': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.examples && Array.isArray(body.examples);
        } catch (e) {
          return false;
        }
      },
    });
    
    // Check if response came from cache (custom header)
    if (res.headers['X-Cache-Hit']) {
      aiCacheHitRate.add(1);
    } else {
      aiCacheHitRate.add(0);
    }
    
    aiErrorRate.add(!success);
  });
  
  // Test different AI endpoints
  const endpoint = Math.random();
  
  if (endpoint < 0.3) {
    // Test generation
    group('AI Test Generation', () => {
      const startTime = Date.now();
      
      const res = http.post(`${AI_SERVICE_URL}/api/tests/generate`, JSON.stringify({
        subject: topicData.subject,
        topics: [topicData.topic],
        difficulty: 2,
        questionCount: 5,
        format: 'multiple_choice',
      }), { headers });
      
      const duration = Date.now() - startTime;
      aiRequestCount.add(1);
      
      check(res, {
        'test generation status is 200': (r) => r.status === 200,
        'test generation time reasonable': (r) => duration < 5000,
      });
    });
  } else if (endpoint < 0.5) {
    // Learning plan generation
    group('AI Learning Plan', () => {
      const startTime = Date.now();
      
      const res = http.post(`${AI_SERVICE_URL}/api/learning-plans/generate`, JSON.stringify({
        subjects: [topicData.subject],
        currentLevel: 2,
        examDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        knowledgeGaps: [topicData.topic],
      }), { headers });
      
      const duration = Date.now() - startTime;
      aiRequestCount.add(1);
      
      check(res, {
        'learning plan status is 200': (r) => r.status === 200,
        'learning plan time < 5s': (r) => duration < 5000,
      });
    });
  }
  
  sleep(Math.random() * 2 + 0.5);
}

export function teardown(data) {
  console.log('AI Service Load Test Completed');
  console.log(`Total AI requests: ${aiRequestCount.value}`);
}
