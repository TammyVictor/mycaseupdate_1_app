import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is live 🚀");
});

app.post("/ai", (req, res) => {
  console.log("AI endpoint hit:", req.body);

  const { question, caseData } = req.body;

  let reply = "I couldn't understand your request.";

  if (question.toLowerCase().includes("status")) {
    reply = `Your case (${caseData.case_number}) is currently ${caseData.case_status}.`;
  }

  res.json({ reply });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
