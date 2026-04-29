import { chromium } from "playwright";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  console.log("🔍 Checking case...");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let extracted = {
    case_number: null,
    status: null,
    size: null
  };

  try {
    // LOGIN
    await page.goto("https://mycase.rscafrica.org/login", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="email"]');

    await page.fill('input[type="email"]', process.env.MYCASE_EMAIL);
    await page.fill('input[type="password"]', process.env.MYCASE_PASSWORD);

    await Promise.all([
      page.waitForNavigation(),
      page.click('button[type="submit"]')
    ]);

    console.log("✅ Logged in");

    // ACCEPT POPUP
    try {
      const buttons = await page.locator("button").all();
      for (const btn of buttons) {
        const text = await btn.innerText();
        if (text.toLowerCase().includes("accept")) {
          await btn.click();
          console.log("✅ Accepted notice");
          break;
        }
      }
    } catch {}

    await page.waitForTimeout(5000);

    // OPEN CASE PAGE
    await page.goto("https://mycase.rscafrica.org/case-information", {
      waitUntil: "networkidle"
    });

    await page.waitForTimeout(8000);

    // EXTRACT TEXT
    const text = await page.evaluate(() => document.body.innerText);

    console.log("📄 Raw Text:");
    console.log(text.substring(0, 500));

    // -------------------------
    // PARSE DATA
    // -------------------------

    const caseNumberMatch = text.match(/Case Number:\s*(SF-\d+)/);
    const statusMatch = text.match(/Case Status:\s*([A-Za-z ]+)/);
    const sizeMatch = text.match(/Case Size:\s*(\d+)/);

    extracted.case_number = caseNumberMatch?.[1] || null;
    extracted.status = statusMatch?.[1]?.trim() || null;
    extracted.size = sizeMatch?.[1] || null;

    console.log("🧠 Extracted:", extracted);

    // -------------------------
    // SAVE TO SUPABASE
    // -------------------------

    const response = await fetch(`${SUPABASE_URL}/rest/v1/cases?case_number=eq.${extracted.case_number}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: extracted.status,
        case_size: extracted.size,
        updated_at: new Date().toISOString()
      })
    });

    console.log("💾 Saved to Supabase:", response.status);

  } catch (err) {
    console.log("❌ ERROR:", err.message);
  }

  await browser.close();
}

run();
