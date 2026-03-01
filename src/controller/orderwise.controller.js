import logger from "../config/logger.js";
import {
  login,
  getCompanies,
  getContacts,
  postCompaniesToHubspot,
  postContactsToHubspot,
} from "../services/orderwise.service.js";

import {
  searchObjectByKey,
  createObject,
  updateObject,
  associateContactToCompany,
} from "../services/hubspot.service.js";

import {
  companyPayload,
  mapContactsToHubspot,
  extractValidEmail,
} from "../utils/helper.js";

async function syncOrderwise() {
  try {
    // call the function

    const asyncLogin = await login();
    logger.info(
      `Orderwise login successful: ${JSON.stringify(asyncLogin, null, 2)}`,
    );

    const companies = await getCompanies();
    logger.info(
      `First 2 Companies:\n${JSON.stringify(companies.length, null, 2)}`,
    );
    // build payload for company

    const payload = companyPayload(companies);

    logger.info(`Company Payload:\n${JSON.stringify(payload, null, 2)}`);


    const contacts = await getContacts(); 
   logger.info(
      `First 2 Contacts:\n${JSON.stringify(contacts.length, null, 2)}`,
    );

    // call the function// build payload for contacts
    const mappedContacts = mapContactsToHubspot(contacts);

    logger.info(
      `First 2 Mapped Contacts:\n${JSON.stringify(mappedContacts.slice(0, 2), null, 2)}`,
    );

    // Extract valid emails for logging
    const validEmails = mappedContacts.map((contact) => extractValidEmail(contact.properties.email));
    logger.info(`Extracted Valid Emails:\n${JSON.stringify(validEmails.slice(0, 2), null, 2)}`);
    
    const postCompanies = await postCompaniesToHubspot(
      searchObjectByKey,
      updateObject,
      createObject,
      payload,
    );
    logger.info(`Synced companies to HubSpot successfully: ${postCompanies}`);
    const postContacts = await postContactsToHubspot(
      searchObjectByKey,
      updateObject,
      createObject,
      associateContactToCompany,
    );
    logger.info(`Synced contacts to HubSpot successfully: ${postContacts}`);

    // call the function
  } catch (error) {
    logger.error("Orderwise sync failed:", error);
  }
}

export { syncOrderwise };
