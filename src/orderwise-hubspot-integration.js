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
      id: 2012,
      accountNumber: "A1A001",
      statementName: "Anchor Fixings Ltd",
      statementAddress1: "Rathenraw Ind Est ",
      statementAddress2: "Greystone Road",
      statementAddress3: "",
      statementTown: "Antrim",
      statementPostcode: "BT41 2SJ ",
      statementCounty: "Co Antrim",
      statementCountry: "",
      statementEmail: "accounts@anchorfixings.com",
      statementWebsite: "",
      statementTelephone: "028 9084 2373",
      statementFax: "028 9084 4311",
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
      departmentCodeId: 1,
      costCentreId: 0,
      currencyId: 1,
      defaultDeliveryMethodId: 1,
      defaultDeliveryGroupId: null,
      usePriceList: null,
      priceListId: 1463,
      priceListDiscountPercent: 0,
      multisaverDiscountGroupId: null,
      discountStructureId: null,
      defaultStockLocationId: 12,
      accountCustomer: true,
      onHold: false,
      manualOnHold: false,
      overCreditTerms: false,
      creditLimit: 50000,
      openOrdersValue: 0,
      availableToSpend: 50000,
      balance: 0,
    },
  ]);
  logger.info(`Server running on port ${PORT}`);
});
