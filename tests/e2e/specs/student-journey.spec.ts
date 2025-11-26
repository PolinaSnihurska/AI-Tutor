import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test: Student User Journey
 * Tests Requirements: 8.1, 8.2, 8.3, 1.1, 2.1, 3.1, 4.1
 * 
 * This test validates the complete student experience from registration to learning
 */

test.describe('Student User Journey', () => {
  let page: Page;
  const testEmail = `student-e2e-${Date.now()}@test.com`;
  const testPassword = 'SecurePass123!';

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should complete full student registration and onboarding', async () => {
    // Navigate to registration page
    await page.goto('/register');
    await expect(page).toHaveTitle(/Register|Sign Up/i);

    // Fill registration form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.selectOption('select[name="role"]', 'student');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'Student');
    await page.fill('input[name="age"]', '16');
    await page.selectOption('select[name="grade"]', '11');

    // Submit registration
    await page.click('button[type="submit"]');

    // Wait for redirect to onboarding or dashboard
    await page.waitForURL(/\/(onboarding|dashboard)/);
    
    // Verify successful registration
    await expect(page.locator('text=/Welcome|Dashboard/i')).toBeVisible();
  });

  test('should complete onboarding flow', async () => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Check if onboarding is needed
    const url = page.url();
    if (url.includes('/onboarding')) {
      // Step 1: Select subjects
      await page.click('text=Mathematics');
      await page.click('text=Physics');
      await page.click('text=Chemistry');
      await page.click('button:has-text("Next")');

      // Step 2: Set exam goal
      await page.selectOption('select[name="examType"]', 'NMT');
      await page.fill('input[name="examDate"]', '2024-06-01');
      await page.click('button:has-text("Next")');

      // Step 3: Choose subscription
      await page.click('text=/Free|Skip/i');
      await page.click('button:has-text("Complete")');

      // Should redirect to dashboard
      await page.waitForURL('/dashboard');
    }

    await expect(page).toHaveURL('/dashboard');
  });

  test('should navigate to AI chat and ask question', async () => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate to AI chat
    await page.click('a[href="/chat"]');
    await page.waitForURL('/chat');

    // Ask a question
    const question = 'Explain the Pythagorean theorem';
    await page.fill('textarea[placeholder*="Ask"]', question);
    await page.click('button[type="submit"]');

    // Wait for AI response (max 2 seconds per requirement)
    await expect(page.locator('.message.assistant')).toBeVisible({ timeout: 3000 });
    
    // Verify response contains relevant content
    const response = await page.locator('.message.assistant').first().textContent();
    expect(response).toBeTruthy();
    expect(response!.length).toBeGreaterThan(50);
  });

  test('should generate and take a test', async () => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate to test generation
    await page.click('a[href="/tests"]');
    await page.waitForURL('/tests');

    // Generate new test
    await page.click('button:has-text("Generate Test")');
    
    // Fill test generation form
    await page.selectOption('select[name="subject"]', 'Mathematics');
    await page.click('input[value="Algebra"]');
    await page.click('input[value="Geometry"]');
    await page.fill('input[name="questionCount"]', '5');
    await page.selectOption('select[name="difficulty"]', '5');
    await page.click('button:has-text("Generate")');

    // Wait for test to be generated (max 1 second per requirement)
    await expect(page.locator('.test-question')).toBeVisible({ timeout: 2000 });

    // Answer questions
    const questions = await page.locator('.test-question').count();
    expect(questions).toBe(5);

    for (let i = 0; i < questions; i++) {
      const question = page.locator('.test-question').nth(i);
      await question.locator('input[type="radio"]').first().click();
    }

    // Submit test
    await page.click('button:has-text("Submit Test")');
    
    // Confirm submission
    await page.click('button:has-text("Confirm")');

    // Wait for results page
    await page.waitForURL(/\/tests\/result/);

    // Verify results are displayed
    await expect(page.locator('text=/Score|Result/i')).toBeVisible();
    await expect(page.locator('text=/\\d+%/')).toBeVisible();
    await expect(page.locator('.detailed-results')).toBeVisible();
  });

  test('should view learning plan and complete task', async () => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate to learning plan
    await page.click('a[href="/learning-plan"]');
    await page.waitForURL('/learning-plan');

    // Verify learning plan is displayed
    await expect(page.locator('.daily-tasks')).toBeVisible();
    await expect(page.locator('.weekly-goals')).toBeVisible();

    // Complete a task
    const firstTask = page.locator('.task-item').first();
    await firstTask.click();

    // Mark as complete
    await page.click('button:has-text("Mark Complete")');

    // Verify task is marked as completed
    await expect(firstTask.locator('.status-completed')).toBeVisible();
  });

  test('should view analytics and progress', async () => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate to analytics
    await page.click('a[href="/analytics"]');
    await page.waitForURL('/analytics');

    // Verify analytics components are displayed
    await expect(page.locator('.performance-chart')).toBeVisible();
    await expect(page.locator('.heatmap')).toBeVisible();
    await expect(page.locator('.prediction-display')).toBeVisible();

    // Verify data updates within 10 seconds (requirement)
    await page.waitForTimeout(1000);
    await page.reload();
    await expect(page.locator('.performance-chart')).toBeVisible({ timeout: 11000 });
  });

  test('should access student cabinet', async () => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate to cabinet
    await page.click('a[href="/cabinet"]');
    await page.waitForURL('/cabinet');

    // Verify cabinet sections
    await expect(page.locator('text=/Lesson History/i')).toBeVisible();
    await expect(page.locator('text=/Saved Materials/i')).toBeVisible();
    await expect(page.locator('text=/Achievements/i')).toBeVisible();
  });

  test('should upgrade subscription', async () => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate to subscription page
    await page.click('a[href="/subscription"]');
    await page.waitForURL('/subscription');

    // View current plan
    await expect(page.locator('text=/Current Plan/i')).toBeVisible();
    await expect(page.locator('text=/Free/i')).toBeVisible();

    // Click upgrade button
    await page.click('button:has-text("Upgrade to Premium")');

    // Verify pricing page or checkout
    await expect(page.locator('text=/Premium|Checkout/i')).toBeVisible();
  });

  test('should handle responsive design on mobile', async ({ browser }) => {
    // Create mobile context
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    });
    const mobilePage = await mobileContext.newPage();

    // Login on mobile
    await mobilePage.goto('/login');
    await mobilePage.fill('input[name="email"]', testEmail);
    await mobilePage.fill('input[name="password"]', testPassword);
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL('/dashboard');

    // Verify mobile menu
    await expect(mobilePage.locator('.mobile-menu-button')).toBeVisible();
    await mobilePage.click('.mobile-menu-button');
    await expect(mobilePage.locator('.mobile-menu')).toBeVisible();

    // Navigate using mobile menu
    await mobilePage.click('.mobile-menu a[href="/chat"]');
    await mobilePage.waitForURL('/chat');
    await expect(mobilePage.locator('textarea')).toBeVisible();

    await mobileContext.close();
  });

  test('should handle errors gracefully', async () => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Try to access invalid route
    await page.goto('/invalid-route');
    await expect(page.locator('text=/404|Not Found/i')).toBeVisible();

    // Navigate back to dashboard
    await page.click('a[href="/dashboard"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should logout successfully', async () => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Logout
    await page.click('button:has-text("Logout")');

    // Verify redirected to login
    await page.waitForURL('/login');
    await expect(page.locator('input[name="email"]')).toBeVisible();

    // Verify cannot access protected routes
    await page.goto('/dashboard');
    await page.waitForURL('/login');
  });
});
