import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

app.use(cors());
app.use(express.json());

// ✅ OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Backend is live 🚀");
});

// ✅ AI route
app.post("/ai", async (req, res) => {
  try {
    console.log("AI endpoint hit:", req.body);

    const { question, caseData } = req.body;

    // Fallback if no question
    if (!question) {
      return res.json({ reply: "Please ask a question." });
    }

    // Build prompt
    const prompt = `
You are a helpful case assistant.

Case Number: ${caseData?.case_number || "Unknown"}
Status: ${caseData?.case_status || "Unknown"}

User question:
${question}

Give a clear, helpful answer.
`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "No response from AI.";

    res.json({ reply });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ reply: "Server error" });
  }
});

// ✅ IMPORTANT: Use Render port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Running on port " + PORT);
});
