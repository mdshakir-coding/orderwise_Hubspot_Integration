import dotenv from "dotenv";
dotenv.config();
import app from "./utils/app.js";
import logger from "./config/logger.js";
// import "./jobs/cron.job.js";
import { syncContacts } from "./controller/contacts.js";

// logger.info("Loaded API Token:", process.env.HUBSPOT_ACCESS_TOKEN);
const PORT = process.env.PORT || 32100;

app.listen(PORT, () => {
  syncContacts([
    {
      id: 3345,
      accountNumber: "IWIL010",
      statementName: "William Wilson CWO",
      statementAddress1: "90 Nutfield Road",
      statementAddress2: "Drumcru",
      statementAddress3: "Lisnaskea",
      statementTown: "ENNISKILLEN",
      statementPostcode: "BT92 0QT",
      statementCounty: "Co Fermanagh",
      statementCountry: "United Kingdom",
      statementEmail: null,
      statementWebsite: "078 17253902",
      statementTelephone: null,
      statementFax: null,
      statementCountryCode: "GB",
      invoiceName: null,
      invoiceAddress1: null,
      invoiceAddress2: null,
      invoiceAddress3: null,
      invoiceTown: null,
      invoicePostcode: null,
      invoiceCounty: null,
      invoiceCountry: null,
      invoiceEmail: null,
      invoiceWebsite: null,
      invoiceTelephone: null,
      invoiceFax: null,
      invoiceCountryCode: null,
      vatNumber: null,
      defaultTaxCodeId: 2,
      overrideVariantTax: false,
      nominalCodeId: 6,
      departmentCodeId: 6,
      costCentreId: 0,
      currencyId: 1,
      defaultDeliveryMethodId: 28,
      defaultDeliveryGroupId: null,
      usePriceList: null,
      priceListId: 861,
      priceListDiscountPercent: 0,
      multisaverDiscountGroupId: null,
      discountStructureId: null,
      defaultStockLocationId: 12,
      accountCustomer: true,
      onHold: false,
      manualOnHold: false,
      overCreditTerms: false,
      creditLimit: 800,
      openOrdersValue: 0,
      availableToSpend: 800,
      balance: 0,
    },
  ]);
  logger.info(`Server running on port ${PORT}`);
});
