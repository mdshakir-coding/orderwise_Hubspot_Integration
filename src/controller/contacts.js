import logger from "../config/logger.js";
import {
  login,
  getCompanies,
  getContacts,
  postCompaniesToHubspot,
  postContactsToHubspot,
  getContactsbyId,
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

import {
  companyPayload,
  mapContactsToHubspot,
  extractValidEmail,
  isCompanySame,
  isRecordUpToDate,
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

async function syncContacts(
  companies = [
    {
      id: 3345,
      accountNumber: "IWIL010",
      statementName: "William Wilson CWO",
      statementAddress1: "90 Nutfield Road",
      statementAddress2: "Drumcru",
      statementAddress3: "Lisnaskea",
      statementTown: "ENNISKILLEN",
      statementPostcode: "BT92 0QT",
      statementCounty: "Co Fermanagh",
      statementCountry: "United Kingdom",
      statementEmail: null,
      statementWebsite: "078 17253902",
      statementTelephone: null,
      statementFax: null,
      statementCountryCode: "GB",
      invoiceName: null,
      invoiceAddress1: null,
      invoiceAddress2: null,
      invoiceAddress3: null,
      invoiceTown: null,
      invoicePostcode: null,
      invoiceCounty: null,
      invoiceCountry: null,
      invoiceEmail: null,
      invoiceWebsite: null,
      invoiceTelephone: null,
      invoiceFax: null,
      invoiceCountryCode: null,
      vatNumber: null,
      defaultTaxCodeId: 2,
      overrideVariantTax: false,
      nominalCodeId: 6,
      departmentCodeId: 6,
      costCentreId: 0,
      currencyId: 1,
      defaultDeliveryMethodId: 28,
      defaultDeliveryGroupId: null,
      usePriceList: null,
      priceListId: 861,
      priceListDiscountPercent: 0.0,
      multisaverDiscountGroupId: null,
      discountStructureId: null,
      defaultStockLocationId: 12,
      accountCustomer: true,
      onHold: false,
      manualOnHold: false,
      overCreditTerms: false,
      creditLimit: 800.0,
      openOrdersValue: 0.0,
      availableToSpend: 800.0,
      balance: 0.0,
    },
  ]
) {
  try {
    for (const company of companies) {
      try {
        // upsert comany in hubspot
        const upsertCompanyId = await upsertCompany(company);

        const upsertContact = await processContacts(company, upsertCompanyId);
        // return; // TODO : remove after testing
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

// ✅ Fetch Orderwise activities

// async function upsertContact(objectType, searchKey, searchValue, payload) {
//   try {
//     const contactProperties = [
//       "orderwiseid",
//       "name",
//       "phone",
//       "mobilephone",
//       "fax",
//       "email",
//       "address",
//       "address2",
//       "city",
//       "zip",
//       "state",
//       "country",
//       "company",
//     ];
//     // 1. Primary Search: Search by Orderwise ID
//     let hubspotId = null;
//     let searchResult = await searchObjectByKey(
//       objectType,
//       searchKey,
//       searchValue,
//       contactProperties
//     );
//     hubspotId = searchResult?.id;
//     // 2. Secondary Search: If ID search fails, search by Email (only for contacts)
//     if (!hubspotId && objectType === "contacts" && payload?.properties?.email) {
//       logger.info(
//         `ID search failed for ${searchValue}, searching by email: ${payload?.properties?.email}`
//       );
//       searchResult = await searchObjectByKey(
//         objectType,
//         "email",
//         payload?.properties?.email,
//         contactProperties
//       );
//       hubspotId = searchResult?.id;
//     }

//     logger.info(`Search Result:\n${JSON.stringify(searchResult, null, 2)}`);

//     // 3️⃣ Update if exists
//     if (hubspotId) {
//       logger.info(`Updating existing ${objectType}: ${hubspotId}`);

//       const updatedObject = await updateObject(objectType, hubspotId, payload);
//       logger.info(
//         `Updated ${objectType} successfully: ${JSON.stringify(
//           updatedObject,
//           null,
//           2
//         )}`
//       );

//       return updatedObject?.id || hubspotId;
//     }

//     // 4️⃣ Create if not found
//     try {
//       const createdObject = await createObject(objectType, payload);
//       return createdObject?.id || null;
//     } catch (createError) {
//       if (createError.response && createError.response.status === 409) {
//         logger.warn(
//           `409 Conflict: Record exists but hidden from search (${searchValue})`
//         );
//         return null;
//       }

//       throw createError;
//     }
//   } catch (error) {
//     logger.error("Error upserting contact:", error);
//   }
// }

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

    logger.info(`Search Result:\n${JSON.stringify(searchResult, null, 2)}`);

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

async function processContacts(company, hubspotCompanyId) {
  try {
    // 2. Fetch contacts
    const contacts = await getContacts(company?.id);
    logger.info(`Contacts Fetched ${contacts.length} contacts`);

    let associationArr = [];
    let allContactsId = [];

    for (const contact of contacts) {
      try {
        logger.info(
          `Processing orderwise contact ${JSON.stringify(contact, null, 2)}`
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

    const activities = await fetchOrderwiseActivities(company.id);
    // logger.info(`Fetched Activity: ${JSON.stringify(activities, null, 2)} ${activities.length}`);
    logger.info(`Activity Length: ${JSON.stringify(activities.length)}`);

    for (const activity of activities) {
      logger.info(
        `Processing orderwise activity ${JSON.stringify(activity, null, 2)}`
      );

      // This regex looks for 'email' with an optional hyphen after the 'e'
      const emailRegex = /e-?mail/i;

      const hasEmailInName = activity.name && emailRegex.test(activity.name);

      if (!hasEmailInName) {
        logger.info(
          `Skipping activity ${activity.id}: Name '${activity.name}' does not contain 'Email' or 'E-mail'`
        );
        continue;
      }

      // fetch customer contact -> upsert contact in hubspot -> name -> from/to email field

      const contact = await getContactsbyId(
        company.id,
        activity.customerContact
      );
      logger.info(
        `Fetched contact: ${JSON.stringify(contact, null, 2)} ${
          contact.length
        } ${activity.customerContact} | ${company.id}`
      );

      const payload = mapContactsToHubspot(contact[0], company);
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
      const activityPayload = mapActivitiesToHubspot(
        activity,
        hubspotCompanyId,
        allContactsId, // 👈 Pass the array here
        contact[0]
      );

      logger.info(
        `Mapped activity payload: ${JSON.stringify(activityPayload, null, 2)}`
      );

      // call the email function with validation
      const emailResult = await createHubspotEmailIfValid(
        activity,
        activityPayload
      );
      logger.info(
        `Email creation result: ${JSON.stringify(emailResult, null, 2)}`
      );

      // const result = await createObject("emails", activityPayload);
      // logger.info(
      //   `Created activity in HubSpot: ${JSON.stringify(result, null, 2)}`
      // );
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
    logger.error("Error fetching contacts:", error);
  }
}

export { syncContacts };
