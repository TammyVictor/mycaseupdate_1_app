import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Initialize OpenAI
const openai = new OpenAI({
  apiKey: process
