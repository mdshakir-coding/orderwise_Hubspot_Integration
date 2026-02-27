import logger from "../config/logger.js";


async function searchObjectByKey(key, value, object) {
  const response = await fetch(`${process.env.HUBSPOT_BASE_URL}/${object}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [{ propertyName: key, operator: "EQ", value }],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  const data = await response.json();
  return data.results.length > 0 ? data.results[0].id : null;
}

async function createObject(object, payload) {
  const response = await fetch(`${process.env.HUBSPOT_BASE_URL}/${object}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Create failed: ${response.status}`);
  }

  const data = await response.json();
  logger.info(`${object} created: ${data.id}`);
  return data;
}

async function updateObject(object, id, payload) {
  const response = await fetch(`${process.env.HUBSPOT_BASE_URL}/${object}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Update failed: ${response.status}`);
  }

  const data = await response.json();
  logger.info(`${object} updated: ${data.id}`);
  return data;
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