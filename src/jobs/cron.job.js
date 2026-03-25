// import cron from "node-cron";
// import fetchData from "../index.js";

import logger from "./../config/logger.js";
import cron from "node-cron";
import { syncContacts } from "../controller/contacts.js";
import { updateLastSync } from "../utils/helper.js";

cron.schedule("30 16 * * *", async () => {
  console.log(`Running fetchData at ${new Date().toLocaleString()}`);
  await fetchData();
});

logger.info("Daily scheduler started at 4:30 PM");

cron.schedule("30 16 * * *", async () => {
  const date = new Date();
  try {
    logger.info("Daily scheduler started at 4:30 PM");

    await syncContacts();

    logger.info("✅ Cron finished");
  } catch (error) {
    logger.error("❌ Cron error:", error);
  } finally {
    updateLastSync(date); // Update the last sync timestamp after the cron job runs
  }
});

// cron.schedule("* * * * * *", async () => {
//   try {
//     logger.info("Scheduler started - every 1 second");

//     // await syncContacts();
//     logger.info("✅ Cron finished");
//   } catch (error) {
//     logger.error("❌ Cron error:", error);
//   }
// });
