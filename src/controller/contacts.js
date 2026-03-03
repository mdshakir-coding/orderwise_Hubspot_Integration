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
  syncEmailWithLogging,
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
          payload,
        );

        // // 3. Association Logic
        // if (hubspotContactId && contact.companyId) {
        //   const hubspotCompanyId = await searchObjectByKey(
        //     "companies",
        //     "orderwiseid",
        //     String(contact.companyId),
        //   );

        //   if (hubspotCompanyId) {
        //     await associateContactToCompany(hubspotCompanyId, hubspotContactId);
        //     logger.info(
        //       `Associated Contact ${hubspotContactId} with Company ${hubspotCompanyId}`,
        //     );
        //   } else {
        //     logger.warn(
        //       `Company ${contact.companyId} not found in HubSpot. Skipping association.`,
        //     );
        //   }
        // }

        // // MOVE THE CALL HERE: Inside the block where hubspotCompanyId is alive
        // await syncEmailWithLogging({
        //   subject: `OrderWise Activity - Contact: ${contact.id}`,
        //   body: `Synced activity for ${contact.firstName || ""} ${contact.lastName || ""}. Email: ${contact.email || "N/A"}`,
        //   contactId: hubspotContactId,
        //   companyId: hubspotCompanyId, // Now it is defined!
        //   orderWiseId: String(contact.id),
        // });

        // logger.warn(
        //   `Company ${contact.companyId} not found in HubSpot. Skipping association.`,
        // );

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

            // ✅ SUCCESS: Move the call INSIDE this block.
            // Here, hubspotCompanyId is alive and defined.
            await syncEmailWithLogging({
              subject: `OrderWise Activity - Contact: ${contact.id}`,
              body: `Synced activity for ${contact.firstName || ""} ${contact.lastName || ""}. Email: ${contact.email || "N/A"}`,
              contactId: hubspotContactId,
              companyId: hubspotCompanyId, 
              orderWiseId: String(contact.id),
            });

          } else {
            logger.warn(
              `Company ${contact.companyId} not found in HubSpot. Skipping association.`,
            );
          }
        } 
        

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
