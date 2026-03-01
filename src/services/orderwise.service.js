

import { getLastId, setLastId } from "../utils/lastRun.js";
// import fetch from "node-fetch"; // if using Node.js
import logger from "../config/logger.js";

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
    logger.info("Orderwise token:", token);
    return token;
  } catch (error) {
    logger.error("Login Error:", error);
    return null;
  }
}

/** Fetch companies from Orderwise */
//  async function getCompanies(retry = true) {
//   try {
//     if (!token && retry) await login();

//     const url = `http://sslvpn.caretrade.co/OWAPI/customers?limit=10000&last_id=${getLastId()}`;
//     const response = await fetch(url, {
//       method: "GET",
//       headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
//     });

//     if (!response.ok) {
//       if (retry) {
//         logger.info("Retrying after refreshing token...");
//         await login();
//         return getCompanies(false);
//       }
//       throw new Error("Failed to fetch customers: " + response.status);
//     }

//     const data = await response.json();
//     companies = (data || []).map((item) => ({
//       properties: {
//         orderwiseid: item.id,
//         name: item.statementName,
//         phone: item.statementTelephone,
//         domain: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.statementEmail)
//           ? item.statementEmail.split("@")[1]
//           : "",
//       },
//     }));

//     const last_id = companies[companies.length - 1]?.properties?.orderwiseid;
//     if (last_id) setLastId(last_id);

//     return companies;
//   } catch (error) {
//     logger.error("Error fetching customers:", error);
//     return null;
//   }
// }


// add pagination logic 

async function getCompanies(retry = true) {
  try {
    if (!token && retry) await login();

    let allCustomers = [];
    let lastId = getLastId() || 0;
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
          return fetchOrderwiseCustomers(false);
        }
        throw new Error(`Failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) break;

      allCustomers.push(...data);
      // return allCustomers; //todo remove after testing

      lastId = data[data.length - 1].id;
      setLastId(lastId);

      logger.info(`Fetched batch. Total: ${allCustomers.length}`);
    }

    return allCustomers;
  } catch (error) {
    logger.error("Error fetching Orderwise customers:", error.message);
    return [];
  }
}



/** Fetch contacts for all companies */
//  async function getContacts(retry = true) {
//   try {
//     if (!token && retry) await login();
//     if (!companies.length) return [];

//     contacts = [];

//     for (const company of companies) {
//       const url = `http://sslvpn.caretrade.co/OWAPI/customers/${company.properties.orderwiseid}/customer-contacts`;
//       const response = await fetch(url, {
//         method: "GET",
//         headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
//       });

//       if (!response.ok) {
//         if (retry) {
//           logger.info("Retrying after refreshing token...");
//           await login();
//           return getContacts(false);
//         }
//         logger.warn(`Failed to fetch contacts for company ${company.properties.orderwiseid}`);
//         continue;
//       }

//       const data = await response.json();
//       const companyContacts = (data || []).map((c) => ({
//         properties: {
//           orderwiseid: c.id,
//           firstname: c.name?.split(" ")[0] || "",
//           lastname: c.name?.split(" ")[1] || "",
//           phone: c.telephone || "",
//           email: (() => {
//             const match = c?.email?.match(/[\w.-]+@[\w.-]+\.\w+/);
//             return match ? match[0] : c.email?.trim();
//           })(),
//           companyOrderwiseId: company.properties.orderwiseid,
//         },
//       }));

//       contacts.push(...companyContacts);
//     }

//     return contacts;
//   } catch (error) {
//     logger.error("Error fetching contacts:", error);
//     return [];
//   }
// }

// add pagination logic
async function getContacts(retry = true) {
  try {
    if (!token && retry) await login();
    if (!companies.length) return [];

    let allContacts = [];

    for (const company of companies) {
      let lastId = 0;
      let hasMore = true;

      while (hasMore) {
        const url = `http://sslvpn.caretrade.co/OWAPI/customers/${company.id}/customer-contacts?limit=1000&last_id=${lastId}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (retry) {
            logger.info("Refreshing token and retrying contacts...");
            await login();
            return getContacts(false);
          }

          logger.warn(
            `Failed contacts for company ${company.id}`
          );
          break;
        }

        const data = await response.json();

        if (!data || data.length === 0) break;

        allContacts.push(

          ...data.map((contact) => ({
            ...contact,
            companyId: company.id,
          }))
        );
        // return allContacts; //todo remove after testing
        lastId = data[data.length - 1].id;

        logger.info(
          `Fetched ${data.length} contacts for company ${company.id}`
        );
      }
    }

    return allContacts;
  } catch (error) {
    logger.error("Error fetching contacts:", error.message);
    return [];
  }
}

/** Post companies to HubSpot */
 async function postCompaniesToHubspot(searchObjectByKey, updateObjectByKey, createHubSpotObject) {
  for (const company of companies) {
    try {
      const id = await searchObjectByKey("orderwiseid", company.properties.orderwiseid, "companies");
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
 async function postContactsToHubspot(searchObjectByKey, updateObjectByKey, createHubSpotObject, associateContactToCompany) {
  for (const contact of contacts) {
    try {
      const orderwiseid = contact.properties.orderwiseid;
      const companyId = contact.properties.companyOrderwiseId;
      delete contact.properties.companyOrderwiseId;

      const id = await searchObjectByKey("orderwiseid", orderwiseid, "contacts");
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







