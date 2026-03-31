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

      // allCustomers.push(...data);

      try {
        await syncContacts(data);
      } catch (error) {
        logger.error("Error syncing contacts:", error);
      }

      // Process the records here (e.g., save to DB) before updating lastId

      lastId = data[data.length - 1].id;
      // setLastId(lastId); // Save lastId after each successful fetch

      logger.info(`Fetched batch. Total: ${data.length}`);
    }

    // return allCustomers || [];
  } catch (error) {
    logger.error("Error fetching Orderwise customers:", error);
    return [];
  }
}

// fetch contacts
// logger.info(`Contacts Count: ${contacts.length}`);
async function getContacts(companyId) {
  try {
    if (!token) await login();
    // if (!companies || companies.length === 0) return [];

    let allContacts = [];

    // for (const company of companies) {
    // 1. lastId must be reset to 0 for every NEW company
    let lastId = 0;
    let hasMore = true;

    while (hasMore) {
      // 2. Add last_id to the URL query parameters
      const url = `http://sslvpn.caretrade.co/OWAPI/customers/${companyId}/customer-contacts?limit=1000&last_id=${lastId}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        logger.warn(`Failed contacts for company ${companyId}`);
        break; // Move to next company
      }

      const data = await response.json();

      if (!data || data.length === 0) break;

      allContacts.push(...data);
      // allContacts.push(
      //   ...data.map((contact) => ({
      //     ...contact,
      //     companyId,
      //   }))
      // );
      // return allContacts; //todo remove after testing
      // 3. Update lastId to the ID of the last contact in the current batch
      lastId = data[data.length - 1].id;

      logger.info(`Fetched batch of ${data.length} for company ${companyId}`);

      // 4. If we got fewer than 1000, no more pages exist
      if (data.length < 1000) hasMore = false;
    }
    // }
    return allContacts;
  } catch (error) {
    logger.error("Error fetching contacts:", error);
    return [];
  }
}
async function getContactsbyId(companyId, contactId) {
  try {
    if (!token) await login();

    const url = `http://sslvpn.caretrade.co/OWAPI/customers/${companyId}/customer-contacts?limit=1000&last_id=${contactId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    // logger.info(
    //   `Fetched contact  ${JSON.stringify(
    //     data,
    //     null,
    //     2
    //   )} for company ${companyId}`
    // );

    return data;

    // if (!data || data.length === 0) break;

    //   allContacts.push(...data);
    //   // allContacts.push(
    //   //   ...data.map((contact) => ({
    //   //     ...contact,
    //   //     companyId,
    //   //   }))
    //   // );
    //   // return allContacts; //todo remove after testing
    //   // 3. Update lastId to the ID of the last contact in the current batch
    //   lastId = data[data.length - 1].id;

    //   logger.info(`Fetched batch of ${data.length} for company ${companyId}`);

    //   // 4. If we got fewer than 1000, no more pages exist
    //   if (data.length < 1000) hasMore = false;
    // }
    // // }
    // return allContacts;
  } catch (error) {
    logger.error("Error fetching contacts:", error);
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
// fetch activities
import axios from "axios";
async function fetchOrderwiseActivities(companyId) {
  try {
    const url = `http://sslvpn.caretrade.co/OWAPI/crm/${companyId}/activities`;

    const response = await axios.get(url, {
      params: {
        include_completed: true,
        include_analysis: true,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error(
      "Error fetching OrderWise activities:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// function activityAssociations({ contactId, companyId }) {
//   const associations = [];

//   // Email → Contact
//   if (contactId) {
//     associations.push({
//       to: { id: contactId },
//       types: [
//         {
//           associationCategory: "HUBSPOT_DEFINED",
//           associationTypeId: 198,
//         },
//       ],
//     });
//   }

//   // Email → Company
//   if (companyId) {
//     associations.push({
//       to: { id: companyId },
//       types: [
//         {
//           associationCategory: "HUBSPOT_DEFINED",
//           associationTypeId: 186,
//         },
//       ],
//     });
//   }

//   return associations;
// }

function activityAssociations(contactId, companyId) {
  const associations = [];

  if (contactId) {
    associations.push({
      to: { id: contactId },
      types: [
        {
          associationCategory: "HUBSPOT_DEFINED",
          associationTypeId: 198,
        },
      ],
    });
  }

  if (companyId) {
    associations.push({
      to: { id: companyId },
      types: [
        {
          associationCategory: "HUBSPOT_DEFINED",
          associationTypeId: 186,
        },
      ],
    });
  }

  return associations;
}

// get CRMR ecord By Id
// async function getCRMRecordById(id, retry = true) {
//   try {
//     const url = `http://sslvpn.caretrade.co/OWAPI/crm/${id}`;

//     const response = await fetch(url, {
//       method: "GET",
//       headers: {
//         Accept: "application/json",
//         Authorization: `Bearer ${token}`, // use your dynamic token
//       },
//     });

//     if (!response.ok) {
//       if (retry) {
//         logger.info("Token expired, retrying after login...");
//         await login(); // your existing login function
//         return getCRMRecordById(id, false);
//       }
//       // throw new Error(`Request failed: ${response.status}`);
//     }

//     const data = await response.json();

//     logger.info("CRM Record:", data);

//     return data;
//   } catch (error) {
//     logger.error("Error fetching CRM record:", error);
//     return null;
//   }
// }

async function getCRMRecordById(id, retry = true) {
  const url = `http://sslvpn.caretrade.co/OWAPI/crm/${id}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`, // Ensure 'token' is accessible here
      },
      // Axios timeout is helpful for VPN-based APIs
      timeout: 10000,
    });

    // Axios automatically parses JSON.
    // We just need to check if the data actually exists.
    if (!response.data) {
      logger.warn(`CRM Record ${id} returned an empty response body.`);
      return null;
    }

    logger.info(`CRM Record ${id} fetched successfully.`);
    return response.data;
  } catch (error) {
    // 1. Handle Token Expiry (401)
    if (error.response?.status === 401 && retry) {
      logger.info("Token expired, retrying after login...");
      await login();
      // Important: Ensure the global 'token' variable is updated by login() before retrying
      return getCRMRecordById(id, false);
    }

    // 2. Handle "Not Found" (404) or other API errors
    if (error.response) {
      // The server responded with a status code outside the 2xx range
      logger.error(
        `Orderwise API Error [${error.response.status}]: ${JSON.stringify(
          error.response.data
        )}`
      );
    } else if (error.request) {
      // The request was made but no response was received (Timeout/Network issue)
      logger.error(
        `Orderwise Network Error: No response received for ID ${id}`
      );
    } else {
      // Something happened in setting up the request
      logger.error(`Error setting up CRM fetch for ID ${id}:`, error.message);
    }

    // Always return null so your controller (contacts.js) doesn't crash
    // when trying to read .customerId
    return null;
  }
}
//  get customer by id

// async function getCustomerById(customerId, retry = true) {
//   try {
//     const url = `http://sslvpn.caretrade.co/OWAPI/customers/${customerId}`;

//     const response = await fetch(url, {
//       method: "GET",
//       headers: {
//         Accept: "application/json",
//         Authorization: `Bearer ${token}`, // dynamic token
//       },
//     });

//     if (!response.ok) {
//       if (retry) {
//         logger.info("Token expired, retrying after login...");
//         await login(); // your existing login function
//         return getCustomerById(customerId, false);
//       }
//       // throw new Error(`Request failed: ${response.status}`);
//     }

//     const data = await response.json();

//     logger.info("Customer Record:", data);

//     return data;
//   } catch (error) {
//     logger.error("Error fetching customer:", error);
//     return null;
//   }
// }

async function getCustomerById(customerId, retry = true) {
  try {
    const url = `http://sslvpn.caretrade.co/OWAPI/customers/${customerId}`;

    const response = await axios.get(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`, // Ensure 'token' is updated after login()
      },
      // Optional: timeout in milliseconds
      timeout: 10000,
    });

    // Axios puts the parsed JSON directly into response.data
    const data = response.data;

    logger.info(`Customer Record ${customerId} fetched successfully`);
    return data;
  } catch (error) {
    // Check if the error is a 401 (Unauthorized) to trigger the retry logic
    if (error.response && error.response.status === 401 && retry) {
      logger.info("Token expired or Unauthorized, retrying after login...");

      await login();

      // Re-run the function once with retry set to false
      return getCustomerById(customerId, false);
    }

    // Handle 404 specifically if needed (e.g., customer doesn't exist)
    if (error.response && error.response.status === 404) {
      logger.warn(`Customer ${customerId} not found in Orderwise.`);
      return null;
    }

    // Log other errors (Network issues, 500s, etc.)
    logger.error(
      `Error fetching customer ${customerId}:`,
      error.response?.data || error.message
    );

    return null;
  }
}

async function getOrwerwiseContactbyId(companyId, contactId) {
  try {
    if (!token) await login();

    // Use a URL object or template string to add the query parameter
    const url = `http://sslvpn.caretrade.co/OWAPI/customers/${companyId}/customer-contacts?contact_id=${contactId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      logger.error(`API Error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    /**
     * NOTE: Since the documentation says "Returns customer contact records" (plural),
     * the API likely returns an ARRAY even if you provide a specific contact_id.
     */
    if (Array.isArray(data)) {
      return data.length > 0 ? data[0] : null;
    }

    return data; // Return the object directly if it's not an array
  } catch (error) {
    logger.error("Error fetching contacts:", error);
    return null;
  }
}

export {
  getOrwerwiseContactbyId,
  getContactsbyId,
  login,
  getCompanies,
  getContacts,
  postCompaniesToHubspot,
  postContactsToHubspot,
  fetchOrderwiseActivities,
  activityAssociations,
  getCRMRecordById,
  getCustomerById,
};
