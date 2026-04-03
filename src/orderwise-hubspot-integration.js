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
  // ProcessCompanies([
  //   {
  //     id: 3610,
  //     accountNumber: "KG0001",
  //     statementName: "Kendon Watson Samples Account",
  //     statementAddress1: "S&E Caretrade",
  //     statementAddress2: "Elmfield House",
  //     statementAddress3: "Rathenraw Ind. Est.",
  //     statementTown: "Greystone Road",
  //     statementPostcode: "BT41 2SJ",
  //     statementCounty: "Antrim",
  //     statementCountry: "United Kingdom",
  //     statementEmail: null,
  //     statementWebsite: null,
  //     statementTelephone: null,
  //     statementFax: null,
  //     statementCountryCode: "GB",
  //     invoiceName: null,
  //     invoiceAddress1: null,
  //     invoiceAddress2: null,
  //     invoiceAddress3: null,
  //     invoiceTown: null,
  //     invoicePostcode: null,
  //     invoiceCounty: null,
  //     invoiceCountry: null,
  //     invoiceEmail: null,
  //     invoiceWebsite: null,
  //     invoiceTelephone: null,
  //     invoiceFax: null,
  //     invoiceCountryCode: null,
  //     vatNumber: null,
  //     defaultTaxCodeId: 2,
  //     overrideVariantTax: false,
  //     nominalCodeId: 6,
  //     departmentCodeId: 0,
  //     costCentreId: 0,
  //     currencyId: 1,
  //     defaultDeliveryMethodId: 1,
  //     defaultDeliveryGroupId: null,
  //     usePriceList: null,
  //     priceListId: 0,
  //     priceListDiscountPercent: 0,
  //     multisaverDiscountGroupId: null,
  //     discountStructureId: null,
  //     defaultStockLocationId: 1,
  //     accountCustomer: true,
  //     onHold: false,
  //     manualOnHold: false,
  //     overCreditTerms: false,
  //     creditLimit: 50000,
  //     openOrdersValue: 854.11,
  //     availableToSpend: 49145.89,
  //     balance: 0,
  //   },
  // ]);
  logger.info(`Server running on port ${PORT}`);
});

getCompanies();
