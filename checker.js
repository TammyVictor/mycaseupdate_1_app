import puppeteer from "puppeteer";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function checkCase() {
  console.log("🔍 Checking case (API mode)...");

  let browser;

  try {
    // 🔥 Launch browser safely for Render
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    console.log("✅ Browser launched");

    const page = await browser.newPage();

    // 👀 Log console messages from the page
    page.on("console", msg => console.log("PAGE LOG:", msg.text()));

    // 🔥 Network debug
    page.on("response", async (response) => {
      try {
        const url = response.url();

        if (url.includes("livewire") || url.includes("case")) {
          console.log("📡 API HIT:", url);
        }
      } catch {}
    });

    // 🔐 STEP 1: Go to login page
    console.log("➡️ Opening login page...");
    await page.goto("https://mycase.rscafrica.org/login", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    console.log("✅ Login page loaded");

    // 🔐 STEP 2: Fill login form
    await page.waitForSelector('input[name="email"]', { timeout: 15000 });
    await page.type('input[name="email"]', process.env.MYCASE_EMAIL);

    await page.waitForSelector('input[name="password"]', { timeout: 15000 });
    await page.type('input[name="password"]', process.env.MYCASE_PASSWORD);

    console.log("✅ Credentials entered");

    // 🔐 STEP 3: Submit
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
    ]);

    console.log("✅ Logged in");

    // 📄 STEP 4: Go to case page
    console.log("➡️ Opening case page...");
    await page.goto("https://mycase.rscafrica.org/case-information", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    console.log("✅ Case page loaded");

    // ⏳ Wait for dynamic content
    await page.waitForTimeout(10000);

    // 📊 Extract visible text (fallback)
    const content = await page.evaluate(() => document.body.innerText);

    console.log("📄 Page content length:", content.length);

    // 🧠 Basic status detection
    let status = "Unknown";

    if (content.includes("Under Review")) status = "Under Review";
    if (content.includes("Approved")) status = "Approved";

    console.log("🧠 Detected status:", status);

    // 📦 Get old data
    const { data: oldData } = await supabase
      .from("cases")
      .select("*")
      .eq("case_number", "SF-10267383")
      .single();

    const oldStatus = oldData?.status;

    if (status !== oldStatus) {
      console.log("🚨 STATUS CHANGED:", status);

      await supabase
        .from("cases")
        .update({ status })
        .eq("case_number", "SF-10267383");
    } else {
      console.log("✅ No change");
    }

  } catch (err) {
    console.error("❌ ERROR STEP:", err.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log("🧹 Browser closed");
    }
  }
}
