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
// function companyPayload(item = {}) {
//   let domain = null;

//   // 1. Get the actual CLEAN email from your updated function
//   const cleanEmail = extractValidEmailForDomain(item.statementEmail);

//   // 2. If a clean email was found, extract the domain
//   if (cleanEmail) {
//     const cleanDomain = cleanEmail.split("@")[1];

//     const freeDomains = [
//       "gmail.com",
//       "yahoo.com",
//       "hotmail.com",
//       "outlook.com",
//       "icloud.com",
//       "btinternet.com",
//       "live.com",
//       "aol.com",
//     ];

//     if (!freeDomains.includes(cleanDomain.toLowerCase())) {
//       domain = cleanDomain;
//     }
//   }

//   // 3. Build the base payload WITHOUT the domain property
//   const payload = {
//     properties: {
//       orderwiseid: item?.id || null,
//       name: item?.statementName || null,
//       phone: item?.statementTelephone || null,
//       address: item?.statementAddress1 || null,
//       address2: item?.statementAddress2 || null,
//       city: item?.statementTown || null,
//       country: item?.statementCounty || null,
//       state: item?.statementCountryCode || null,
//       zip: item?.statementPostcode || null,
//       // fax: item?.statementFax || null,
//     },
//   };

//   // 4. Conditionally add the domain ONLY if a valid one was approved
//   if (domain) {
//     payload.properties.domain = domain;
//   }

//   return payload;
// }
function companyPayload(item = {}) {
  let domain = null;

  const cleanEmail = extractValidEmailForDomain(item.statementEmail);

  if (cleanEmail && cleanEmail.includes("@")) {
    const parts = cleanEmail.split("@");
    const cleanDomain = parts[1]?.trim()?.toLowerCase();

    const freeDomains = new Set([
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "icloud.com",
      "btinternet.com",
      "live.com",
      "aol.com",
      "proton.me",
      "protonmail.com",
      "zoho.com",
    ]);

    if (
      cleanDomain &&
      cleanDomain.includes(".") &&
      !freeDomains.has(cleanDomain)
    ) {
      domain = cleanDomain;
    }
  }

  const payload = {
    properties: {
      orderwiseid: item?.id || null,
      name: item?.statementName || null,
      phone: item?.statementTelephone || null,
      address: item?.statementAddress1 || null,
      address2: item?.statementAddress2 || null,
      city: item?.statementTown || null,
      country: item?.statementCounty || null, // verify mapping
      state: item?.statementCountryCode || null, // verify mapping
      zip: item?.statementPostcode || null,
    },
  };

  if (domain) {
    payload.properties.domain = domain;
  }

  return payload;
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

function extractValidEmailForDomain(email) {
  if (!email) return "";

  // 1. Handle Arrays
  if (Array.isArray(email)) {
    email = email[0];
  }

  // 2. Handle Objects
  if (typeof email === "object") {
    email = email.value || email.email || "";
  }

  // 3. Type Safety
  if (typeof email !== "string") {
    return "";
  }

  // 4. Extract the first valid email found in the string
  // Added '+' to support emails like name+tag@domain.com
  const match = email.match(/[\w.+-]+@[\w.-]+\.\w+/);

  // FIX: If no match is found, return an empty string, NOT the original string.
  return match ? match[0] : "";
}
// contact payload mapping
function mapContactsToHubspot(c, item) {
  // Check if contact exists
  if (!c) return null;

  const nameParts = (c?.name || "").trim().split(" ");

  return {
    properties: {
      orderwiseid: c?.id ? String(c.id) : null, // Force string to avoid ID type mismatches
      firstname: nameParts[0] || null,
      lastname: nameParts.length > 1 ? nameParts.slice(1).join(" ") : null,
      phone: c?.telephone || null,
      email: extractValidEmail(c?.email) || null, // Ensure a fallback null
      company: c?.companyId || null,
      mobilephone: c?.mobile || null,
      fax: c?.fax || null,
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
    "name",
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
// function mapActivitiesToHubspot(
//   activity,
//   companyId,
//   contactIds = [],
//   contactId,
//   customerRecord,
//   contact
// ) {
//   const start = activity?.startDateTime
//     ? new Date(activity.startDateTime).getTime()
//     : Date.now();

//   // 1. DEFINE the variables first
//   const isIncoming = activity?.name?.toLowerCase().includes("incoming");
//   const emailDirection = isIncoming ? "INCOMING_EMAIL" : "FORWARDED_EMAIL";

//   // 2. BUILD the associations array
//   const associations = [
//     {
//       to: { id: String(companyId) },
//       types: [
//         { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 186 },
//       ],
//     },
//     {
//       to: { id: String(contactId) },
//       types: [
//         { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 198 },
//       ],
//     },
//   ];

//   contactIds.forEach((contactId) => {
//     associations.push({
//       to: { id: String(contactId) },
//       types: [
//         { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 198 },
//       ],
//     });
//   });

//   // 3. RETURN the object using the defined variables
//   return {
//     // properties: {
//     //   //  type: "EMAIL",
//     //    type: activity?.type || "EMAIL",
//     //   hs_timestamp: start,
//     //   hs_email_subject: activity?.name || "Email Activity",
//     //   hs_email_text: activity?.details || "",
//     //   hs_email_direction: emailDirection, // Now this is defined!
//     //   hs_email_status: "SENT",
//     // },
//     properties: {
//       hs_timestamp: start,
//       hs_email_subject: activity?.name,
//       hs_email_text: activity?.details,
//       hs_email_direction: emailDirection,
//       hs_email_status: "SENT",
//       // These are the proper v3 internal names for headers
//       hs_email_headers: JSON.stringify({
//         from: { email: customerRecord?.statementEmail || activity?.from },
//         to: [{ email: contact?.email || contact?.name }],
//       }),
//     },

//     associations,
//   };
// }
function mapActivitiesToHubspot(
  activity,
  companyId,
  contactIds = [],
  contactId,
  customerRecord,
  contact
) {
  const start = activity?.startDateTime
    ? new Date(activity.startDateTime).getTime()
    : Date.now();

  const isIncoming = activity?.name?.toLowerCase().includes("incoming");
  const emailDirection = isIncoming ? "INCOMING_EMAIL" : "FORWARDED_EMAIL";

  // 1. Prepare unique, valid Contact IDs
  // We combine the single contactId and the array, then filter out nulls/undefined/strings of "null"
  const rawContactIds = [contactId, ...contactIds];
  const validContactIds = [...new Set(rawContactIds)] // Remove duplicates
    .filter((id) => id && id !== "null" && id !== "undefined");

  const associations = [];

  // 2. Add Company Association (if valid)
  if (companyId && companyId !== "null") {
    associations.push({
      to: { id: String(companyId) },
      types: [
        { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 186 },
      ],
    });
  }

  // 3. Add Contact Associations
  validContactIds.forEach((id) => {
    associations.push({
      to: { id: String(id) },
      types: [
        { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 198 },
      ],
    });
  });

  // 4. Clean up Email Headers
  // Fallback to "noreply@domain.com" or similar if emails are missing to avoid "n/a"
  // const fromEmail =
  //   customerRecord?.statementEmail || activity?.from || "unknown@orderwise.com";
  // const toEmail = contact?.email || "unknown@orderwise.com";
  const fromEmail = contact?.email;
  const toEmail = customerRecord?.email;

  return {
    properties: {
      hs_timestamp: start,
      hs_email_subject: activity?.name || "Email Activity",
      hs_email_text: activity?.details || "",
      hs_email_direction: emailDirection,
      hs_email_status: "SENT",
      hs_email_headers: JSON.stringify({
        from: { email: fromEmail },
        to: [{ email: toEmail }],
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

function getCompanyDifferences(hubspot, payload) {
  const hs = hubspot.properties;
  const incoming = payload.properties;
  const differences = {};

  const fields = [
    "orderwiseid",
    "domain",
    "phone",
    "address",
    "address2",
    "city",
    "zip",
    "state",
    "name",
  ];

  fields.forEach((field) => {
    const hsVal = String(hs[field] || "").trim();
    const newVal = String(incoming[field] || "").trim();

    if (hsVal !== newVal) {
      differences[field] = {
        from: hsVal,
        to: newVal,
      };
    }
  });

  return differences;
}

export {
  getCompanyDifferences,
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
