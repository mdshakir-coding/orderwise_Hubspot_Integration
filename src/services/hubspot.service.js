import logger from "../config/logger.js";


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


async function searchObjectByKey(object, key, value) {

  if (!object || !key || !value) {
    throw new Error(
      `Missing search parameters → object:${object}, key:${key}, value:${value}`
    );
  }

  
  const apiUrl = `${process.env.HUBSPOT_API_URL}/${object}/search`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
      }),
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      console.error("HubSpot Search Error:", errorText);
      throw new Error(`Search failed: ${response.status}`);
    }
  
    const data = await response.json();
    return data.results?.length > 0 ? data.results[0].id : null;
  } catch (error) {
    logger.error("Error in searchObjectByKey:", error.message);
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



async function createObject(object, payload) {
  try {
    const response = await fetch(
      `${process.env.HUBSPOT_API_URL}/${object}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        `Failed to create ${object}: ${response.status} - ${errorText}`
      );
      return null; // Return null on failure
    }

    const data = await response.json();
    logger.info(`${object} created: ${data.id}`);
    return data;

  } catch (error) {
    logger.error(`Error creating ${object}:`, error.message);
    return null; // Return null if exception occurs
  }
}

async function updateObject(object, id, payload) {
  try {
    const response = await fetch(
      `${process.env.HUBSPOT_API_URL}/${object}/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(payload),
      }
    );

    // if (!response.ok) {
    //   const errorText = await response.text();
    //   logger.error(
    //     `Failed to update ${object} with ID ${id}: ${response.status} - ${errorText}`
    //   );
    //   return null; // return null if update failed
    // }
    const data = await response.json();
    logger.info(`${object} updated successfully: ${JSON.stringify(data,null,2)}`);
    return data;

  } catch (error) {
    logger.error(`Error updating ${object} with ID ${id}:`,error);
    return null; // return null on exception
  }
}


async function associateContactToCompany(companyId, contactId) {
  const url = `https://api.hubapi.com/crm/v4/objects/companies/${companyId}/associations/default/contact/${contactId}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Association failed: ${response.status}`);
  }

  logger.info(`Contact ${contactId} associated with company ${companyId}`);
}

// create a upsert function

// async function upsertHubSpotObject(objectType, searchKey, searchValue, payload) {
//   try {
//     // 1. SEARCH: Check if object exists
//     let hubspotId = await searchObjectByKey(
//       objectType,
//       searchKey,
//       searchValue
//     );

//     // 2. UPDATE: If object exists, update it
//     if (hubspotId) {
//       logger.info(`Updating existing ${objectType}: ${hubspotId}`);
//       await updateObject(objectType, hubspotId, payload);
//       return hubspotId;
//     }

//     // 3. CREATE: If object doesn't exist, create it
//     logger.info(`Attempting to create ${objectType} for ${searchKey}: ${searchValue}`);
//     try {
//       const createdObject = await createObject(objectType, payload);
//       return createdObject.id;
//     } catch (createError) {
//       // 4. CONFLICT HANDLING: If 409 CONFLICT, re-search and update
//       if (createError.message && createError.message.includes("409")) {
//         logger.warn(`Conflict detected for ${searchValue}. Re-searching...`);
        
//         hubspotId = await searchObjectByKey(
//           objectType,
//           searchKey,
//           searchValue
//         );

//         if (hubspotId) {
//           logger.info(`Found existing ${objectType} after conflict: ${hubspotId}`);
//           await updateObject(objectType, hubspotId, payload);
//           return hubspotId;
//         } else {
//           throw new Error(`Conflict occurred but ${objectType} still not found by search.`);
//         }
//       } else {
//         throw createError; // Re-throw other errors
//       }
//     }
//   } catch (error) {
//     logger.error(`Error upserting ${objectType} ${searchValue}: ${error.message}`);
//     return null; // Return null on failure
//   }
// }

async function upsertHubSpotObject(objectType, searchKey, searchValue, payload) {
  try {
    // 1. Primary Search: Search by Orderwise ID
    let hubspotId = await searchObjectByKey(objectType, searchKey, searchValue);

    // 2. Secondary Search: If ID search fails, search by Email (only for contacts)
    if (!hubspotId && objectType === "contacts" && payload.properties.email) {
      logger.info(`ID search failed for ${searchValue}, searching by email: ${payload.properties.email}`);
      hubspotId = await searchObjectByKey(objectType, "email", payload.properties.email);
    }

    if (hubspotId) {
      logger.info(`Updating existing ${objectType}: ${hubspotId}`);
      await updateObject(objectType, hubspotId, payload);
      return hubspotId;
    }

    // 3. Create: Only if both searches return nothing
    try {
      const createdObject = await createObject(objectType, payload);
      return createdObject?.id || null;
    } catch (createError) {
      if (createError.message && createError.message.includes("409")) {
         // This block is now your safety net if email search somehow missed it
         logger.warn(`409 Conflict on create for ${searchValue}. Record exists but is hidden from search.`);
         return null; 
      }
      throw createError;
    }
  } catch (error) {
    logger.error(`Error upserting ${objectType} ${searchValue}: ${error.message}`);
    return null;
  }
}




export {
  searchObjectByKey,
  createObject,
  updateObject,
  associateContactToCompany,upsertHubSpotObject
};