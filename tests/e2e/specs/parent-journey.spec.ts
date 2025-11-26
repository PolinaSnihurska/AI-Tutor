import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test: Parent User Journey
 * Tests Requirements: 8.1, 8.2, 8.3, 5.1, 5.2, 5.3, 5.4, 5.5
 * 
 * This test validates the complete parent experience including child monitoring
 */

test.describe('Parent User Journey', () => {
  let page: Page;
  const parentEmail = `parent-e2e-${Date.now()}@test.com`;
  const childEmail = `child-e2e-${Date.now()}@test.com`;
  const testPassword = 'SecurePass123!';

  test.beforeAll(async ({ browser }) => {
    // Create child account first
    const childPage = await browser.newPage();
    await childPage.goto('/register');
    await childPage.fill('input[name="email"]', childEmail);
    await childPage.fill('input[name="password"]', testPassword);
    await childPage.fill('input[name="confirmPassword"]', testPassword);
    await childPage.selectOption('select[name="role"]', 'student');
    await childPage.fill('input[name="firstName"]', 'Child');
    await childPage.fill('input[name="lastName"]', 'Test');
    await childPage.fill('input[name="age"]', '14');
    await childPage.selectOption('select[name="grade"]', '9');
    await childPage.click('button[type="submit"]');
    await childPage.waitForURL(/\/(onboarding|dashboard)/);
    await childPage.close();
  });

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should complete parent registration', async () => {
    // Navigate to registration page
    await page.goto('/register');
    await expect(page).toHaveTitle(/Register|Sign Up/i);

    // Fill registration form
    await page.fill('input[name="email"]', parentEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.selectOption('select[name="role"]', 'parent');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'Parent');

    // Submit registration
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/\/(onboarding|dashboard)/);
    
    // Verify successful registration
    await expect(page.locator('text=/Welcome|Dashboard/i')).toBeVisible();
  });

  test('should link child account', async () => {
    // Login as parent
    await page.goto('/login');
    await page.fill('input[name="email"]', parentEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(onboarding|dashboard)/);

    // Navigate to parent settings or children management
    await page.click('a[href*="/parent"]');
    
    // Link child
    await page.click('button:has-text("Add Child")');
    await page.fill('input[name="childEmail"]', childEmail);
    await page.click('button:has-text("Link Child")');

    // Verify child is linked
    await expect(page.locator(`text=${childEmail}`)).toBeVisible();
  });

  test('should view parent dashboard with children overview', async () => {
    // Login as parent
    await page.goto('/login');
    await page.fill('input[name="email"]', parentEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);

    // Navigate to parent cabinet
    await page.click('a[href="/parent"]');
    await page.waitForURL(/\/parent/);

    // Verify parent dashboard components
    await expect(page.locator('.child-selector')).toBeVisible();
    await expect(page.locator('.child-overview-card')).toBeVisible();
    await expect(page.locator('.notification-center')).toBeVisible();
  });

  test('should view child analytics and progress', async () => {
    // Login as parent
    await page.goto('/login');
    await page.fill('input[name="email"]', parentEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);

    // Navigate to parent cabinet
    await page.click('a[href="/parent"]');
    await page.waitForURL(/\/parent/);

    // Select child
    await page.click('.child-selector');
    await page.click(`text=${childEmail}`);

    // View detailed analytics
    await page.click('a[href*="/progress"]');
    await page.waitForURL(/\/parent.*progress/);

    // Verify analytics components
    await expect(page.locator('.performance-chart')).toBeVisible();
    await expect(page.locator('.study-time-chart')).toBeVisible();
    await expect(page.locator('.subject-performance')).toBeVisible();
  });

  test('should view child study time reports', async () => {
    // Login as parent
    await page.goto('/login');
    await page.fill('input[name="email"]', parentEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);

    // Navigate to study time page
    await page.click('a[href="/parent"]');
    await page.click('a[href*="/study-time"]');
    await page.waitForURL(/\/parent.*study-time/);

    // Verify study time metrics
    await expect(page.locator('text=/Total Study Time/i')).toBeVisible();
    await expect(page.locator('text=/Daily Average/i')).toBeVisible();
    await expect(page.locator('text=/Weekly Trend/i')).toBeVisible();

    // Verify chart is displayed
    await expect(page.locator('.study-time-chart')).toBeVisible();
  });

  test('should view weak topics and recommendations', async () => {
    // Login as parent
    await page.goto('/login');
    await page.fill('input[name="email"]', parentEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);

    // Navigate to weak topics page
    await page.click('a[href="/parent"]');
    await page.click('a[href*="/weak-topics"]');
    await page.waitForURL(/\/parent.*weak-topics/);

    // Verify weak topics are displayed
    await expect(page.locator('text=/Weak Topics|Areas for Improvement/i')).toBeVisible();
    await expect(page.locator('.topic-list')).toBeVisible();

    // Verify recommendations
    await expect(page.locator('text=/Recommendations/i')).toBeVisible();
    await expect(page.locator('.recommendation-item')).toBeVisible();
  });

  test('should configure parental controls', async () => {
    // Login as parent
    await page.goto('/login');
    await page.fill('input[name="email"]', parentEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);

    // Navigate to parental controls
    await page.click('a[href="/parent"]');
    await page.click('a[href*="/controls"]');
    await page.waitForURL(/\/parent.*controls/);

    // Set learning time limits
    await page.fill('input[name="dailyTimeLimit"]', '120');
    await page.click('button:has-text("Save")');

    // Verify settings saved
    await expect(page.locator('text=/Settings saved|Success/i')).toBeVisible();

    // Configure content access
    await page.click('text=/Content Access/i');
    await page.check('input[name="allowAIChat"]');
    await page.check('input[name="allowTests"]');
    await page.click('button:has-text("Save")');

    await expect(page.locator('text=/Settings saved|Success/i')).toBeVisible();
  });

  test('should view child activity log', async () => {
    // Login as parent
    await page.goto('/login');
    await page.fill('input[name="email"]', parentEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);

    // Navigate to activity log
    await page.click('a[href="/parent"]');
    await page.click('a[href*="/activity"]');
    await page.waitForURL(/\/parent.*activity/);

    // Verify activity log is displayed
    await expect(page.locator('text=/Activity Log|Recent Activities/i')).toBeVisible();
    await expect(page.locator('.activity-item')).toBeVisible();

    // Filter by date
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-12-31');
    await page.click('button:has-text("Filter")');

    // Verify filtered results
    await expect(page.locator('.activity-item')).toBeVisible();
  });

  test('should receive notifications about child performance', async () => {
    // Login as parent
    await page.goto('/login');
    await page.fill('input[name="email"]', parentEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);

    // Navigate to parent cabinet
    await page.click('a[href="/parent"]');
    await page.waitForURL(/\/parent/);

    // Check notification center
    await page.click('.notification-center');
    
    // Verify notifications are displayed
    await expect(page.locator('.notification-item')).toBeVisible();

    // Configure notification preferences
    await page.click('button:has-text("Settings")');
    await page.check('input[name="emailNotifications"]');
    await page.check('input[name="weeklyReports"]');
    await page.check('input[name="performanceAlerts"]');
    await page.click('button:has-text("Save Preferences")');

    await expect(page.locator('text=/Preferences saved|Success/i')).toBeVisible();
  });

  test('should compare child performance to goals', async () => {
    // Login as parent
    await page.goto('/login');
    await page.fill('input[name="email"]', parentEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);

    // Navigate to progress page
    await page.click('a[href="/parent"]');
    await page.click('a[href*="/progress"]');
    await page.waitForURL(/\/parent.*progress/);

    // View goal comparison
    await expect(page.locator('text=/Goal Comparison|Progress vs Goals/i')).toBeVisible();
    await expect(page.locator('.goal-comparison-chart')).toBeVisible();

    // Verify metrics
    await expect(page.locator('text=/Target Score/i')).toBeVisible();
    await expect(page.locator('text=/Current Score/i')).toBeVisible();
    await expect(page.locator('text=/Gap/i')).toBeVisible();
  });

  test('should upgrade to family plan', async () => {
    // Login as parent
    await page.goto('/login');
    await page.fill('input[name="email"]', parentEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);

    // Navigate to subscription page
    await page.click('a[href="/subscription"]');
    await page.waitForURL(/subscription/);

    // View family plan
    await page.click('text=/Family Plan/i');
    
    // Verify family plan features
    await expect(page.locator('text=/Up to 3 children/i')).toBeVisible();
    await expect(page.locator('text=/Unlimited/i')).toBeVisible();

    // Click upgrade
    await page.click('button:has-text("Upgrade to Family")');

    // Verify checkout or pricing page
    await expect(page.locator('text=/Family|Checkout/i')).toBeVisible();
  });

  test('should prevent access to non-linked child data', async () => {
    // Login as parent
    await page.goto('/login');
    await page.fill('input[name="email"]', parentEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);

    // Try to access another child's data directly via URL
    await page.goto('/parent/children/non-existent-child-id/analytics');

    // Should show error or redirect
    await expect(page.locator('text=/Access Denied|Not Found|403/i')).toBeVisible();
  });

  test('should handle multiple children', async ({ browser }) => {
    // Create second child
    const child2Email = `child2-e2e-${Date.now()}@test.com`;
    const child2Page = await browser.newPage();
    await child2Page.goto('/register');
    await child2Page.fill('input[name="email"]', child2Email);
    await child2Page.fill('input[name="password"]', testPassword);
    await child2Page.fill('input[name="confirmPassword"]', testPassword);
    await child2Page.selectOption('select[name="role"]', 'student');
    await child2Page.fill('input[name="firstName"]', 'Child2');
    await child2Page.fill('input[name="lastName"]', 'Test');
    await child2Page.fill('input[name="age"]', '12');
    await child2Page.selectOption('select[name="grade"]', '7');
    await child2Page.click('button[type="submit"]');
    await child2Page.waitForURL(/\/(onboarding|dashboard)/);
    await child2Page.close();

    // Login as parent
    await page.goto('/login');
    await page.fill('input[name="email"]', parentEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);

    // Link second child
    await page.click('a[href="/parent"]');
    await page.click('button:has-text("Add Child")');
    await page.fill('input[name="childEmail"]', child2Email);
    await page.click('button:has-text("Link Child")');

    // Verify both children are listed
    await expect(page.locator(`text=${childEmail}`)).toBeVisible();
    await expect(page.locator(`text=${child2Email}`)).toBeVisible();

    // Switch between children
    await page.click('.child-selector');
    await page.click(`text=${child2Email}`);
    await expect(page.locator('.selected-child')).toContainText('Child2');

    await page.click('.child-selector');
    await page.click(`text=${childEmail}`);
    await expect(page.locator('.selected-child')).toContainText('Child');
  });

  test('should view aggregated analytics for all children', async () => {
    // Login as parent
    await page.goto('/login');
    await page.fill('input[name="email"]', parentEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);

    // Navigate to parent dashboard
    await page.click('a[href="/parent"]');
    await page.waitForURL(/\/parent/);

    // View all children overview
    await page.click('text=/All Children|Overview/i');

    // Verify aggregated metrics
    await expect(page.locator('text=/Total Study Time/i')).toBeVisible();
    await expect(page.locator('text=/Average Performance/i')).toBeVisible();
    await expect(page.locator('.child-overview-card')).toHaveCount(2); // Two children
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
    await mobilePage.fill('input[name="email"]', parentEmail);
    await mobilePage.fill('input[name="password"]', testPassword);
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL(/dashboard/);

    // Verify mobile menu
    await expect(mobilePage.locator('.mobile-menu-button')).toBeVisible();
    await mobilePage.click('.mobile-menu-button');
    await expect(mobilePage.locator('.mobile-menu')).toBeVisible();

    // Navigate to parent cabinet
    await mobilePage.click('.mobile-menu a[href="/parent"]');
    await mobilePage.waitForURL(/\/parent/);

    // Verify mobile-friendly layout
    await expect(mobilePage.locator('.child-selector')).toBeVisible();

    await mobileContext.close();
  });
});
