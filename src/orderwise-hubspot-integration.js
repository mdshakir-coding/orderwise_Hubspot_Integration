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
      id: 4598,
      accountNumber: "COL003C",
      statementName: "Collegeview Nursing Home (CASH SALE)",
      statementAddress1: "Clones Road",
      statementAddress2: null,
      statementAddress3: null,
      statementTown: "Cavan",
      statementPostcode: "H12 ER27",
      statementCounty: "Cavan",
      statementCountry: "Ireland",
      statementEmail: "college.view@multiple.dext.cc",
      statementWebsite: null,
      statementTelephone: null,
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
      departmentCodeId: 1,
      costCentreId: 0,
      currencyId: 2,
      defaultDeliveryMethodId: 1,
      defaultDeliveryGroupId: null,
      usePriceList: null,
      priceListId: 507,
      priceListDiscountPercent: 0,
      multisaverDiscountGroupId: null,
      discountStructureId: null,
      defaultStockLocationId: 1,
      accountCustomer: true,
      onHold: true,
      manualOnHold: true,
      overCreditTerms: false,
      creditLimit: 50000,
      openOrdersValue: 0,
      availableToSpend: 50000,
      balance: 0,
    },
  ]);
  logger.info(`Server running on port ${PORT}`);
});
