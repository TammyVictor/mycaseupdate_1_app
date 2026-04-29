import { chromium } from "playwright";

async function run() {
  console.log("🔍 Checking case (Playwright mode)...");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let apiData = [];

  // -------------------------
  // CAPTURE API RESPONSES
  // -------------------------
  page.on("response", async (response) => {
    try {
      const url = response.url();

      if (
        url.includes("api") ||
        url.includes("case") ||
        url.includes("livewire")
      ) {
        const text = await response.text();

        if (text && text.length > 50) {
          apiData.push({ url, body: text });
        }
      }
    } catch {}
  });

  try {
    // -------------------------
    // LOGIN
    // -------------------------
    console.log("🌐 Opening login page...");
    await page.goto("https://mycase.rscafrica.org/login", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('input[type="email"]', { timeout: 60000 });

    console.log("🔑 Logging in...");
    await page.fill('input[type="email"]', process.env.MYCASE_EMAIL);
    await page.fill('input[type="password"]', process.env.MYCASE_PASSWORD);

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle" }),
      page.click('button[type="submit"]'),
    ]);

    console.log("✅ Logged in");

    // -------------------------
    // HANDLE NOTICE POPUP
    // -------------------------
    try {
      console.log("🧾 Checking for notice popup...");

      const buttons = await page.locator("button").all();

      for (const btn of buttons) {
        const text = await btn.innerText();

        if (text.toLowerCase().includes("accept")) {
          console.log("✅ Clicking Accept...");
          await btn.click();
          break;
        }
      }

      await page.waitForTimeout(5000);
    } catch {
      console.log("ℹ️ No notice popup found");
    }

    // -------------------------
    // OPEN CASE PAGE
    // -------------------------
    console.log("📂 Opening case page...");
    await page.goto("https://mycase.rscafrica.org/case-information", {
      waitUntil: "networkidle",
    });

    await page.waitForTimeout(10000);

    // -------------------------
    // API DATA
    // -------------------------
    if (apiData.length > 0) {
      console.log(`📡 API DATA FOUND: ${apiData.length}`);

      apiData.slice(0, 3).forEach((entry, i) => {
        console.log(`\n--- API RESPONSE ${i + 1} ---`);
        console.log("URL:", entry.url);
        console.log(entry.body.substring(0, 1000));
      });
    } else {
      console.log("⚠ No API data captured");
    }

    // -------------------------
    // PAGE TEXT
    // -------------------------
    console.log("\n📄 Extracting visible text...");
    const text = await page.evaluate(() => document.body.innerText);

    if (text && text.trim().length > 0) {
      console.log("📄 PAGE TEXT FOUND:");
      console.log(text.substring(0, 1500));
    } else {
      console.log("⚠ No visible text");
    }

    // -------------------------
    // HTML DATA (for hidden Livewire)
    // -------------------------
    console.log("\n🧠 Extracting HTML...");
    const html = await page.content();

    if (html && html.length > 1000) {
      console.log("📦 RAW HTML DATA FOUND:");
      console.log(html.substring(0, 2000));
    } else {
      console.log("⚠ No useful HTML detected");
    }

  } catch (err) {
    console.log("❌ ERROR:", err.message);
  }

  await browser.close();
}

run();
