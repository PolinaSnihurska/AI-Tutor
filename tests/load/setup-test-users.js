#!/usr/bin/env node

/**
 * Setup script to create test users for load testing
 */

const http = require('http');
const https = require('https');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

const testUsers = [
  { email: 'student1@loadtest.com', password: 'Test123!@#', role: 'student', firstName: 'Student', lastName: 'One' },
  { email: 'student2@loadtest.com', password: 'Test123!@#', role: 'student', firstName: 'Student', lastName: 'Two' },
  { email: 'parent1@loadtest.com', password: 'Test123!@#', role: 'parent', firstName: 'Parent', lastName: 'One' },
];

// Add database test users
for (let i = 0; i < 10; i++) {
  testUsers.push({
    email: `dbtest${i}@loadtest.com`,
    password: 'Test123!@#',
    role: 'student',
    firstName: 'DB',
    lastName: `Test${i}`,
  });
}

function makeRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: body,
          headers: res.headers,
        });
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function createUser(user) {
  try {
    console.log(`Creating user: ${user.email}...`);
    
    const registerData = {
      email: user.email,
      password: user.password,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      age: 16,
      grade: 10,
    };
    
    const response = await makeRequest(
      `${AUTH_SERVICE_URL}/api/auth/register`,
      'POST',
      registerData
    );
    
    if (response.status === 201 || response.status === 200) {
      console.log(`✓ Created user: ${user.email}`);
      return true;
    } else if (response.status === 409 || response.status === 400) {
      console.log(`⚠ User already exists: ${user.email}`);
      return true;
    } else {
      console.error(`✗ Failed to create user ${user.email}: ${response.status}`);
      console.error(response.body);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error creating user ${user.email}:`, error.message);
    return false;
  }
}

async function verifyUser(user) {
  try {
    const response = await makeRequest(
      `${AUTH_SERVICE_URL}/api/auth/login`,
      'POST',
      {
        email: user.email,
        password: user.password,
      }
    );
    
    if (response.status === 200) {
      console.log(`✓ Verified user: ${user.email}`);
      return true;
    } else {
      console.error(`✗ Failed to verify user ${user.email}: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error verifying user ${user.email}:`, error.message);
    return false;
  }
}

async function checkServiceHealth() {
  try {
    console.log('Checking auth service health...');
    const response = await makeRequest(`${AUTH_SERVICE_URL}/health`, 'GET');
    
    if (response.status === 200) {
      console.log('✓ Auth service is healthy');
      return true;
    } else {
      console.error(`✗ Auth service health check failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('✗ Auth service is not reachable:', error.message);
    console.error(`  Make sure the service is running at ${AUTH_SERVICE_URL}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Load Test User Setup');
  console.log('='.repeat(60));
  console.log(`Auth Service URL: ${AUTH_SERVICE_URL}`);
  console.log(`Creating ${testUsers.length} test users...`);
  console.log('='.repeat(60));
  console.log('');
  
  // Check service health
  const isHealthy = await checkServiceHealth();
  if (!isHealthy) {
    console.error('\nSetup failed: Auth service is not available');
    process.exit(1);
  }
  
  console.log('');
  
  // Create users
  let successCount = 0;
  let failCount = 0;
  
  for (const user of testUsers) {
    const success = await createUser(user);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('Verifying users...');
  console.log('='.repeat(60));
  console.log('');
  
  // Verify a few users
  const usersToVerify = testUsers.slice(0, 3);
  for (const user of usersToVerify) {
    await verifyUser(user);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('Setup Summary');
  console.log('='.repeat(60));
  console.log(`Total users: ${testUsers.length}`);
  console.log(`Successfully created/verified: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log('');
  
  if (failCount === 0) {
    console.log('✓ All test users are ready for load testing!');
    process.exit(0);
  } else {
    console.log('⚠ Some users failed to create. Load tests may have issues.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
