import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for cache testing
const cacheHitRate = new Rate('cache_hits');
const cacheMissRate = new Rate('cache_misses');
const cachedResponseTime = new Trend('cached_response_time');
const uncachedResponseTime = new Trend('uncached_response_time');
const cacheRequestCount = new Counter('cache_requests');

export const options = {
  scenarios: {
    // Scenario 1: Test cache warming
    cache_warming: {
      executor: 'constant-vus',
      vus: 50,
      duration: '1m',
      exec: 'cacheWarming',
    },
    // Scenario 2: Test cache hits
    cache_hits: {
      executor: 'constant-vus',
      vus: 200,
      duration: '2m',
      startTime: '1m',
      exec: 'cacheHitTesting',
    },
    // Scenario 3: Test cache under load
    cache_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '1m', target: 500 },
        { duration: '30s', target: 0 },
      ],
      startTime: '3m',
      exec: 'cacheLoadTesting',
    },
  },
  thresholds: {
    'cache_hits': ['rate>0.7'], // At least 70% cache hit rate
    'cached_response_time': ['p(95)<100'], // Cached responses should be very fast
    'uncached_response_time': ['p(95)<2000'],
  },
};

const AI_SERVICE_URL = __ENV.AI_SERVICE_URL || 'http://localhost:8000';
const TEST_SERVICE_URL = __ENV.TEST_SERVICE_URL || 'http://localhost:3003';
const AUTH_SERVICE_URL = __ENV.AUTH_SERVICE_URL || 'http://localhost:3001';

// Popular topics that should be cached
const popularTopics = [
  { subject: 'Mathematics', topic: 'Pythagorean Theorem', level: 2 },
  { subject: 'Mathematics', topic: 'Quadratic Equations', level: 2 },
  { subject: 'Physics', topic: 'Newton\'s First Law', level: 1 },
  { subject: 'Physics', topic: 'Kinetic Energy', level: 2 },
  { subject: 'Chemistry', topic: 'Periodic Table Basics', level: 1 },
  { subject: 'Biology', topic: 'Cell Structure', level: 1 },
  { subject: 'History', topic: 'World War II Overview', level: 2 },
  { subject: 'Mathematics', topic: 'Fractions', level: 1 },
  { subject: 'Physics', topic: 'Gravity', level: 1 },
  { subject: 'Chemistry', topic: 'Chemical Bonds', level: 2 },
];

// Unique topics that won't be cached
const uniqueTopics = [
  { subject: 'Mathematics', topic: `Advanced Calculus ${Date.now()}`, level: 3 },
  { subject: 'Physics', topic: `Quantum Mechanics ${Date.now()}`, level: 3 },
  { subject: 'Biology', topic: `Genetic Engineering ${Date.now()}`, level: 3 },
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

// Scenario 1: Cache Warming - Request popular topics to populate cache
export function cacheWarming(data) {
  if (!data.token) return;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };
  
  group('Cache Warming', () => {
    const topic = popularTopics[Math.floor(Math.random() * popularTopics.length)];
    
    const res = http.post(`${AI_SERVICE_URL}/api/explanations`, JSON.stringify({
      topic: topic.topic,
      subject: topic.subject,
      studentLevel: topic.level,
    }), { headers });
    
    cacheRequestCount.add(1);
    
    check(res, {
      'warming request successful': (r) => r.status === 200,
    });
  });
  
  sleep(0.5);
}

// Scenario 2: Cache Hit Testing - Repeatedly request popular topics
export function cacheHitTesting(data) {
  if (!data.token) return;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };
  
  group('Cache Hit Testing', () => {
    // Request popular topic (should hit cache)
    const topic = popularTopics[Math.floor(Math.random() * popularTopics.length)];
    
    const startTime = Date.now();
    const res = http.post(`${AI_SERVICE_URL}/api/explanations`, JSON.stringify({
      topic: topic.topic,
      subject: topic.subject,
      studentLevel: topic.level,
    }), { headers });
    const duration = Date.now() - startTime;
    
    cacheRequestCount.add(1);
    
    // Check for cache hit indicator
    const isCacheHit = res.headers['X-Cache-Hit'] === 'true' || 
                       res.headers['x-cache-hit'] === 'true' ||
                       duration < 200; // Very fast response indicates cache hit
    
    if (isCacheHit) {
      cacheHitRate.add(1);
      cacheMissRate.add(0);
      cachedResponseTime.add(duration);
    } else {
      cacheHitRate.add(0);
      cacheMissRate.add(1);
      uncachedResponseTime.add(duration);
    }
    
    check(res, {
      'cache hit request successful': (r) => r.status === 200,
      'response is fast (likely cached)': (r) => duration < 500,
    });
  });
  
  sleep(0.3);
}

// Scenario 3: Cache Load Testing - Mix of cached and uncached requests
export function cacheLoadTesting(data) {
  if (!data.token) return;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };
  
  group('Cache Load Testing', () => {
    // 80% popular topics (cached), 20% unique topics (uncached)
    const usePopular = Math.random() < 0.8;
    const topic = usePopular 
      ? popularTopics[Math.floor(Math.random() * popularTopics.length)]
      : { 
          subject: uniqueTopics[0].subject,
          topic: `Unique Topic ${Math.random()}`,
          level: 2
        };
    
    const startTime = Date.now();
    const res = http.post(`${AI_SERVICE_URL}/api/explanations`, JSON.stringify({
      topic: topic.topic,
      subject: topic.subject,
      studentLevel: topic.level,
    }), { headers });
    const duration = Date.now() - startTime;
    
    cacheRequestCount.add(1);
    
    const isCacheHit = res.headers['X-Cache-Hit'] === 'true' || 
                       res.headers['x-cache-hit'] === 'true' ||
                       (usePopular && duration < 200);
    
    if (isCacheHit) {
      cacheHitRate.add(1);
      cacheMissRate.add(0);
      cachedResponseTime.add(duration);
    } else {
      cacheHitRate.add(0);
      cacheMissRate.add(1);
      uncachedResponseTime.add(duration);
    }
    
    check(res, {
      'load test request successful': (r) => r.status === 200,
      'response time acceptable': (r) => duration < 3000,
    });
  });
  
  // Test cache for test templates
  group('Test Template Cache', () => {
    const startTime = Date.now();
    const res = http.post(`${TEST_SERVICE_URL}/api/tests/generate`, JSON.stringify({
      subject: 'Mathematics',
      topics: ['Algebra'],
      difficulty: 2,
      questionCount: 10,
      format: 'multiple_choice',
    }), { headers });
    const duration = Date.now() - startTime;
    
    cacheRequestCount.add(1);
    
    check(res, {
      'test generation successful': (r) => r.status === 200,
      'test generation time acceptable': (r) => duration < 1000,
    });
  });
  
  sleep(Math.random() * 2 + 0.5);
}

export function teardown(data) {
  console.log('Cache Effectiveness Test Completed');
  console.log(`Total cache requests: ${cacheRequestCount.value}`);
  console.log('Check metrics for cache hit rate and response times');
}
