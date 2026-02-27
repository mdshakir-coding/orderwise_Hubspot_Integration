
import logger from "../config/logger.js";
import {
  login,
  getCompanies,
  getContacts,
  postCompaniesToHubspot,
  postContactsToHubspot
} from "../services/orderwise.service.js";

import {
  searchObjectByKey,
  createObject,
  updateObject,
  associateContactToCompany
} from "../services/hubspot.service.js";




async function syncOrderwise() {
  try {
    const asyncLogin = await login();
    logger.info(`Orderwise login successful: ${asyncLogin}`);
    
    const companies = await getCompanies();
    logger.info(`Fetched ${companies.length} companies from Orderwise`);
    const contacts = await getContacts();
    logger.info(`Fetched ${contacts.length} contacts from Orderwise`);
    const postCompanies = await postCompaniesToHubspot();
    logger.info(`Synced companies to HubSpot successfully: ${postCompanies}`);
    const postContacts = await postContactsToHubspot();
    logger.info(`Synced contacts to HubSpot successfully: ${postContacts}`);

  
    

  } catch (error) {
    logger.error("Orderwise sync failed:", error);
  }
}

export { syncOrderwise };