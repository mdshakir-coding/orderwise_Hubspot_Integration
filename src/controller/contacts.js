import logger from "../config/logger.js";
import {
  login,
  getCompanies,
  getContacts,
  postCompaniesToHubspot,
  postContactsToHubspot,
  getContactsbyId,
  getOrwerwiseContactbyId,
} from "../services/orderwise.service.js";

import {
  searchObjectByKey,
  createObject,
  updateObject,
  associateContactToCompany,
  upsertHubSpotObject,
  // syncEmailWithLogging,
  searchContactInHubspot,
} from "../services/hubspot.service.js";
import { createContactCompanyAssociations } from "../services/hubspot.service.js";
import { fetchOrderwiseActivities } from "../services/orderwise.service.js";
import { mapActivitiesToHubspot } from "../utils/helper.js";
import { activityAssociations } from "../services/orderwise.service.js";
import { createHubspotEmailIfValid } from "../services/hubspot.service.js";
import { getCRMRecordById } from "../services/orderwise.service.js";
import { getCustomerById } from "../services/orderwise.service.js";

import {
  companyPayload,
  mapContactsToHubspot,
  extractValidEmail,
  isCompanySame,
  isRecordUpToDate,
  isLastAmended,
  getLastSync,
  getCompanyDifferences,
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
    logger.info(`Processing OrderWise ID: ${JSON.stringify(company, null, 2)}`);

    const payload = companyPayload(company);

    // IMPORTANT: Ensure "name" and other compared fields are in this list!
    const propertiesToFetch = [
      "orderwiseid",
      "domain",
      "phone",
      "address",
      "address2",
      "city",
      "zip",
      "state",
      "name",
    ];

    const searchResult = await searchObjectByKey(
      "companies",
      "orderwiseid",
      company.id,
      propertiesToFetch
    );

    if (searchResult) {
      const companyId = searchResult.id;

      logger.info(
        `Found existing company ${JSON.stringify(searchResult)}`,
        null,
        2
      );

      // Check for actual differences
      const diffs = getCompanyDifferences(searchResult, payload);
      const changedFields = Object.keys(diffs);

      logger.info(
        `Differences found for Company ${companyId}:`,
        JSON.stringify(diffs, null, 2)
      );

      if (changedFields.length === 0) {
        logger.info(
          `No changes detected for Company ${companyId}. Skipping update.`
        );
        return companyId;
      }

      // Log exactly what is changing
      logger.info(`Changes detected for Company ${companyId}:`);
      changedFields.forEach((field) => {
        logger.info(
          `  [${field}]: "${diffs[field].from}" -> "${diffs[field].to}"`
        );
      });

      const updatedCompany = await updateObject(
        "companies",
        companyId,
        payload
      );

      logger.info(`Successfully updated company ${updatedCompany.id}`);
      return updatedCompany.id;
    }

    // Create new company logic...
    const createdCompany = await createObject("companies", payload);
    logger.info(`Created New Company: ${createdCompany.id}`);
    return createdCompany.id;
  } catch (error) {
    logger.error("Error upserting company:", error.message);
  }
}

// This function is used to sync companies from Orderwise to HubSpot and then sync the associated contacts and activities for each company. It iterates through the list of companies, upserts each company in HubSpot, and then processes the contacts and activities related to that company. The function also includes error handling to log any issues that occur during the sync process.
async function ProcessCompanies(companies = []) {
  try {
    for (const company of companies) {
      try {
        // upsert comany in hubspot
        const upsertCompanyId = await upsertCompany(company);

        if (!upsertCompanyId) {
          logger.warn(`Failed to upsert company ${company.id}`);
        }

        logger.info(`Processed company in hubspot ${upsertCompanyId}`);

        const upsertContact = await processContacts(company, upsertCompanyId);
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

/**
 * 
 * @param {orderwiseid: c?.id || null,

      firstname: nameParts[0] || null,
      lastname: nameParts.slice(1).join(" ") || null,
      //  firstname: c?.name || null,
      // lastname: c?.name ||null,
      phone: c?.telephone || null,
      email: extractValidEmail(c?.email),
      company: c?.companyId || null,
      mobilephone: c?.mobile || null,
      fax: c?.fa} objectType 
 * @param {*} searchKey 
 * @param {*} searchValue 
 * @param {*} payload 
 * @returns 
 */

async function upsertContact(objectType, searchKey, searchValue, payload) {
  try {
    const contactProperties = [
      "orderwiseid",
      "firstname",
      "lastname",
      "phone",
      "mobilephone",
      "fax",
      "email",
      // "company",
    ];

    // 1. Search for existing record
    let searchResult = await searchObjectByKey(
      objectType,
      searchKey,
      searchValue,
      contactProperties
    );

    // 2. Fallback search (Email)
    if (
      !searchResult?.id &&
      objectType === "contacts" &&
      payload?.properties?.email
    ) {
      logger.info(
        `ID search failed for ${searchValue}, searching by email: ${payload.properties.email}`
      );
      searchResult = await searchContactInHubspot(
        objectType,
        "email",
        payload.properties.email,
        contactProperties
      );

      if (searchResult && searchResult.length > 1) {
        logger.warn(`Multiple contacts found for ${searchValue}. Skipping.`);
        return null;
      } else {
        searchResult = searchResult[0];
      }
    }

    // logger.info(`Search Result:\n${JSON.stringify(searchResult, null, 2)}`);

    const hubspotId = searchResult?.id;

    // 3. Idempotency Check
    if (hubspotId && isRecordUpToDate(payload, searchResult)) {
      logger.info(
        `Idempotency Match: ${objectType} ${hubspotId} is already up-to-date. Skipping.`
      );
      return hubspotId;
    }

    // 4. Update if exists
    if (hubspotId) {
      logger.info(`Updating existing ${objectType}: ${hubspotId}`);
      const updatedObject = await updateObject(objectType, hubspotId, payload);
      return updatedObject?.id || hubspotId;
    }

    // 5. Create if not found
    try {
      const createdObject = await createObject(objectType, payload);
      return createdObject?.id || null;
    } catch (createError) {
      if (createError.response?.status === 409) {
        logger.warn(
          `409 Conflict: Record exists but hidden from search (${searchValue})`
        );
        return null;
      }
      throw createError;
    }
  } catch (error) {
    logger.error(`Error upserting ${objectType}:`, error);
  }
}

// This function handles contacts and emails for the associated company
// Company is Orderwise Customer
async function processContacts(company, hubspotCompanyId) {
  try {
    // 2. Fetch contacts
    const contacts = await getContacts(company?.id);
    logger.info(`Contacts Fetched ${contacts.length} contacts`);

    let associationArr = [];
    let allContactsId = [];

    // Contact Upsert In Hubspot

    for (const contact of contacts) {
      try {
        logger.info(
          `Processing orderwise contact at index ${contacts.indexOf(
            contact
          )}: ${JSON.stringify(contact, null, 2)}`
        );

        let email = contact.email ? contact.email.trim().toLowerCase() : null;

        if (!email || !email.includes("@")) {
          logger.warn(
            `Skipping contact ${contact.id} due to missing or invalid email: ${email}`
          );
          continue;
        }
        // Contact Payload Mapping
        const payload = mapContactsToHubspot(contact, company);
        logger.info(`Contact Payload:\n${JSON.stringify(payload, null, 2)}`);
        const orderwiseId = String(payload?.properties?.orderwiseid) || null;

        // --- USE THE NEW UPSERT FUNCTION ---
        let hubspotContactId = null;
        hubspotContactId = await upsertContact(
          "contacts",
          "orderwiseid",
          orderwiseId,
          payload
        );

        if (hubspotContactId) {
          allContactsId.push(hubspotContactId);
        }

        // allContactsId.push(hubspotContactId );
        if (hubspotContactId && hubspotCompanyId) {
          associationArr.push({
            contactId: hubspotContactId,
            companyId: hubspotCompanyId,
          });
        }
      } catch (error) {
        logger.error(
          `Error processing contact ${contact.id}: ${error.message}`
        );
      }
    }

    // 🔹 Bulk association after loop
    if (associationArr.length > 0) {
      logger.info(
        `Bulk association started: ${JSON.stringify(associationArr, null, 2)}`
      );
      const result = await createContactCompanyAssociations(associationArr);

      logger.info(
        `Bulk association completed: ${JSON.stringify(result, null, 2)}`
      );
    } else {
      logger.warn("No associations to create.");
    }
  } catch (error) {
    logger.error("Error fetching contacts:", error);
  }
}

async function findActivity(companies = []) {
  try {
    for (const company of companies) {
      // fetch All Activities for the following company Id

      // find contact

      const contacts = await getContacts(company?.id);
      logger.info(`Contacts Fetched ${contacts.length} contacts`);

      for (const contact of contacts) {
        logger.info(
          `Contact: ${JSON.stringify(contact, null, 2)} | ${company.id}`
        );

        const activities = await fetchOrderwiseActivities(contact.id);
        logger.info(`Activity Length: ${JSON.stringify(activities.length)}`);

        for (const activity of activities) {
          if (activity.name === "RE: Order 58688") {
            logger.info(`Activity: ${JSON.stringify(activity, null, 2)}`);

            const crmRecord = await getCRMRecordById(activity.assignedToUserId);

            const contact = await getOrwerwiseContactbyId(
              crmRecord.customerId,
              crmRecord.contactId
            );
            // call the get Customer By Id function
            const customerRecord = await getCustomerById(crmRecord?.customerId);

            logger.info(
              `CRM Record Contact : ${JSON.stringify(
                contact,
                null,
                2
              )}: Company Record${JSON.stringify(
                customerRecord,
                null,
                2
              )} |CRM Record | ${JSON.stringify(crmRecord, null, 2)}`
            );
          } else {
            logger.debug(
              `Company Id ${contact.id} | Activity: ${JSON.stringify(
                activity,
                null,
                2
              )}`
            );
          }
        }
      }
    }
  } catch (error) {
    logger.error("Error fetching contacts:", error);
  }
}

export { ProcessCompanies, findActivity };
