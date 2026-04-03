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
      id: 4794,
      accountNumber: "CAR030",
      statementName: "Sonas Carrick-On-Suir Nursing Home",
      statementAddress1: "Carrickbeg",
      statementAddress2: null,
      statementAddress3: null,
      statementTown: "Carrick-On-Suir",
      statementPostcode: "E32 D681",
      statementCounty: "Co. Tipperary",
      statementCountry: "Ireland",
      statementEmail: "dkeigher@sonas.ie",
      statementWebsite: null,
      statementTelephone: "00353 51 514 000",
      statementFax: null,
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
      defaultTaxCodeId: 7,
      overrideVariantTax: true,
      nominalCodeId: 6,
      departmentCodeId: 4,
      costCentreId: 0,
      currencyId: 2,
      defaultDeliveryMethodId: 1,
      defaultDeliveryGroupId: null,
      usePriceList: null,
      priceListId: 1785,
      priceListDiscountPercent: 0,
      multisaverDiscountGroupId: null,
      discountStructureId: null,
      defaultStockLocationId: 1,
      accountCustomer: true,
      onHold: true,
      manualOnHold: true,
      overCreditTerms: false,
      creditLimit: 0,
      openOrdersValue: 267.61,
      availableToSpend: -267.61,
      balance: 0,
    },
  ]);
  logger.info(`Server running on port ${PORT}`);
});

// getCompanies();
