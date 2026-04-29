import { chromium } from 'playwright';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MYCASE_EMAIL = process.env.MYCASE_EMAIL;
const MYCASE_PASSWORD = process.env.MYCASE_PASSWORD;

async function run() {
  console.log("🔍 Checking case (Playwright mode)...");

  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  let capturedData = null;

  // ✅ LISTEN TO ALL NETWORK RESPONSES
  page.on('response', async (response) => {
    const url = response.url();

    // 🔥 THIS IS THE KEY FIX
    if (url.includes('/livewire/message') || url.includes('/api')) {
      try {
        const text = await response.text();

        if (text && text.length > 50) {
          console.log("📡 API response captured");

          capturedData = text;
        }
      } catch (err) {
        console.log("⚠️ Error reading response");
      }
    }
  });

  try {
    console.log("🌐 Opening login page...");
    await page.goto('https://mycase.rscafrica.org/login', { waitUntil: 'domcontentloaded' });

    console.log("🔑 Logging in...");
    await page.fill('input[type="email"]', MYCASE_EMAIL);
    await page.fill('input[type="password"]', MYCASE_PASSWORD);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation()
    ]);

    console.log("✅ Logged in");

    // ⏳ IMPORTANT: give time for background API calls
    await page.waitForTimeout(15000);

    if (!capturedData) {
      console.log("⚠️ No API data captured");
    } else {
      console.log("✅ Data captured, saving...");

      await fetch(`${SUPABASE_URL}/rest/v1/cases`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw_data: capturedData,
          updated_at: new Date().toISOString()
        })
      });

      console.log("💾 Saved to Supabase");
    }

  } catch (err) {
    console.error("❌ ERROR STEP:", err.message);
  }

  await browser.close();
}

run();
