import cron from "node-cron";
import fetchData from "../index.js";

cron.schedule("30 16 * * *", async () => {
  console.log(`Running fetchData at ${new Date().toLocaleString()}`);
  await fetchData();
});