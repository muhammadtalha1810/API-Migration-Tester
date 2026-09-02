import { chromium } from 'playwright';
import fs from 'fs';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    consoleErrors.push('PAGE ERROR: ' + err.message);
  });

  await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Create a completed session JSON to test results dashboard
  const completedSession = {
    schemaVersion: 1,
    id: 'test-session-001',
    createdAt: '2026-08-03T18:00:00.000Z',
    updatedAt: '2026-08-03T18:00:00.000Z',
    status: 'complete',
    progressPointer: 3,
    config: {
      legacyApi: {
        url: 'https://localhost:5001/api/test',
        bearerToken: '',
        payload: '{"name": "test"}',
        headers: [],
      },
      migratedApi: {
        url: 'https://localhost:7001/api/test',
        bearerToken: '',
        payload: '{"name": "test"}',
        headers: [],
      },
      rules: 'Field name max 50 chars',
      aiSettings: {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'sk-test',
      },
    },
    testCases: [
      {
        id: 'tc-1',
        payload: '{"name": "test"}',
        description: 'Normal payload',
        status: 'done',
        legacyResponse: { statusCode: 200, body: '{"name": "test"}', headers: {}, responseTime: 45 },
        migratedResponse: { statusCode: 200, body: '{"name": "test"}', headers: {}, responseTime: 32 },
        responsesDiffer: false,
        bugReport: null,
      },
      {
        id: 'tc-2',
        payload: '{"name": ""}',
        description: 'Empty name field',
        status: 'done',
        legacyResponse: { statusCode: 200, body: '{"error": "Name required"}', headers: {}, responseTime: 38 },
        migratedResponse: { statusCode: 400, body: '{"error": "Bad Request"}', headers: {}, responseTime: 25 },
        responsesDiffer: true,
        bugReport: {
          testCaseId: 'tc-2',
          title: 'Status code mismatch on empty name',
          description: 'Legacy API returns 200 with error body, migrated returns 400',
          workflow: 'Send empty name field, compare status codes',
          causes: 'Migrated API has stricter validation',
          helpfulInfo: 'Check model validation in .NET Core',
        },
      },
      {
        id: 'tc-3',
        payload: '{"name": "longstring"}',
        description: 'Name exceeding max length',
        status: 'done',
        legacyResponse: { statusCode: 200, body: '{"name": "longstring"}', headers: {}, responseTime: 50 },
        migratedResponse: { statusCode: 200, body: '{"name": "longstring"}', headers: {}, responseTime: 30 },
        responsesDiffer: false,
        bugReport: null,
      },
    ],
    bugs: [
      {
        testCaseId: 'tc-2',
        title: 'Status code mismatch on empty name',
        description: 'Legacy API returns 200 with error body, migrated returns 400',
        workflow: 'Send empty name field, compare status codes',
        causes: 'Migrated API has stricter validation',
        helpfulInfo: 'Check model validation in .NET Core',
      },
    ],
  };

  fs.writeFileSync('mock-session.json', JSON.stringify(completedSession, null, 2));

  // Import the completed session
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('mock-session.json');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/11-results-dashboard.png', fullPage: true });

  const dashboardVisible = await page.locator('app-results-dashboard').count();
  console.log('Results dashboard visible:', dashboardVisible > 0);

  // Click on a test case to see detail
  await page.locator('.tc-item').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/12-test-case-detail.png', fullPage: true });

  const detailVisible = await page.locator('app-test-case-detail').count();
  console.log('Test case detail visible:', detailVisible > 0);

  // Close detail by clicking the overlay
  await page.locator('.detail-overlay').click();
  await page.waitForTimeout(500);

  // Click on a bug to see detail
  const bugCard = page.locator('.bug-card').first();
  await bugCard.click({ timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/13-bug-detail.png', fullPage: true });

  // Click on the failed test case to see bug report in detail
  await page.locator('.detail-overlay').click();
  await page.waitForTimeout(500);
  await page.locator('.tc-item').nth(1).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/14-failed-tc-detail.png', fullPage: true });

  console.log('\n=== All screenshots taken ===');
  console.log('Console errors:', consoleErrors.length ? consoleErrors.join('\n') : 'None');

  // Cleanup
  fs.unlinkSync('mock-session.json');

  await browser.close();
}

main().catch(console.error);
