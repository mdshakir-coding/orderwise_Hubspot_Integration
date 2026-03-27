import dotenv from "dotenv";
dotenv.config();
import express from "express";
import app from "./utils/app.js";
import logger from "./config/logger.js";
import "./jobs/cron.job.js";

// logger.info("Loaded API Token:", process.env.HUBSPOT_ACCESS_TOKEN);
const PORT = process.env.PORT || 32100;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
