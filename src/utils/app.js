import express from "express";

import { getCompanies } from "../services/orderwise.service.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is Healthy");
});
app.get("/health", (req, res) => {
  res.send("Server is Healthy");
});

app.post("/start-sync", (req, res) => {
  try {
    res.send("Sync Started Manually");
    getCompanies();
  } catch (error) {
    console.error("Error starting sync:", error);
  }
});

export default app;
