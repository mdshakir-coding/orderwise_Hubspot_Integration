import dotenv from "dotenv";
dotenv.config();
import app from "./utils/app.js";
import logger from "./config/logger.js";
// import "./jobs/cron.job.js";
import { getCompanies } from "./services/orderwise.service.js";
import { ProcessCompanies } from "./controller/contacts.js";

// logger.info("Loaded API Token:", process.env.HUBSPOT_ACCESS_TOKEN);
const PORT = process.env.PORT || 32100;

app.listen(PORT, () => {
  ProcessCompanies([
    {
      id: 2849,
      accountNumber: "SUN003",
      statementName: "Suncroft Lodge Nursing Home",
      statementAddress1: "Costern Unlimited Company T/A Trinity Care",
      statementAddress2: "",
      statementAddress3: null,
      statementTown: "The Curragh",
      statementPostcode: "R56 HX05",
      statementCounty: "Co. Kildare",
      statementCountry: "Ireland",
      statementEmail: "suncroftlodge@trinitycare.ie",
      statementWebsite: "",
      statementTelephone: "00353 45442951",
      statementFax: "00353 45 442952",
      statementCountryCode: "IE",
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
      defaultTaxCodeId: 5,
      overrideVariantTax: true,
      nominalCodeId: 6,
      departmentCodeId: 1,
      costCentreId: 0,
      currencyId: 2,
      defaultDeliveryMethodId: 1,
      defaultDeliveryGroupId: null,
      usePriceList: null,
      priceListId: 705,
      priceListDiscountPercent: 0,
      multisaverDiscountGroupId: null,
      discountStructureId: null,
      defaultStockLocationId: 1,
      accountCustomer: true,
      onHold: false,
      manualOnHold: false,
      overCreditTerms: false,
      creditLimit: 200000,
      openOrdersValue: 0,
      availableToSpend: 119107.16,
      balance: 80892.84,
    },
  ]);
  logger.info(`Server running on port ${PORT}`);
});

// getCompanies();
