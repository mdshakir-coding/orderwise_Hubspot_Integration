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


async function syncOrderwise() {
  try {
    await login();
    logger.info("Orderwise login successful");

    const companies = await getCompanies();
    logger.info(`Companies Count: ${companies.length}`);
    logger.info(
      `First 2 Companies:\n${JSON.stringify(companies.slice(0, 2), null, 2)}`,
    );


    for (const company of companies) {
      try {
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

    
        // update company in hubspot
        if (searchResult) {
          const updatedCompany = await updateObject(
            "companies",
            searchResult, // <-- already the ID string
            payload // <-- you need to send payload
          );
          logger.info(
            `Updated Company:\n${JSON.stringify(updatedCompany, null, 2)}`,
          );
          // return;
          // create company in hubspot
          const createdCompany = await createObject("companies", payload);
          logger.info(
            `Created Company:\n${JSON.stringify(createdCompany, null, 2)}`,
          );
        }
      } catch (error) {
        logger.error(`Error processing company: ${company.id} - ${error.message}`);
      }
    }


    

    logger.info("Orderwise Sync Completed Successfully");
  } catch (error) {
    logger.error("Orderwise sync failed:", error.message);
  }
}

export { syncOrderwise };
