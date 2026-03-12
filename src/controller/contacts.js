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
import { createContactCompanyAssociations } from "../services/hubspot.service.js";

import {
  companyPayload,
  mapContactsToHubspot,
  extractValidEmail,
  isCompanySame,
} from "../utils/helper.js";

/**
 * 
 * @param {orderwiseid: item?.id || null,
      name: item?.statementName || null,
      phone: item?.statementTelephone || null,
      domain,
      address: item?.statementAddress1 || null,
      address2: item?.statementAddress2 || null,
      city: item?.statementTown || null,
      country: item?.statementCounty || null,
      state: item?.statementCountryCode || null,
      zip: item?.statementPostcode || null,} company 
 * @returns 
 */
async function upsertCompany(company) {
  try {
    logger.info(
      `Processing orderwise company ${JSON.stringify(company, null, 2)}`
    );

    const payload = companyPayload(company);

    const properties = [
      "orderwiseid",
      "domain",
      "address",
      "address2",
      "city",
      "zip",
      "state",
      "country",
      "phone",
    ];

    const searchResult = await searchObjectByKey(
      "companies",
      "orderwiseid",
      company.id,
      properties
    );

    if (searchResult) {
      const companyId = searchResult.id;

      // ⭐ Compare before updating
      const same = isCompanySame(searchResult, payload);

      if (same) {
        logger.info(`Company already up-to-date: ${companyId}`);
        return companyId; // 🚀 RETURN WITHOUT UPDATE
      }

      logger.info("Company changed → updating");

      const updatedCompany = await updateObject(
        "companies",
        companyId,
        payload
      );

      return updatedCompany.id;
    }

    // create new company
    const createdCompany = await createObject("companies", payload);

    logger.info(`Created Company: ${createdCompany.id}`);

    return createdCompany.id;
  } catch (error) {
    logger.error("Error upserting company:", error.message);
  }
}

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

        const upsertCompanyId = await upsertCompany(company);

        return upsertCompanyId;

        // search company in

        // const searchResult = await searchObjectByKey(
        //   "companies", // object
        //   "orderwiseid", // property
        //   company.id // value
        // );
        // logger.info(`Search Result:\n${JSON.stringify(searchResult, null, 2)}`);
        // companyId = searchResult.id;

        // // update company in hubspot
        // if (searchResult) {
        //   const updatedCompany = await updateObject(
        //     "companies",
        //     searchResult, // <-- already the ID string
        //     payload // <-- you need to send payload
        //   );
        //   logger.info(
        //     `Updated Company:\n${JSON.stringify(updatedCompany, null, 2)}`
        //   );
        //   companyId = updatedCompany.id;
        // } else {
        //   // create company in hubspot
        //   const createdCompany = await createObject("companies", payload);

        //   logger.info(
        //     `Created Company:\n${JSON.stringify(createdCompany, null, 2)}`
        //   );
        //   companyId = createdCompany.id;
        // }
        let upsertContact = null;
        upsertContact = await processContacts(company, upsertCompanyId);
      } catch (error) {
        logger.error(
          `Error processing company ${company.id}: ${error.message}`
        );
      }
    }

    logger.info("Orderwise Sync Completed Successfully");
  } catch (error) {
    logger.error("Orderwise sync failed:", error.message);
  }
}

async function processContacts(company, hubspotCompanyId) {
  try {
    // 2. Fetch contacts
    const contacts = await getContacts(company?.id);
    logger.info(`Fetched ${contacts.length} contacts`);

    let associationArr = [];

    for (const contact of contacts) {
      try {
        logger.info(`Processing contact ${JSON.stringify(contact, null, 2)}`);
        // Contact Payload Mapping
        const payload = mapContactsToHubspot(contact, companies);
        logger.info(`Contact Payload:\n${JSON.stringify(payload, null, 2)}`);

        const orderwiseId = String(payload?.properties?.orderwiseid) || null;
        // --- USE THE NEW UPSERT FUNCTION ---
        let hubspotContactId = null;
        hubspotContactId = await upsertHubSpotObject(
          "contacts",
          "orderwiseid",
          orderwiseId,
          payload
        );

        // allContactsId.push(hubspotContactId );
        if (hubspotContactId && hubspotCompanyId) {
          associationArr.push({
            contactId: hubspotContactId,
            companyId: hubspotCompanyId,
          });
        }

        // Assocation logic Company and Contact
        // if (hubspotCompanyId && hubspotContactId) {
        //   let associationResult = null;

        //   associationResult = await associateContactToCompany(
        //     hubspotCompanyId,
        //     hubspotContactId,
        //   );

        //   logger.info(
        //     `Associated Contact ${hubspotContactId} with Company ${hubspotCompanyId}`,
        //   );

        // // ✅ SUCCESS: Move the call INSIDE this block.
        const emailWithLogging = await syncEmailWithLogging({
          subject: `OrderWise Activity - Contact: ${orderwiseId}`,
          body: `Synced activity for ${contact.firstName || ""} ${
            contact.lastName || ""
          }. Email: ${contact.email || "N/A"}`,
          contactId: hubspotContactId,
          companyId: hubspotCompanyId,
        });
        logger.info(
          `Email sync result: ${JSON.stringify(emailWithLogging, null, 2)}`
        );
        // } else {
        //   logger.warn(
        //     `Company ${contact.companyId} not found in HubSpot Skipping association.`,
        //   );
        // }
      } catch (error) {
        logger.error(
          `Error processing contact ${contact.id}: ${error.message}`
        );
      }
    }

    // 🔹 Bulk association after loop
    if (associationArr.length > 0) {
      const result = await createContactCompanyAssociations(associationArr);

      logger.info(
        `Bulk association completed: ${JSON.stringify(result, null, 2)}`
      );
    } else {
      logger.warn("No associations to create.");
    }
  } catch (error) {
    logger.error("Error fetching contacts:", error.message);
  }
}

export { syncContacts };
