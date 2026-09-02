import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });

  await page.goto('http://localhost:4200/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('=== PAGE TEXT ===');
  console.log(bodyText);

  const html = await page.evaluate(() => document.body.innerHTML);
  console.log('\n=== HTML (first 2000 chars) ===');
  console.log(html.substring(0, 2000));

  await page.screenshot({ path: 'screenshots/20-debug.png', fullPage: true });

  await browser.close();
}

main().catch(console.error);
