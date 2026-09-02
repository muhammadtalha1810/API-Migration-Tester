import { chromium } from 'playwright';

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
  await page.screenshot({ path: 'screenshots/01-initial.png', fullPage: true });

  // Test 1: Click Generate without AI key - should show error
  await page.locator('input[placeholder="https://localhost:5001/api/endpoint"]').fill('https://localhost:5001/api/test');
  await page.locator('input[placeholder="https://localhost:7001/api/endpoint"]').fill('https://localhost:7001/api/test');
  await page.locator('textarea').first().fill('{"name": "test", "age": 25}');
  await page.locator('textarea').last().fill('Field age must be 18-65');
  await page.waitForTimeout(500);
  await page.getByText('Generate & Run Tests').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/05-error-no-key.png', fullPage: true });
  const errorText = await page.locator('.error-banner').textContent().catch(() => 'no error banner');
  console.log('Error banner text:', errorText);

  // Test 2: Open settings, select Azure provider
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.waitForTimeout(500);
  await page.locator('select').selectOption('azure');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/06-azure-settings.png', fullPage: true });
  const azureFields = await page.locator('input[placeholder="https://your-resource.openai.azure.com"]').count();
  console.log('Azure endpoint field visible:', azureFields > 0);

  // Test 3: Switch back to OpenAI, fill key, save
  await page.locator('select').selectOption('openai');
  await page.waitForTimeout(300);
  await page.locator('input[placeholder="Enter your API key"]').fill('sk-test-key-1234');
  await page.getByRole('button', { name: 'Save Settings' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/07-after-save.png', fullPage: true });

  // Test 4: Check if warning banner is gone
  const warningVisible = await page.locator('.warning-banner').count();
  console.log('Warning banner visible after save:', warningVisible > 0);

  // Test 5: Open settings again to verify key persistence
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/08-settings-reopened.png', fullPage: true });
  const keyValue = await page.locator('input[placeholder="Enter your API key"]').inputValue();
  console.log('API key persisted:', keyValue === 'sk-test-key-1234');

  // Test 6: Clear key
  await page.getByRole('button', { name: 'Clear Saved Key' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'screenshots/09-key-cleared.png', fullPage: true });
  const keyValueAfterClear = await page.locator('input[placeholder="Enter your API key"]').inputValue();
  console.log('API key after clear:', keyValueAfterClear);

  // Close settings
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.waitForTimeout(300);

  // Test 7: Check top bar - Export button should not be visible without session
  const exportBtn = await page.getByText('Export').count();
  console.log('Export button visible without session:', exportBtn > 0);

  // Test 8: Check New Session button should not be visible without session
  const newSessionBtn = await page.getByText('New Session').count();
  console.log('New Session button visible without session:', newSessionBtn > 0);

  console.log('\n=== All screenshots taken ===');
  console.log('Console errors:', consoleErrors.length ? consoleErrors.join('\n') : 'None');

  await browser.close();
}

main().catch(console.error);
