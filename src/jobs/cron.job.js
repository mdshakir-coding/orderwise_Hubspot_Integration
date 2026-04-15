// import cron from "node-cron";
// import fetchData from "../index.js";

import logger from "./../config/logger.js";
import cron from "node-cron";
import { updateLastSync } from "../utils/helper.js";
import { getCompanies } from "../services/orderwise.service.js";

let isRunning = false; // Flag to prevent overlapping executions
const scheduler = "0 */5 * * *"; // Run every 5 hours at minute 0 (e.g., 12:00 AM, 8:00 AM, 4:00 PM)

logger.info(
  `Daily Scheduler Initialized.It will every 5 hours at minute 0, Scheduler : ${scheduler}`
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
