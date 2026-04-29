import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function checkCase() {
  console.log("🔍 Checking case (Playwright mode)...");

  let browser;

  try {
    browser = await chromium.launch({
      headless: true
    });

    console.log("✅ Browser launched");

    const page = await browser.newPage();

    // 📡 Capture API responses
    let capturedData = [];

    page.on("response", async (response) => {
      try {
        const url = response.url();
        const contentType = response.headers()["content-type"] || "";

        if (
          (url.includes("livewire") ||
            url.includes("case") ||
            url.includes("api")) &&
          contentType.includes("application/json")
        ) {
          const data = await response.json();
          console.log("📡 API HIT:", url);
          capturedData.push(data);
        }
      } catch {}
    });

    // 🔐 LOGIN
    console.log("➡️ Opening login page...");
    await page.goto("https://mycase.rscafrica.org/login");

    await page.fill('input[name="email"]', process.env.MYCASE_EMAIL);
    await page.fill('input[name="password"]', process.env.MYCASE_PASSWORD);

    console.log("✅ Credentials entered");

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForLoadState("networkidle")
    ]);

    console.log("✅ Logged in");

    // 📄 CASE PAGE
    console.log("➡️ Opening case page...");
    await page.goto("https://mycase.rscafrica.org/case-information");

    await page.waitForTimeout(10000);

    console.log("📡 Responses captured:", capturedData.length);

    // 🧠 Extract
    let extracted = {
      status: "Unknown",
      documents: [],
      steps: []
    };

    for (const item of capturedData) {
      const text = JSON.stringify(item).toLowerCase();

      if (text.includes("under review")) extracted.status = "Under Review";
      if (text.includes("approved")) extracted.status = "Approved";

      if (text.includes("document")) {
        extracted.documents.push(text.slice(0, 200));
      }

      if (text.includes("step")) {
        extracted.steps.push(text.slice(0, 200));
      }
    }

    console.log("🧠 Extracted:", extracted);

    // 📦 Get old
    const { data: oldData } = await supabase
      .from("cases")
      .select("*")
      .eq("case_number", "SF-10267383")
      .single();

    const oldStatus = oldData?.status;

    if (extracted.status !== oldStatus) {
      console.log("🚨 STATUS CHANGED:", extracted.status);

      await supabase
        .from("cases")
        .update({
          status: extracted.status,
          raw_data: JSON.stringify(extracted)
        })
        .eq("case_number", "SF-10267383");
    } else {
      console.log("✅ No change");
    }

  } catch (err) {
    console.error("❌ ERROR:", err.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log("🧹 Browser closed");
    }
  }
}
