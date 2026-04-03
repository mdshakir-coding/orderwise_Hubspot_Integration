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
  //     "id": 4337,
  //     "accountNumber": "RCV001",
  //     "statementName": "Richmond Care Villages",
  //     "statementAddress1": "Unit 5",
  //     "statementAddress2": "The Court",
  //     "statementAddress3": "Holywell Business Park",
  //     "statementTown": "Southam",
  //     "statementPostcode": "CV47 0FS",
  //     "statementCounty": "Warwickshire",
  //     "statementCountry": "United Kingdom",
  //     "statementEmail": null,
  //     "statementWebsite": null,
  //     "statementTelephone": "01926 679502",
  //     "statementFax": null,
  //     "statementCountryCode": "GB",
  //     "invoiceName": null,
  //     "invoiceAddress1": null,
  //     "invoiceAddress2": null,
  //     "invoiceAddress3": null,
  //     "invoiceTown": null,
  //     "invoicePostcode": null,
  //     "invoiceCounty": null,
  //     "invoiceCountry": null,
  //     "invoiceEmail": null,
  //     "invoiceWebsite": null,
  //     "invoiceTelephone": null,
  //     "invoiceFax": null,
  //     "invoiceCountryCode": null,
  //     "vatNumber": null,
  //     "defaultTaxCodeId": 2,
  //     "overrideVariantTax": false,
  //     "nominalCodeId": 6,
  //     "departmentCodeId": 4,
  //     "costCentreId": 0,
  //     "currencyId": 1,
  //     "defaultDeliveryMethodId": 47,
  //     "defaultDeliveryGroupId": 5,
  //     "usePriceList": null,
  //     "priceListId": null,
  //     "priceListDiscountPercent": 0,
  //     "multisaverDiscountGroupId": null,
  //     "discountStructureId": null,
  //     "defaultStockLocationId": 1,
  //     "accountCustomer": true,
  //     "onHold": true,
  //     "manualOnHold": true,
  //     "overCreditTerms": false,
  //     "creditLimit": 0,
  //     "openOrdersValue": 0,
  //     "availableToSpend": 0,
  //     "balance": 0
  //   }
  // ]);
  logger.info(`Server running on port ${PORT}`);
});

getCompanies();
