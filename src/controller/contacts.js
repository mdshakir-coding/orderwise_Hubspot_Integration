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
  upsertHubSpotObject,
  logEmailToHubSpot,
} from "../services/hubspot.service.js";

import {
  companyPayload,
  mapContactsToHubspot,
  extractValidEmail,
} from "../utils/helper.js";



async function syncContacts() {
  try {
    await login();
    logger.info("Orderwise login successful");
    
    // 1. Fetch companies
    const companies = await getCompanies();
    logger.info(`Fetched ${companies.length} companies`);

    // 2. Fetch contacts
    const contacts = await getContacts(companies);
    logger.info(`Contacts Count: ${contacts.length}`);

    for (const contact of contacts) {
      try {
        const payload = mapContactsToHubspot(contact);
        const orderwiseId = String(contact.id);

        // --- USE THE NEW UPSERT FUNCTION ---
        const hubspotContactId = await upsertHubSpotObject(
          "contacts",
          "orderwiseid",
          orderwiseId,
          payload
        );

        // 3. Association Logic
        if (hubspotContactId && contact.companyId) {
          const hubspotCompanyId = await searchObjectByKey(
            "companies",
            "orderwiseid",
            String(contact.companyId),
          );

          if (hubspotCompanyId) {
            await associateContactToCompany(hubspotCompanyId, hubspotContactId);
            logger.info(
              `Associated Contact ${hubspotContactId} with Company ${hubspotCompanyId}`,
            );
          } else {
            logger.warn(`Company ${contact.companyId} not found in HubSpot. Skipping association.`);
          }
        }
        // 4. Log email to HubSpot (if email exists)

       
        

        


      } catch (error) {
        logger.error(
          `Error processing contact ${contact.id}: ${error.message}`,
        );
      }
    }

    logger.info("Orderwise Sync Completed Successfully");
  } catch (error) {
    logger.error("Orderwise sync failed:", error.message);
  }
}

export { syncContacts };




