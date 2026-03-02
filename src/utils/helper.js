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


// conatct payload mapping (if needed in the future)
// function mapContactsToHubspot(contacts = []) {
//   return contacts.map((c) => {
//     const fullName = typeof c.name === "string" ? c.name.trim() : "";

//     const nameParts = fullName.split(" ");

//     return {
//       properties: {
//         orderwiseid: c?.id || null,
//         firstname: nameParts[0] || null,
//         lastname: nameParts.slice(1).join(" ") || null,
//         phone: typeof c.telephone === "string" ? c.telephone.trim() : null,
//         email: extractValidEmail(c?.email),
//         company_orderwiseid: c?.companyId ?? null,
//       },
//     };
//   });
// }


// utils/helper.js
function mapContactsToHubspot(c,comapny) {
  // Check if contact exists
  if (!c) return null;

  // const fullName = typeof c.name === "string" ? c.name.trim() : "";
  // const nameParts = fullName.split(" ");

  return {
    properties: {
      orderwiseid: c?.id || null,
       firstname: c?.name || null,
      lastname: c?.name ||null,
       phone: c?.telephone || null,
      email: extractValidEmail(c?.email),
      company_orderwiseid: comapny?.id || null,
    },
  };

}





export { cleanProps, companyPayload, mapContactsToHubspot, extractValidEmail };
