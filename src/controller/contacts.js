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
} from "../services/hubspot.service.js";

import {
  companyPayload,
  mapContactsToHubspot,
  extractValidEmail,
} from "../utils/helper.js";



// async function syncContacts() {
//   try {
//     await login();
//     logger.info("Orderwise login successful");
//     // 1. Fetch companies
//     const companies = await getCompanies();
//     logger.info(`Fetched ${companies.length} companies`);

//     // 1. Fetch contacts
//     const contacts = await getContacts(companies);
//     logger.info(`Contacts Count: ${contacts.length}`);

//     for (const contact of contacts) {
//       try {
//         const payload = mapContactsToHubspot(contact);
//         const orderwiseId = String(contact.id);

//         // 1. Search for existing contact in HubSpot
//         let hubspotContactId = await searchObjectByKey(
//           "contacts",
//           "orderwiseid",
//           orderwiseId,
//         );

//         // 2. Upsert Logic: If search fails, try to update anyway if 409 happens
//         if (hubspotContactId) {
//           logger.info(`Updating existing contact: ${hubspotContactId}`);
//           await updateObject("contacts", hubspotContactId, payload);
//         } else {
//           logger.info(`Attempting to create contact: ${orderwiseId}`);

//           try {
//             const createdContact = await createObject("contacts", payload);
//             hubspotContactId = createdContact.id;
//           } catch (createError) {
//             // --- DIRECT 409 HANDLING ---
//             if (createError.message && createError.message.includes("409")) {
//               logger.warn(
//                 `Conflict detected for ${orderwiseId}. Retrying search...`,
//               );

//               // Force a search again because the contact exists, just not found by ID
//               hubspotContactId = await searchObjectByKey(
//                 "contacts",
//                 "orderwiseid",
//                 orderwiseId,
//               );

//               if (hubspotContactId) {
//                 logger.info(
//                   `Found existing contact after conflict: ${hubspotContactId}`,
//                 );
//                 await updateObject("contacts", hubspotContactId, payload);
//               } else {
//                 throw new Error(
//                   "Conflict occurred but contact still not found.",
//                 );
//               }
//             } else {
//               throw createError; // Re-throw other errors
//             }
//           }
//         }

//         // 3. Association Logic
//         if (hubspotContactId && contact.companyId) {
//           const hubspotCompanyId = await searchObjectByKey(
//             "companies",
//             "orderwiseid",
//             String(contact.companyId),
//           );

//           if (hubspotCompanyId) {
//             await associateContactToCompany(hubspotCompanyId, hubspotContactId);
//             logger.info(
//               `Associated Contact ${hubspotContactId} with Company ${hubspotCompanyId}`,
//             );
//           }
//         }
//       } catch (error) {
//         logger.error(
//           `Error processing contact ${contact.id}: ${error.message}`,
//         );
//       }
//     }

//     logger.info("Orderwise Sync Completed Successfully");
//   } catch (error) {
//     logger.error("Orderwise sync failed:", error.message);
//   }
// }


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




