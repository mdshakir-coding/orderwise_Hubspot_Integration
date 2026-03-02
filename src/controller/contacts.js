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

//     const contacts = await getContacts ();
//     logger.info(`Contacts Count: ${contacts.length}`);
//     logger.info(
//       `First 2 Contacts:\n${JSON.stringify(contacts.slice(0, 2), null, 2)}`,
//     );

// // return;
//     for (const contact of contacts) {
//       try {
//         const payload = mapContactsToHubspot(contact);

//         logger.info(`Contact Payload:\n${JSON.stringify(payload, null, 2)}`);
//         // search company in hubspot
//         const searchResult = await searchObjectByKey(
//           "contacts", // object
//           "orderwiseid", // property
//           contact.id, // value
//         );
//         logger.info(`Search Result:\n${JSON.stringify(searchResult, null, 2)}`);
//         // return;

//         // update contact in hubspot
//         if (searchResult) {
//           const updatedContact = await updateObject(
//             "contacts",
//             searchResult, // <-- already the ID string
//             payload // <-- you need to send payload
//           );
//           logger.info(
//             `Updated Contact:\n${JSON.stringify(updatedContact, null, 2)}`,
//           );
//           // return;
//           // create contact in hubspot
//           const createdContact = await createObject("contacts", payload);
//           logger.info(
//             `Created Contact:\n${JSON.stringify(createdContact, null, 2)}`,
//           );
//         }
//       } catch (error) {
//         logger.error(`Error processing contact: ${contact.id} - ${error.message}`);
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

    // 1. Fetch contacts
    const contacts = await getContacts(companies);
    logger.info(`Contacts Count: ${contacts.length}`);

    for (const contact of contacts) {
  try {
    const payload = mapContactsToHubspot(contact);
    const orderwiseId = String(contact.id);

    // 1. SEARCH: Check if contact exists
    const hubspotContactId = await searchObjectByKey(
      "contacts",
      "orderwiseid",
      orderwiseId
    );

    let finalContactId;

    if (hubspotContactId) {
      // 2a. UPDATE: It exists
      logger.info(`Updating contact: ${hubspotContactId}`);
      await updateObject("contacts", hubspotContactId, payload);
      finalContactId = hubspotContactId;
    } else {
      // 2b. CREATE: It doesn't exist
      logger.info(`Creating new contact for Orderwise ID: ${orderwiseId}`);
      const createdContact = await createObject("contacts", payload);
      
      // Fix: Only read ID if creation was successful
      if (createdContact && createdContact.id) {
        finalContactId = createdContact.id;
      } else {
        throw new Error("Contact creation failed, no ID returned.");
      }
    }

    // 3. ASSOCIATE: Link to company
    if (finalContactId && contact.companyId) {
      // Need the HubSpot ID for the company
      const hubspotCompanyId = await searchObjectByKey(
        "companies",
        "orderwiseid",
        String(contact.companyId)
      );

      if (hubspotCompanyId) {
        await associateContactToCompany(hubspotCompanyId, finalContactId);
        logger.info(`Associated Contact ${finalContactId} with Company ${hubspotCompanyId}`);
      } else {
        logger.warn(`Skipping association: Company ${contact.companyId} not found in HubSpot.`);
      }
    }
  } catch (error) {
    logger.error(`Error processing contact ${contact.id}: ${error.message}`);
  }
}


    

    logger.info("Orderwise Sync Completed Successfully");
  } catch (error) {
    logger.error("Orderwise sync failed:", error.message);
  }
}

export { syncContacts };
