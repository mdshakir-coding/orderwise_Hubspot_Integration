import { getLastId, setLastId } from "../utils/lastRun.js";
// import fetch from "node-fetch"; // if using Node.js
import logger from "../config/logger.js";
import { syncContacts } from "../controller/contacts.js";

let token = null;
let companies = [];
let contacts = [];

/** Login to Orderwise and get token */
async function login() {
  try {
    const response = await fetch(
      "http://sslvpn.caretrade.co/OWAPI/token/gettoken",
      {
        method: "GET",
        headers: { Authorization: "Basic QVBJOmFwaQ==" },
      }
    );

    if (!response.ok) throw new Error("Login failed: " + response.status);

    const tk = await response.text(); // Orderwise returns raw string
    token = tk.replace(/"/g, "");
    logger.info(`Orderwise token: ${token.slice(0, 10)}`);
    return token;
  } catch (error) {
    logger.error("Login Error:", error);
    return null;
  }
}

// fetch companies

async function getCompanies(retry = true) {
  // orderwised login
  // logger.info("Orderwise login successful");
  try {
    await login();

    let allCustomers = [];
    let lastId = 0;
    // let lastId = getLastId() || 0;

    let hasMore = true;

    while (hasMore) {
      const url = `http://sslvpn.caretrade.co/OWAPI/customers?limit=1000&last_id=${lastId}`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (retry) {
          logger.info("Refreshing token and retrying...");
          await login();
          return getCompanies(false);
        }
        throw new Error(`Failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) break;

      allCustomers.push(...data);
      // return allCustomers; //todo remove after testing

      try {
        await syncContacts(data);
        return; //todo remove after testing
      } catch (error) {
        logger.error("Error syncing contacts:", error.message);
      }

      // Process the records here (e.g., save to DB) before updating lastId

      lastId = data[data.length - 1].id;
      // setLastId(lastId); // Save lastId after each successful fetch

      logger.info(
        `Fetched batch. Total: ${JSON.stringify(allCustomers.length)}`
      );
      // logger.info(`Fetched batch. Total: ${JSON.stringify(data[data.length - 1], null, 2)}`);
    }

    return allCustomers || [];
  } catch (error) {
    logger.error("Error fetching Orderwise customers:", error.message);
    return [];
  }
}

// fetch contacts
logger.info(`Contacts Count: ${contacts.length}`);
async function getContacts(companies) {
  try {
    if (!token) await login();
    if (!companies || companies.length === 0) return [];

    let allContacts = [];

    for (const company of companies) {
      // 1. lastId must be reset to 0 for every NEW company
      let lastId = 0;
      let hasMore = true;

      while (hasMore) {
        // 2. Add last_id to the URL query parameters
        const url = `http://sslvpn.caretrade.co/OWAPI/customers/${company.id}/customer-contacts?limit=1000&last_id=${lastId}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          logger.warn(`Failed contacts for company ${company.id}`);
          break; // Move to next company
        }

        const data = await response.json();

        if (!data || data.length === 0) break;

        allContacts.push(
          ...data.map((contact) => ({
            ...contact,
            companyId: company.id,
          }))
        );
        return allContacts; //todo remove after testing
        // 3. Update lastId to the ID of the last contact in the current batch
        lastId = data[data.length - 1].id;

        logger.info(
          `Fetched batch of ${data.length} for company ${company.id}`
        );

        // 4. If we got fewer than 1000, no more pages exist
        if (data.length < 1000) hasMore = false;
      }
    }
    return allContacts;
  } catch (error) {
    logger.error("Error fetching contacts:", error.message);
    return [];
  }
}

/** Post companies to HubSpot */
async function postCompaniesToHubspot(
  searchObjectByKey,
  updateObjectByKey,
  createHubSpotObject
) {
  for (const company of companies) {
    try {
      const id = await searchObjectByKey(
        "orderwiseid",
        company.properties.orderwiseid,
        "companies"
      );
      if (id) {
        await updateObjectByKey(id, company, "companies");
      } else {
        await createHubSpotObject(company, "companies");
      }
    } catch (err) {
      logger.error(err);
    }
  }
}

/** Post contacts to HubSpot */
async function postContactsToHubspot(
  searchObjectByKey,
  updateObjectByKey,
  createHubSpotObject,
  associateContactToCompany
) {
  for (const contact of contacts) {
    try {
      const orderwiseid = contact.properties.orderwiseid;
      const companyId = contact.properties.companyOrderwiseId;
      delete contact.properties.companyOrderwiseId;

      const id = await searchObjectByKey(
        "orderwiseid",
        orderwiseid,
        "contacts"
      );
      let saved;
      if (id) {
        saved = await updateObjectByKey(id, contact, "contacts");
      } else {
        saved = await createHubSpotObject(contact, "contacts");
      }

      await associateContactToCompany(companyId, saved?.id);
    } catch (err) {
      logger.error(err);
    }
  }
}

export {
  login,
  getCompanies,
  getContacts,
  postCompaniesToHubspot,
  postContactsToHubspot,
};
