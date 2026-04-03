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
      searchResult = await searchObjectByKey(
        objectType,
        "email",
        payload.properties.email,
        contactProperties
      );
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

    // fetch All Activities for the following company Id

    const activities = await fetchOrderwiseActivities(company.id);
    logger.info(`Activity Length: ${JSON.stringify(activities.length)}`);

    // Activity insert In Hubspot
    const lastSyncFromFile = getLastSync().toISOString().replace("Z", "");

    for (const activity of activities) {
      logger.info(
        `Processing orderwise activity at index : ${activities.indexOf(
          activity
        )} : Record ${JSON.stringify(activity, null, 2)}`
      );

      // This regex looks for 'email' with an optional hyphen after the 'e'
      const emailRegex = /e-?mail/i;

      const hasEmailInName = activity.name && emailRegex.test(activity.name);
      // Check if the 'name' field exists and includes the word "Email" and isAmendedDateTiméis greater than lastSyncTime
      // if (
      //   !hasEmailInName ||
      //   !isLastAmended(activity?.lastAmendedDateTime, lastSyncFromFile)
      // ) {
      // if (!isLastAmended(activity?.lastAmendedDateTime, lastSyncFromFile)) {
      //   const reason = !hasEmailInName
      //     ? "Missing 'Email' in name"
      //     : "Not amended since last sync";
      //   logger.info(
      //     `Skipping activity ${activity.id}: ${reason} (Name: '${activity.name}')`
      //   );
      //   continue;
      // }

      // fetch customer contact -> upsert contact in hubspot -> name -> from/to email field
      let hubspotContactId = null;

      //  call the get CRM Record By Id function
      const crmRecord = await getCRMRecordById(activity.assignedToUserId);

      if (!crmRecord) {
        logger.info(
          `CRM Record assignedToUserId->${activity.assignedToUserId} not found.`
        );
        continue;
      }

      let contact = null;

      if (crmRecord) {
        contact = await getOrwerwiseContactbyId(
          crmRecord.customerId,
          crmRecord.contactId
        );
      }

      if (contact) {
        logger.info(
          `Fetched contact: ${JSON.stringify(contact, null, 2)} ${
            contact.length
          } ${activity.customerContact} | ${company.id}`
        );

        const payload = mapContactsToHubspot(contact, company);
        logger.info(`Contact Payload:\n${JSON.stringify(payload, null, 2)}`);

        const orderwiseId = String(payload?.properties?.orderwiseid) || null;
        // --- USE THE NEW UPSERT FUNCTION ---
        hubspotContactId = await upsertContact(
          "contacts",
          "orderwiseid",
          orderwiseId,
          payload
        );
        if (hubspotContactId) {
          allContactsId.push(hubspotContactId);
        }
      }

      // fetch customerContact
      const customerContact = await getCRMRecordById(activity?.customerContact);

      // find to contact
      let toContact = null;

      if (customerContact) {
        toContact = await getOrwerwiseContactbyId(
          customerContact.customerId,
          customerContact.contactId
        );
      }

      logger.info(
        `Customer Contact Id ${
          activity?.customerContact
        }: Record ${JSON.stringify(
          customerContact
        )} | Contact Record: ${JSON.stringify(toContact)}`
      );

      // const customerContact2 = await getOrwerwiseContactbyId(
      //   company?.id,
      //   activity?.customerContact
      // );

      // call the get Customer By Id function
      const customerRecord = await getCustomerById(crmRecord?.customerId);

      logger.info(
        `CRM Record Contact : ${JSON.stringify(
          contact
        )}: Company Record${JSON.stringify(
          customerRecord
        )} |CRM Record | ${JSON.stringify(crmRecord)}`
      );

      // if (customerRecord) {
      //   // upsert company in hubspot
      //   const upsertedCompanyId = await upsertCompany(customerRecord);
      //   logger.info(`Upserted Company ID: ${upsertedCompanyId}`);
      // }

      const activityPayload = mapActivitiesToHubspot(
        activity,
        hubspotCompanyId,
        allContactsId, // 👈 Pass the array here
        hubspotContactId,
        toContact,
        contact
        // upsertedCompanyId
      );

      logger.info(
        `Mapped activity payload: ${JSON.stringify(activityPayload)}`
      );

      // call the email function with validation
      const emailResult = await createHubspotEmailIfValid(
        activity,
        activityPayload
      );
      logger.info(`Email creation result: ${JSON.stringify(emailResult)}`);

      // logger.info(
      //   `Customer Contact2 by ContactId and Customer Id: ${JSON.stringify(
      //     customerContact2,
      //     null,
      //     2
      //   )}`
      // );
      // return; // TODO: remove
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

/**
 * 
 * 27|orderwise-hubspot-integration  | 2026-03-31 02:15:45 pm | info | CRM Record 648: {
27|orderwise-hubspot-integration  |   "id": 61,
27|orderwise-hubspot-integration  |   "description": null,
27|orderwise-hubspot-integration  |   "trackId": 3,
27|orderwise-hubspot-integration  |   "milestoneId": 13,
27|orderwise-hubspot-integration  |   "customerId": 2450,
27|orderwise-hubspot-integration  |   "contactId": 648,
27|orderwise-hubspot-integration  |   "notes": "Telemarketing/marketing to customers",
27|orderwise-hubspot-integration  |   "assignedUserId": 15,
27|orderwise-hubspot-integration  |   "entryPointId": null,
27|orderwise-hubspot-integration  |   "sourceId": null,
27|orderwise-hubspot-integration  |   "complete": true,
27|orderwise-hubspot-integration  |   "expectedValue": 0,
27|orderwise-hubspot-integration  |   "expectedCloseDate": null,
27|orderwise-hubspot-integration  |   "closedDatetime": "2016-01-21T13:56:35.23",
27|orderwise-hubspot-integration  |   "closedByUserId": 15,
27|orderwise-hubspot-integration  |   "closeReasonId": 9,
27|orderwise-hubspot-integration  |   "closedComments": null,
27|orderwise-hubspot-integration  |   "inputByUserId": 15,
27|orderwise-hubspot-integration  |   "inputDateTime": "2015-11-05T08:40:00.523",
27|orderwise-hubspot-integration  |   "analysis": null
27|orderwise-hubspot-integration  | }
 */
