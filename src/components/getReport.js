// const { query } = require('../services/db');
// const { generateSQl } = require('./getTableDataFromQuery');

// async function getReportData(selectedValues) {
//     const { reportType, period, Business, riskCode, field } = selectedValues;

//     const ReportLength = reportType?.split(',');
//     const userMessage = `Create a ${ReportLength > 1 ? 'join sql query using unique field from'+ reportType +'tables' : 'sql query from'+ reportType +'table'} ${ period?.startDate && `and Start_Date is ${ period?.startDate }` } ${ period?.endDate && `and Expiry_Date is ${ period?.endDate }` } ${ (Business?.class_of_business || Business?.business) && `and Class_of_Business is ${ Business?.class_of_business || Business?.business }` } ${ (riskCode?.original_currency_code || riskCode?.currency) && `and Original_Currency_Code is ${ riskCode?.original_currency_code || riskCode?.currency }` }.if coumn doesnt exist on table then ignor where clause for that field. Return only the following fields: ${field}`;

//     const sqlQuery = await generateSQl(userMessage);
//     console.log('sqlQuery----', sqlQuery);

//     const response = await query(sqlQuery);

//     return response;
// }

// module.exports = { getReportData };

const { query } = require('../services/db');
const { generateSQl } = require('./getTableDataFromQuery');

// Check if a column exists in a table in SQLite
async function checkColumnExists(tableName, columnName) {
    const columnCheckQuery = `PRAGMA table_info(${tableName})`;
    const result = await query(columnCheckQuery);
    
    // Check if the column exists in the table
    const columnExists = result.some(column => column.name === columnName);
    return columnExists;
}

async function getReportData(selectedValues) {
    const { reportType, period, Business, riskCode, field } = selectedValues;

    const ReportLength = reportType?.split(',')?.length;
    const userMessage = `Create a ${ReportLength > 1 ? 'join sql query using unique field from'+ reportType +'tables' : 'sql query from'+ reportType +'table'} and Include a WHERE clause with a ${ period?.startDate && `Start_Date greater then equal to ${ period?.startDate }` } ${ period?.endDate && `, end date less then equal to ${ period?.endDate }` } ${ (Business?.class_of_business || Business?.business) && `, Class_of_Business is ${ Business?.class_of_business || Business?.business }` } ${ (riskCode?.original_currency_code || riskCode?.currency) && `, Original_Currency_Code is ${ riskCode?.original_currency_code || riskCode?.currency }` }  and return only this ${ field } Ignore the filter columns are not a valid column. `;

    const sqlQuery = await generateSQl(userMessage);
    console.log('sqlQuery', sqlQuery);
    

    try {
        const response = await query(sqlQuery);
    
        return response;
    } catch(error) {
        
        console.log(error.code, error.message)
    } 
    
}

module.exports = { getReportData };
