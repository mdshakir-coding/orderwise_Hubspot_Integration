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
      id: 2304,
      accountNumber: "ICUR002",
      statementName: "Robert Currie (Headwood Farm)",
      statementAddress1: "192 Lower Ballyboley Road",
      statementAddress2: "",
      statementAddress3: null,
      statementTown: "LARNE",
      statementPostcode: "BT40 2PR",
      statementCounty: "Co Antrim",
      statementCountry: null,
      statementEmail: "",
      statementWebsite: "07869 130359",
      statementTelephone: "",
      statementFax: "",
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
      priceListId: 0,
      priceListDiscountPercent: 0,
      multisaverDiscountGroupId: null,
      discountStructureId: null,
      defaultStockLocationId: 12,
      accountCustomer: true,
      onHold: false,
      manualOnHold: false,
      overCreditTerms: false,
      creditLimit: 700,
      openOrdersValue: 0,
      availableToSpend: 700,
      balance: 0,
    },
  ]);
  logger.info(`Server running on port ${PORT}`);
});
