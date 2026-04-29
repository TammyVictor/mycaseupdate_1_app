import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseKey = "YOUR_ANON_KEY";

const supabase = createClient(supabaseUrl, supabaseKey);

app.get("/", (req, res) => {
  res.send("Backend is live 🚀");
});

app.post("/ai", async (req, res) => {
  try {
    const { caseData } = req.body;

    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("case_number", caseData.case_number)
      .single();

    if (error || !data) {
      return res.json({ reply: "Case not found." });
    }

    const reply = `Your case (${data.case_number}) is currently ${data.status}.`;

    res.json({ reply });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(3000, () => console.log("Running"));
