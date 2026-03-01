
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
function companyPayload(data = {}) {
  return {
    properties: {
      ivinex_id: data?.ID ?? "",
      firstname: data?.FirstName ?? "",
      lastname: data?.LastName ?? "",
      email: data?.Email ?? "",
      phone: data?.Phone ?? "",
    },
  };
}


function mapContactsToHubspot(contacts = []) {
  return contacts.map((c) => {
    const fullName =
      typeof c.name === "string" ? c.name.trim() : "";

    const nameParts = fullName.split(" ");

    return {
      properties: {
        orderwiseid: c?.id ?? "",
        firstname: nameParts[0] || "",
        lastname: nameParts.slice(1).join(" ") || "",
        phone:
          typeof c.telephone === "string"
            ? c.telephone.trim()
            : "",
        email: extractValidEmail(c?.email),
        company_orderwiseid: c?.companyId ?? "",
      },
    };
  });
}

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



export { cleanProps,companyPayload,mapContactsToHubspot,extractValidEmail };