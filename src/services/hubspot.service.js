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

export {
  searchObjectByKey,
  createObject,
  updateObject,
  associateContactToCompany
};