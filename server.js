import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.send("Backend is live 🚀");
});

app.listen(3000, () => console.log("Running"));
