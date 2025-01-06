const { query } = require('../services/db');
const { generateSQl } = require('./getTableDataFromQuery');

async function getReportData(selectedValues) {
    const { reportType, period, Business, riskCode, field } = selectedValues;

    const userMessage = `Create a join sql query using unique field from ${ reportType } tables ${ period?.startDate && `and Start_Date is ${ period?.startDate }` } ${ period?.endDate && `and end date is ${ period?.endDate }` } ${ (Business?.class_of_business || Business?.business) && `and Class_of_Business is ${ Business?.class_of_business || Business?.business }` } ${ (riskCode?.original_currency_code || riskCode?.currency) && `and Original_Currency_Code is ${ riskCode?.original_currency_code || riskCode?.currency }` }  and return only this ${ field }`;

    const sqlQuery = await generateSQl(userMessage);
    
    const response = await query(sqlQuery);

    return response;
}

module.exports = { getReportData };
