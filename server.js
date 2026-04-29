import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ USE SERVICE ROLE KEY (NOT anon key)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 🔍 TEST ROUTE (to confirm backend is using correct key)
app.get("/", async (req, res) => {
  const { data, error } = await supabase.from("cases").select("*");

  if (error) {
    return res.json({
      status: "ERROR",
      message: error.message,
    });
  }

  return res.json({
    status: "SUCCESS",
    message: "Backend connected using SERVICE ROLE key",
    rows_found: data.length,
  });
});

// 🎯 MAIN API ROUTE
app.post("/ai", async (req, res) => {
  const case_number = req.body?.caseData?.case_number;

  if (!case_number) {
    return res.json({
      reply: "Please provide a case number.",
    });
  }

  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("case_number", case_number)
    .single();

  if (error || !data) {
    return res.json({
      reply: "Case not found.",
    });
  }

  return res.json({
    reply: `Your case (${data.case_number}) is currently ${data.status}.`,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
