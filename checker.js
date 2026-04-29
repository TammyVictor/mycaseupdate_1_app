import puppeteer from "puppeteer";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function checkCase() {
  console.log("🔍 Checking case...");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  try {
    // 🔐 LOGIN
    await page.goto("https://mycase.rscafrica.org/login", {
      waitUntil: "networkidle2"
    });

    await page.type('input[name="email"]', process.env.MYCASE_EMAIL);
    await page.type('input[name="password"]', process.env.MYCASE_PASSWORD);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" })
    ]);

    // 📄 GO TO CASE PAGE
    await page.goto("https://mycase.rscafrica.org/case-information", {
      waitUntil: "networkidle2"
    });

    // ⏳ WAIT for dynamic content
    await page.waitForTimeout(5000);

    // 📊 EXTRACT TEXT FROM PAGE
    const content = await page.evaluate(() => {
      return document.body.innerText;
    });

    console.log("📄 Extracted content length:", content.length);

    // 🔎 FIND STATUS (basic example)
    let status = "Unknown";

    if (content.includes("Under Review")) status = "Under Review";
    if (content.includes("Approved")) status = "Approved";

    // 📦 GET LAST SAVED STATUS
    const { data } = await supabase
      .from("cases")
      .select("*")
      .eq("case_number", "SF-10267383")
      .single();

    const oldStatus = data?.status;

    // 🔁 COMPARE
    if (status !== oldStatus) {
      console.log("🚨 STATUS CHANGED:", status);

      await supabase
        .from("cases")
        .update({ status })
        .eq("case_number", "SF-10267383");

      // 🔔 SIMPLE ALERT (for now)
      console.log(`📢 NEW STATUS: ${status}`);
    } else {
      console.log("✅ No change");
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
  }

  await browser.close();
}
