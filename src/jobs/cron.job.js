// import cron from "node-cron";
// import fetchData from "../index.js";

import logger from "./../config/logger.js";
import cron from "node-cron";
import { updateLastSync } from "../utils/helper.js";
import { getCompanies } from "../services/orderwise.service.js";

let isRunning = false; // Flag to prevent overlapping executions
const scheduler = "30 11 * * *"; // Run at 4:30 PM

logger.info(
  `Daily Scheduler Initialized.It will run everyday at 4 : 30 PM or Cron : ${scheduler}`
);

cron.schedule(
  scheduler,
  async () => {
    const date = new Date();
    try {
      if (isRunning) {
        logger.info("Cron job is already running. Skipping execution.");
        return;
      }
      isRunning = true;
      logger.info(`Cron started at ${new Date().toISOString()}`);

      await getCompanies();

      logger.info("✅ Cron finished");
    } catch (error) {
      logger.error("❌ Cron error:", error);
    } finally {
      updateLastSync(date); // Update the last sync timestamp after the cron job runs
      isRunning = false;
    }
  },
  {
    timezone: "UTC",
  }
);
