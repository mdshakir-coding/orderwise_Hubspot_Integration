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
import { createBulkCompanies } from "../services/hubspot.service.js";

import {
  companyPayload,
  mapContactsToHubspot,
  extractValidEmail,
} from "../utils/helper.js";

async function syncContacts(companies) {
  try {
    // await login();
    // logger.info("Orderwise login successful");

    // 1. Fetch companies
    // const companies = await getCompanies();
    // logger.info(`Fetched ${companies.length} companies`);
    // // logger.info(`Companies:\n${JSON.stringify(companies[999], null, 2)}`);
    // return;

    for (const company of companies) {
      try {
        // upsert comany in hubspot

        let companyId = null;

        const payload = companyPayload(company);

        logger.info(`Company Payload:\n${JSON.stringify(payload, null, 2)}`);

        // search company in

        const searchResult = await searchObjectByKey(
          "companies", // object
          "orderwiseid", // property
          company.id, // value
        );
        logger.info(`Search Result:\n${JSON.stringify(searchResult, null, 2)}`);
        companyId = searchResult.id;

        
        // update company in hubspot
        if (searchResult) {
          const updatedCompany = await updateObject(
            "companies",
            searchResult, // <-- already the ID string
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
        // return; // todo: remove this return after testing
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
        // Contact Payload Mapping
        const payload = mapContactsToHubspot(contact, companies[0]);
        const orderwiseId = String(contact.id);
        logger.info(`Contact Payload:\n${JSON.stringify(payload, null, 2)}`);

        // --- USE THE NEW UPSERT FUNCTION ---
        let hubspotContactId = null;
        hubspotContactId = await upsertHubSpotObject(
          "contacts",
          "orderwiseid",
          orderwiseId,
          payload,
        );

        // 3. Association Logic
        // if (hubspotContactId && contact.companyId) {
        //   const hubspotCompanyId = await searchObjectByKey(
        //     "companies",
        //     "orderwiseid",
        //     String(contact.companyId),
        //   );

        // if (hubspotCompanyId) {
        //   await associateContactToCompany(hubspotCompanyId, hubspotContactId);
        //   logger.info(
        //     `Associated Contact ${hubspotContactId} with Company ${hubspotCompanyId}`,
        //   );
        // } else {
        //   logger.warn(
        //     `Company ${contact.companyId} not found in HubSpot. Skipping association.`,
        //   );
        // }
        // }
        // Assocation logic Company and Contact
        if (hubspotCompanyId && hubspotContactId) {
          let associationResult = null;

          associationResult = await associateContactToCompany(
            hubspotCompanyId,
            hubspotContactId,
          );

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
          logger.info(
            `Email sync result: ${JSON.stringify(emailWithLogging, null, 2)}`,
          );
        } else {
          logger.warn(
            `Company ${contact.companyId} not found in HubSpot Skipping association.`,
          );
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
