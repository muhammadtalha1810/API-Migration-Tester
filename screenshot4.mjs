import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    consoleErrors.push('PAGE ERROR: ' + err.message);
  });

  await page.goto('http://localhost:4200/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/20-config-form-with-methods.png', fullPage: true });

  // Check that HTTP method dropdowns exist
  const methodSelects = await page.locator('select').filter({ hasText: 'GET' }).count();
  console.log('HTTP method dropdowns found:', methodSelects);

  // Change legacy method to GET
  await page.locator('select').first().selectOption('GET');
  await page.waitForTimeout(300);

  // Fill URL with path param placeholder
  await page.locator('input[placeholder="https://localhost:5001/api/endpoint"]').fill('https://localhost:5001/api/users/{id}');
  await page.locator('input[placeholder="https://localhost:7001/api/endpoint"]').fill('https://localhost:7001/api/users/{id}');
  await page.waitForTimeout(300);

  // Add a path param for legacy API
  await page.getByText('+ Add Path Param').first().click();
  await page.waitForTimeout(300);
  await page.locator('input[placeholder="Param name (e.g. id)"]').first().fill('id');
  await page.locator('input[placeholder="Param value"]').first().fill('123');
  await page.waitForTimeout(300);

  // Add a query param for legacy API
  await page.getByText('+ Add Query Param').first().click();
  await page.waitForTimeout(300);
  const queryInputs = await page.locator('input[placeholder="Param name"]').all();
  await queryInputs[0].fill('include');
  const queryValueInputs = await page.locator('input[placeholder="Param value"]').all();
  await queryValueInputs[0].fill('details');
  await page.waitForTimeout(300);

  // Fill rules
  await page.locator('textarea').last().fill('Field id must be positive integer');
  await page.waitForTimeout(300);

  await page.screenshot({ path: 'screenshots/21-get-with-params.png', fullPage: true });

  // Verify the GET hint text is shown
  const getHintText = await page.locator('small:has-text("Body is not sent for GET/DELETE")').first().textContent();
  console.log('GET hint text:', getHintText);

  // Switch to POST to verify hint disappears
  await page.locator('select').first().selectOption('POST');
  await page.waitForTimeout(300);
  const postHintVisible = await page.locator('small:has-text("Body is not sent for GET/DELETE")').count();
  console.log('GET hint visible on POST:', postHintVisible > 0);

  // Verify Generate button is disabled for GET without payload (should be enabled since GET doesnt need payload)
  await page.locator('select').first().selectOption('GET');
  await page.waitForTimeout(300);
  const generateDisabled = await page.getByText('Generate & Run Tests').isDisabled();
  console.log('Generate disabled for GET without payload:', generateDisabled);

  // Check page text for path/query param sections
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('\n=== PAGE TEXT (first 500 chars) ===');
  console.log(bodyText.substring(0, 500));

  console.log('\n=== All screenshots taken ===');
  console.log('Console errors:', consoleErrors.length ? consoleErrors.join('\n') : 'None');

  await browser.close();
}

main().catch(console.error);
