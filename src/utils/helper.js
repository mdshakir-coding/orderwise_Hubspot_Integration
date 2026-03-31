import fs from "fs";
import path from "path";

import { fileURLToPath } from "url";

// Fix __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanProps(obj) {
  const cleaned = {};

  for (const key in obj) {
    const value = obj[key];

    // Skip undefined
    if (value === undefined) continue;

    // Allow null (HubSpot accepts null for some fields)
    if (value === null) {
      cleaned[key] = null;
      continue;
    }

    // Allow strings and numbers directly
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      cleaned[key] = value;
      continue;
    }

    // If it's an object and has `.toString()`
    if (typeof value === "object") {
      // Capsule rich text: { content: "xxx" }
      if (value.content && typeof value.content === "string") {
        cleaned[key] = value.content;
        continue;
      }

      // Date object → convert to timestamp
      if (value instanceof Date) {
        cleaned[key] = value.getTime();
        continue;
      }

      // Otherwise fallback → JSON string
      cleaned[key] = JSON.stringify(value);
      continue;
    }

    // Everything else → convert to string
    cleaned[key] = String(value);
  }

  return cleaned;
}

// Company payload mapping (if needed in the future)

// comapny maaping fields:
// {
//   "id": 2012,
//   "accountNumber": "A1A001",
//   "statementName": "Anchor Fixings Ltd",
//   "statementAddress1": "Rathenraw Ind Est ",
//   "statementAddress2": "Greystone Road",
//   "statementAddress3": "",
//   "statementTown": "Antrim",
//   "statementPostcode": "BT41 2SJ ",
//   "statementCounty": "Co Antrim",
//   "statementCountry": "",
//   "statementEmail": "accounts@anchorfixings.com",
//   "statementWebsite": "",
//   "statementTelephone": "028 9084 2373",
//   "statementFax": "028 9084 4311",
//   "statementCountryCode": "GB",
//   "invoiceName": null,
//   "invoiceAddress1": null,
//   "invoiceAddress2": null,
//   "invoiceAddress3": null,
//   "invoiceTown": null,
//   "invoicePostcode": null,
//   "invoiceCounty": null,
//   "invoiceCountry": null,
//   "invoiceEmail": null,
//   "invoiceWebsite": null,
//   "invoiceTelephone": null,
//   "invoiceFax": null,
//   "invoiceCountryCode": null,
//   "vatNumber": null,
//   "defaultTaxCodeId": 2,
//   "overrideVariantTax": false,
//   "nominalCodeId": 6,
//   "departmentCodeId": 1,
//   "costCentreId": 0,
//   "currencyId": 1,
//   "defaultDeliveryMethodId": 1,
//   "defaultDeliveryGroupId": null,
//   "usePriceList": null,
//   "priceListId": 1463,
//   "priceListDiscountPercent": 0,
//   "multisaverDiscountGroupId": null,
//   "discountStructureId": null,
//   "defaultStockLocationId": 12,
//   "accountCustomer": true,
//   "onHold": false,
//   "manualOnHold": false,
//   "overCreditTerms": false,
//   "creditLimit": 50000,
//   "openOrdersValue": 0,
//   "availableToSpend": 50000,
//   "balance": 0
// }
function companyPayload(item = {}) {
  let domain = null;

  if (extractValidEmail(item.statementEmail?.trim())) {
    domain = item.statementEmail.trim().split("@")[1];
  } else {
    domain = "";
  }
  return {
    properties: {
      orderwiseid: item?.id || null,
      name: item?.statementName || null,
      phone: item?.statementTelephone || null,
      domain,
      address: item?.statementAddress1 || null,
      address2: item?.statementAddress2 || null,
      city: item?.statementTown || null,
      country: item?.statementCounty || null,
      state: item?.statementCountryCode || null,
      zip: item?.statementPostcode || null,
      // fax: item?.statementFax || null,
    },
  };
}

// company payload mapping (if needed in the future)

function extractValidEmail(email) {
  if (!email) return "";

  if (Array.isArray(email)) {
    email = email[0];
  }

  if (typeof email === "object") {
    email = email.value || email.email || "";
  }

  if (typeof email !== "string") {
    return "";
  }

  const match = email.match(/[\w.-]+@[\w.-]+\.\w+/);
  return match ? match[0] : email.trim();
}

// contact payload mapping
function mapContactsToHubspot(c, item) {
  // Check if contact exists
  if (!c) return null;

  const nameParts = (c?.name || "").trim().split(" ");

  return {
    properties: {
      orderwiseid: c?.id || null,

      firstname: nameParts[0] || null,
      lastname: nameParts.slice(1).join(" ") || null,
      //  firstname: c?.name || null,
      // lastname: c?.name ||null,
      phone: c?.telephone || null,
      email: extractValidEmail(c?.email),
      company: c?.companyId || null,
      mobilephone: c?.mobile || null,
      fax: c?.fax || null,

      // company: item?.id || null,
      // compnayOrderwiseId: company.properties.orderwiseid,
    },
  };
}

function isCompanySame(hubspot, payload) {
  const hs = hubspot.properties;
  const incoming = payload.properties;

  const fields = [
    "orderwiseid",
    "domain",
    "phone",
    "address",
    "address2",
    "city",
    "zip",
    "state",
    "country",
  ];

  return fields.every((field) => {
    const hsVal = hs[field] || "";
    const newVal = incoming[field] || "";
    return String(hsVal).trim() === String(newVal).trim();
  });
}

/**
 * Compares payload properties against existing record properties.
 * Returns true if they are identical (idempotent).
 */
function isRecordUpToDate(payload, searchResult) {
  if (!searchResult || !payload?.properties) return false;

  const incoming = payload.properties;
  const existing = searchResult.properties || {};

  // Compare only the keys provided in the incoming payload
  return Object.keys(incoming).every((key) => {
    const incomingVal = incoming[key]?.toString().trim() || null;
    const existingVal = existing[key]?.toString().trim() || null;

    const isMatch = incomingVal === existingVal;

    // Optional: useful for debugging why idempotency failed
    if (!isMatch) {
      // logger.debug(`Diff found in ${key}: Payload(${incomingVal}) vs CRM(${existingVal})`);
    }

    return isMatch;
  });
}

// function mapActivitiesToHubspot(activity, contactId, companyId) {
function mapActivitiesToHubspot(
  activity,
  companyId,
  contactIds = [],
  customerRecord,
  contact,
  upsertedCompanyId
) {
  const start = activity?.startDateTime
    ? new Date(activity.startDateTime).getTime()
    : Date.now();

  // 1. DEFINE the variables first
  const isIncoming = activity?.name?.toLowerCase().includes("incoming");
  const emailDirection = isIncoming ? "INCOMING_EMAIL" : "FORWARDED_EMAIL";

  // 2. BUILD the associations array
  const associations = [
    {
      to: { id: String(companyId) },
      types: [
        { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 186 },
      ],
    },
    {
      to: { id: String(contact) },
      types: [
        { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 198 },
      ],
    },
  ];

  contactIds.forEach((contactId) => {
    associations.push({
      to: { id: String(contactId) },
      types: [
        { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 198 },
      ],
    });
  });

  // 3. RETURN the object using the defined variables
  return {
    // properties: {
    //   //  type: "EMAIL",
    //    type: activity?.type || "EMAIL",
    //   hs_timestamp: start,
    //   hs_email_subject: activity?.name || "Email Activity",
    //   hs_email_text: activity?.details || "",
    //   hs_email_direction: emailDirection, // Now this is defined!
    //   hs_email_status: "SENT",
    // },
    properties: {
      hs_timestamp: start,
      hs_email_subject: activity?.name,
      hs_email_text: activity?.details,
      hs_email_direction: emailDirection,
      hs_email_status: "SENT",
      // These are the proper v3 internal names for headers
      hs_email_headers: JSON.stringify({
        from: { email: customerRecord?.statementEmail || activity?.from },
        to: [{ email: contact?.email || contact?.name }],
      }),
    },

    associations,
  };
}

// function isLastAmendedDateTime(lastAmededDateTime, lastSyncDateTime) {
//   if (lastAmededDateTime > lastSyncDateTime) {
//     return true;
//   }
//   return false;
// }
// Mock storage - replace with localStorage.getItem/setItem if in a browser
let persistenceLayer = {
  lastSync: "2026-03-20T10:00:00Z",
};

/**
 * Gets the stored lastSync datetime
 */

const SYNC_FILE = path.join(__dirname, "sync_state.json");

/**
 * Gets lastSync from file; creates file with Epoch date if missing.
 */
function getLastSync() {
  try {
    // 1. If file does NOT exist → return yesterday's date
    if (!fs.existsSync(SYNC_FILE)) {
      const yesterday = new Date(Date.now() - 120 * 60 * 60 * 1000); // change this to 24 from  120 for 1 day old records
      return yesterday;
    }

    // 2. Read and parse the file
    const data = fs.readFileSync(SYNC_FILE, "utf8");
    const json = JSON.parse(data);

    return new Date(json.lastSync);
  } catch (error) {
    console.error("Error reading sync file, defaulting to yesterday:", error);

    // fallback → yesterday
    return new Date(Date.now() - 24 * 60 * 60 * 1000);
  }
}

/**
 * Saves a new timestamp to the JSON file
 */
function updateLastSync(newTimestamp = new Date()) {
  const isoString = newTimestamp.toISOString();
  saveToFile(isoString);
}

// Helper to handle the actual writing
function saveToFile(timestamp) {
  const data = JSON.stringify({ lastSync: timestamp }, null, 2);
  fs.writeFileSync(SYNC_FILE, data);
}

/**
 * Refactored: Checks if the record was amended after the last sync
 */
// function isLastAmended(lastAmended) {
//   const lastSync = getLastSync();
//   // Convert to Date objects to ensure valid comparison
//   return new Date(lastAmended) > new Date(lastSync);
// }

function isLastAmended(lastAmendedFromServer, lastSyncFromFile) {
  // const lastSyncFromFile = getLastSync();
  const amendedDate = new Date(lastAmendedFromServer);

  // If the server date is HIGHER (newer) than our last sync file, we need to update.
  return amendedDate > lastSyncFromFile;
}

export {
  getLastSync,
  updateLastSync,
  isLastAmended,
  isRecordUpToDate,
  cleanProps,
  companyPayload,
  mapContactsToHubspot,
  extractValidEmail,
  isCompanySame,
  mapActivitiesToHubspot,
};
