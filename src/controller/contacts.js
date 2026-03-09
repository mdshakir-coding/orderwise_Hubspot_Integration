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

    for (const company of companies) {
      try {
        // upsert comany in hubspot

        let companyId = null;

        // search company in hubspot
        // create if not. exist else update

        const payload = companyPayload(company);

        logger.info(`Company Payload:\n${JSON.stringify(payload, null, 2)}`);

        // search company in hubspot
        const searchResult = await searchObjectByKey(
          "companies", // object
          "orderwiseid", // property
          company.id, // value
        );
        logger.info(`Search Result:\n${JSON.stringify(searchResult, null, 2)}`);
        // return;
        companyId = searchResult.id;

        // update company in hubspot
        if (searchResult) {
          const updatedCompany = await updateObject(
            "companies",
            searchResult.id, // <-- already the ID string
            payload, // <-- you need to send payload
          );
          logger.info(
            `Updated Company:\n${JSON.stringify(updatedCompany, null, 2)}`,
          );
          companyId = updatedCompany.id;

          // create company in hubspot

          const createdCompany = await createObject("companies", payload);
          logger.info(
            `Created Company:\n${JSON.stringify(createdCompany, null, 2)}`,
          );
        }
        let upsertContact = null;
        upsertContact = await processContacts(companies, companyId);
        logger.info(`Upsert Contact Result: ${upsertContact}`);
        // log upsert contact result
        return;
      } catch (error) {
        logger.error(
          `Error processing company ${company.id}: ${error.message}`,
        );
      }
    }

    logger.info("Orderwise Sync Completed Successfully");
  } catch (error) {
    logger.error("Orderwise sync failed:", error.message);
  }
}

async function processContacts(companies, hubspotCompanyId) {
  try {
    // 2. Fetch contacts
    const contacts = await getContacts(companies);
    logger.info(`Fetched ${contacts.length} contacts`);

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

            //     // ✅ SUCCESS: Move the call INSIDE this block.
            //     // Here, hubspotCompanyId is alive and defined.
            //     await syncEmailWithLogging({
            //       subject: `OrderWise Activity - Contact: ${contact.id}`,
            //       body: `Synced activity for ${contact.firstName || ""} ${contact.lastName || ""}. Email: ${contact.email || "N/A"}`,
            //       contactId: hubspotContactId,
            //       companyId: hubspotCompanyId,
            //       orderWiseId: String(contact.id),
            //     });
          } else {
            logger.warn(
              `Company ${contact.companyId} not found in HubSpot. Skipping association.`,
            );
          }
        }
        // 3. Association Logic
        if (hubspotContactId) {
          // const hubspotCompanyId = await searchObjectByKey(
          //   "companies",
          //   "orderwiseid",
          //   String(companyId),
          // );

          if (hubspotCompanyId) {
            let associationResult = (associationResult =
              await associateContactToCompany(
                hubspotCompanyId,
                hubspotContactId,
              ));
            logger.info(
              `Associated Contact ${hubspotContactId} with Company ${hubspotCompanyId}`,
            );

            // ✅ SUCCESS: Move the call INSIDE this block.
            const emailWithLogging = await syncEmailWithLogging({
              subject: `OrderWise Activity - Contact: ${contact.id}`,
              body: `Synced activity for ${contact.firstName || ""} ${contact.lastName || ""}. Email: ${contact.email || "N/A"}`,
              contactId: hubspotContactId,
              companyId: hubspotCompanyId,
              orderWiseId: String(contact.id),
            });
            logger.info(`Email sync result: ${emailWithLogging}`);
          } else {
          
            logger.warn(
              `Company ${contact.companyId} not found in HubSpot Skipping association.`,
          );
          }
        }
      } catch (error) {
        logger.error(
          `Error processing contact ${contact.id}: ${error.message}`,
        );
      }
    }
  } catch (error) {
    logger.error("Error fetching contacts:", error.message);
  }
}

export { syncContacts };
