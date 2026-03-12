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

async function syncContacts(companies) {
  try {
    for (const company of companies) {
      try {
        // upsert comany in hubspot
        const upsertCompanyId = await upsertCompany(company);

        const upsertContact = await processContacts(company, upsertCompanyId);
        return;
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
    logger.info(`Fetched ${contacts.length} contacts`);

    let associationArr = [];

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
