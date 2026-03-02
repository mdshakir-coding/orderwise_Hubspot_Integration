import dotenv from "dotenv";
dotenv.config();
import express from "express";
import app from "./utils/app.js";
import logger from "./config/logger.js";

// import {getLastId, setLastId } from "./utils/lastRun.js";
import { syncOrderwise } from "./controller/orderwise.controller.js";
import{ syncContacts } from "./controller/contacts.js";



// logger.info("Loaded API Token:", process.env.HUBSPOT_ACCESS_TOKEN);
const PORT = process.env.PORT || 32100;

app.listen(PORT, () => {

//    syncOrderwise();
syncContacts();


 
    logger.info(`Server running on port ${PORT}`);
});
