import logger from "../config/logger.js";
import axios from "axios";
import { hubspotExecutor, orderwiseExecutor } from "../utils/executors.js";

// async function searchObjectByKey(key, value, object) {
//   const response = await fetch(`${process.env.HUBSPOT_API_URL}/crm/v3/objects/${object}/search`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
//     },
//     body: JSON.stringify({
//       filterGroups: [
//         {
//           filters: [{ propertyName: key, operator: "EQ", value }],
//         },
//       ],
//     }),
//   });

//   if (!response.ok) {
//     throw new Error(`Search failed: ${response.status}`);
//   }

//   const data = await response.json();
//   return data.results.length > 0 ? data.results[0].id : null;
// }

// async function searchObjectByKey(object, key, value, properties) {
//   if (!object || !key || !value) {
//     logger.error(
//       `Missing search parameters → object:${object}, key:${key}, value:${value}`
//     );
//     return null;
//   }

//   const apiUrl = `${process.env.HUBSPOT_API_URL}/${object}/search`;

//   try {
//     const response = await fetch(apiUrl, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         filterGroups: [
//           {
//             filters: [
//               {
//                 propertyName: key,
//                 operator: "EQ",
//                 value: value,
//               },
//             ],
//           },
//         ],
//         properties,
//       }),
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error("HubSpot Search Error:", errorText);
//       throw new Error(`Search failed: ${response.status}`);
//     }

//     const data = await response.json();
//     return data.results?.length > 0 ? data.results[0] : null;
//   } catch (error) {
//     logger.error("Error in searchObjectByKey:", error.message);
//     return null;
//   }
// }

async function searchObjectByKey(object, key, value, properties) {
  if (!object || !key || !value) {
    logger.error(
      `Missing search parameters → object:${object}, key:${key}, value:${value}`
    );
    return null;
  }

  const apiUrl = `${process.env.HUBSPOT_API_URL}/${object}/search`;

  try {
    const response = await hubspotExecutor(
      () => {
        return axios.post(
          apiUrl,
          {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: key,
                    operator: "EQ",
                    value: value,
                  },
                ],
              },
            ],
            properties,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
      },
      { name: "searchObjectByKey" }
    );

    // Axios stores the parsed JSON response in the 'data' property
    const data = response.data;
    return data.results?.length > 0 ? data.results[0] : null;
  } catch (error) {
    // Axios provides the error response details in error.response
    if (error.response) {
      logger.error(
        `HubSpot Search Error: ${error.response.status} - ${JSON.stringify(
          error.response.data
        )}`
      );
    } else {
      logger.error("Error in searchObjectByKey:", error.message);
    }
    return null;
  }
}
// async function createObject(object, payload) {
//   const response = await fetch(`${process.env.HUBSPOT_API_URL}/crm/v3/objects/${object}`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
//     },
//     body: JSON.stringify(payload),
//   });

//   if (!response.ok) {
//     throw new Error(`Create failed: ${response.status}`);
//   }

//   const data = await response.json();
//   logger.info(`${object} created: ${data.id}`);
//   return data;
// }

// async function updateObject(object, id, payload) {
//   const response = await fetch(`${process.env.HUBSPOT_API_URL}/crm/v3/objects/${object}/${id}`, {
//     method: "PATCH",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
//     },
//     body: JSON.stringify(payload),
//   });

//   if (!response.ok) {
//     throw new Error(`Update failed: ${response.status}`);
//   }

//   const data = await response.json();
//   logger.info(`${object} updated: ${data.id}`);
//   return data;
// }

// async function createObject(object, payload) {
//   try {
//     const response = await fetch(`${process.env.HUBSPOT_API_URL}/${object}`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
//       },
//       body: JSON.stringify(payload),
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       logger.error(
//         `Failed to create ${object}: ${response.status} - ${errorText}`
//       );
//       return null; // Return null on failure
//     }

//     const data = await response.json();
//     // logger.info(`${object} created: ${data.id}`);
//     return data;
//   } catch (error) {
//     logger.error(`Error creating ${object}:`, error.message);
//     return null; // Return null if exception occurs
//   }
// }

// async function updateObject(object, id, payload) {
//   try {
//     const response = await fetch(
//       `${process.env.HUBSPOT_API_URL}/${object}/${id}`,
//       {
//         method: "PATCH",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
//         },
//         body: JSON.stringify(payload),
//       }
//     );

//     // if (!response.ok) {
//     //   const errorText = await response.text();
//     //   logger.error(
//     //     `Failed to update ${object} with ID ${id}: ${response.status} - ${errorText}`
//     //   );
//     //   return null; // return null if update failed
//     // }
//     const data = await response.json();
//     // logger.info(`${object} updated successfully: ${JSON.stringify(data,null,2)}`);
//     return data;
//   } catch (error) {
//     logger.error(`Error updating ${object} with ID ${id}:`, error);
//     return null; // return null on exception
//   }
// }

// async function associateContactToCompany(companyId, contactId) {
//   const url = `https://api.hubapi.com/crm/v4/objects/companies/${companyId}/associations/default/contact/${contactId}`;

//   const response = await fetch(url, {
//     method: "PUT",
//     headers: {
//       Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
//     },
//   });

//   if (!response.ok) {
//     throw new Error(`Association failed: ${response.status}`);
//   }

//   logger.info(`Contact ${contactId} associated with company ${companyId}`);
// }

// create a upsert function

// async function upsertHubSpotObject(objectType, searchKey, searchValue, payload) {
//   try {
//     // 1. Primary Search: Search by Orderwise ID
//     let hubspotId = await searchObjectByKey(objectType, searchKey, searchValue);

//     // 2. Secondary Search: If ID search fails, search by Email (only for contacts)
//     if (!hubspotId && objectType === "contacts" && payload.properties.email) {
//       logger.info(`ID search failed for ${searchValue}, searching by email: ${payload.properties.email}`);
//       hubspotId = await searchObjectByKey(objectType, "email", payload.properties.email);
//     }

//     if (hubspotId) {
//       logger.info(`Updating existing Contact ${objectType}: ${hubspotId}`);
//       await updateObject(objectType, hubspotId, payload);
//       return hubspotId;
//     }

//     // 3. Create: Only if both searches return nothing
//     try {
//       const createdObject = await createObject(objectType, payload);
//       return createdObject?.id || null;
//     } catch (createError) {
//       if (createError.message && createError.message.includes("409")) {
//          // This block is now your safety net if email search somehow missed it
//          logger.warn(`409 Conflict on create for ${searchValue}. Record exists but is hidden from search.`);
//          return null;
//       }
//       throw createError;
//     }
//   } catch (error) {
//     logger.error(`Error upserting ${objectType} ${searchValue}: ${error.message}`);
//     return null;
//   }
// }

// new upsert function with improved error handling and logging

async function createObject(object, payload) {
  try {
    const response = await hubspotExecutor(
      () => {
        return axios.post(
          `${process.env.HUBSPOT_API_URL}/${object}`,
          payload, // Axios handles JSON.stringify automatically
          {
            headers: {
              Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
      },
      { name: `createObject-${object}-payload ${JSON.stringify(payload)}` }
    );

    return response.data;
  } catch (error) {
    const errorMsg = error.response
      ? `${error.response.status} - ${JSON.stringify(error.response.data)}`
      : error.message;

    logger.error(`Failed to create ${object}: ${errorMsg}`);
    return null;
  }
}

async function updateObject(object, id, payload) {
  try {
    const response = await hubspotExecutor(
      () => {
        return axios.patch(
          `${process.env.HUBSPOT_API_URL}/${object}/${id}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
      },
      {
        name: `updateObject-${object}-id ${id} - payload ${JSON.stringify(
          payload
        )}`,
      }
    );

    return response.data;
  } catch (error) {
    const errorMsg = error.response
      ? `${error.response.status} - ${JSON.stringify(error.response.data)}`
      : error.message;

    logger.error(`Error updating ${object} with ID ${id}: ${errorMsg}`);
    return null;
  }
}

async function associateContactToCompany(companyId, contactId) {
  const url = `https://api.hubapi.com/crm/v4/objects/companies/${companyId}/associations/default/contact/${contactId}`;

  try {
    const response = await hubspotExecutor(() => {
      return axios.put(
        url,
        null, // PUT requests usually require a body argument, even if empty
        {
          headers: {
            Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
          },
        }
      );
    });

    logger.info(`Contact ${contactId} associated with company ${companyId}`);

    return response.data;
  } catch (error) {
    const errorStatus = error.response?.status || "Unknown";
    throw new Error(`Association failed: ${errorStatus}`);
  }
}
async function upsertHubSpotObject(
  objectType,
  searchKey,
  searchValue,
  payload
) {
  try {
    // 1. Primary Search: Search by Orderwise ID
    let hubspotId = await searchObjectByKey(objectType, searchKey, searchValue);

    // 2. Secondary Search: If ID search fails, search by Email (only for contacts)
    if (!hubspotId && objectType === "contacts" && payload?.properties?.email) {
      logger.info(
        `ID search failed for ${searchValue}, searching by email: ${payload?.properties?.email}`
      );
      hubspotId = await searchObjectByKey(
        objectType,
        "email",
        payload?.properties?.email
      );
    }

    // 3️⃣ Update if exists
    if (hubspotId) {
      logger.info(`Updating existing ${objectType}: ${hubspotId}`);

      const updatedObject = await updateObject(objectType, hubspotId, payload);
      logger.info(
        `Updated ${objectType} successfully: ${JSON.stringify(
          updatedObject,
          null,
          2
        )}`
      );

      return updatedObject?.id || hubspotId;
    }

    // 4️⃣ Create if not found
    try {
      const createdObject = await createObject(objectType, payload);
      return createdObject?.id || null;
    } catch (createError) {
      if (createError.response && createError.response.status === 409) {
        logger.warn(
          `409 Conflict: Record exists but hidden from search (${searchValue})`
        );
        return null;
      }

      throw createError;
    }
  } catch (error) {
    logger.error(
      `Error upserting ${objectType} ${searchValue}: ${error.message}`
    );
    return null;
  }
}

//
/**
 * Syncs OrderWise CRM activity to HubSpot with clear log output.
 */
// async function syncEmailWithLogging({
//   subject,
//   body,
//   contactId,
//   companyId,
//   orderWiseId,
// }) {
//   const url = "https://api.hubapi.com/crm/v3/objects/emails";

//   // Generate timestamp for the log
//   const timestamp = new Date()
//     .toLocaleString("en-US", { hour12: true })
//     .replace(",", "");

//     associations: [
//       {
//         to: { id: contactId },
//         types: [
//           { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 198 },
//         ],
//       },
//       {
//         to: { id: companyId },
//         types: [
//           { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 186 },
//         ],
//       },
//     ],
//   };

//   try {
//     const response = await fetch(url, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(payload),
//     });

//     const result = await response.json();

//     if (response.ok) {
//       // Success Log
//       logger.info(
//         `${timestamp} | info | Email Activity created: ${result.id} associated with Contact ${contactId} and Company ${companyId}`
//       );
//       return result;
//     } else {
//       // Error Log
//       logger.error(
//         `${timestamp} | error | HubSpot Sync Failed for OrderWise ID ${orderWiseId}: ${result.message}`
//       );
//     }
//   } catch (error) {
//     logger.error(`${timestamp} | error | System Exception: ${error.message}`);
//   }
// }

// import axios from "axios";

// Bulk Company and contact Creation and Association Logic

// async function createContactCompanyAssociations(associations) {
//   const url =
//     "https://api.hubapi.com/crm/v4/associations/contacts/companies/batch/create";

//   try {
//     const response = await axios.post(
//       url,
//       {
//         inputs: associations.map((item) => ({
//           from: { id: item.contactId },
//           to: { id: item.companyId },
//           type: "contact_to_company",
//         })),
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     return response.data;
//   } catch (error) {
//     console.error(
//       "Error creating associations:",
//       error.response?.data || error.message
//     );
//     return null;
//   }
// }
async function createContactCompanyAssociations(associations) {
  const url =
    "https://api.hubapi.com/crm/v4/associations/contacts/companies/batch/create";

  try {
    // 1. Filter out duplicates from your input to avoid redundant processing
    const uniqueAssociations = Array.from(
      new Set(associations.map((a) => JSON.stringify(a)))
    ).map((a) => JSON.parse(a));

    const response = await hubspotExecutor(
      () => {
        return axios.post(
          url,
          {
            inputs: uniqueAssociations.map((item) => ({
              from: { id: String(item.contactId) },
              to: { id: String(item.companyId) },
              // v4 uses the 'types' array
              types: [
                {
                  associationCategory: "HUBSPOT_DEFINED",
                  associationTypeId: 1, // 1 is the default 'Primary' contact-to-company link
                },
              ],
            })),
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
      },
      { name: "createContactCompanyAssociations" }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error creating associations:",
      error.response?.data || error.message
    );
    return null;
  }
}
async function createHubspotEmailIfValid(activity, payload) {
  // 1. Check if the 'name' field exists and includes the word "Email"
  // const hasEmailInName =
  //   activity.name && activity.name.toLowerCase().includes("email");

  // if (!hasEmailInName) {
  //   logger.info(
  //     `Skipping activity ${activity.id}: Name '${activity.name}' does not contain 'Email'`
  //   );
  //   return null; // Return null to signal a skip
  // }

  // 2. If valid, create in HubSpot
  try {
    const result = await createObject("emails", payload);
    return result;
  } catch (error) {
    logger.error(
      `Error creating HubSpot activity ${activity.id}: ${error.message}`,
      error
    );
    return null;
  }
}

export {
  searchObjectByKey,
  createObject,
  updateObject,
  associateContactToCompany,
  upsertHubSpotObject,
  // syncEmailWithLogging,
  createContactCompanyAssociations,
  createHubspotEmailIfValid,
};
