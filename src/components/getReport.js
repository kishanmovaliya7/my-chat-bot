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
    const ReportLength = reportType?.split(',');

    // Check if Start_Date exists in each table
    const whereClauses = [];

    if (period?.startDate) {
        if (ReportLength.length > 1) {
            for (const table of ReportLength) {
                const columnExists = await checkColumnExists(table, 'Start_Date');
                if (columnExists) {
                    whereClauses.push(`and Start_Date = '${ period.startDate }'`);
                }
            }
        } else {
            const columnExists = await checkColumnExists(reportType, 'Start_Date');
            if (columnExists) {
                whereClauses.push(`and Start_Date = '${ period.startDate }'`);
            }
        }
    }

    if (period?.endDate) {
        if (ReportLength.length > 1) {
            for (const table of ReportLength) {
                const columnExists = await checkColumnExists(table, 'Expiry_Date');
                if (columnExists) {
                    whereClauses.push(`and Expiry_Date = '${ period.endDate }'`);
                }
            }
        } else {
            const columnExists = await checkColumnExists(reportType, 'Expiry_Date');
            if (columnExists) {
                whereClauses.push(`and Expiry_Date = '${ period.endDate }'`);
            }
        }
    }

    if (Business?.class_of_business || Business?.business) {
        if (ReportLength.length > 1) {
            for (const table of ReportLength) {
                const columnExists = await checkColumnExists(table, 'Class_of_Business');
                if (columnExists) {
                    whereClauses.push(`and Class_of_Business = '${ Business.class_of_business || Business.business }'`);
                }
            }
        } else {
            const columnExists = await checkColumnExists(reportType, 'Class_of_Business');
            if (columnExists) {
                whereClauses.push(`and Class_of_Business = '${ Business.class_of_business || Business.business }'`);
            }
        }
    }

    if (riskCode?.original_currency_code || riskCode?.currency) {
        if (ReportLength.length > 1) {
            for (const table of ReportLength) {
                const columnExists = await checkColumnExists(table, 'Original_Currency_Code');
                if (columnExists) {
                    whereClauses.push(`and Original_Currency_Code = '${ riskCode.original_currency_code || riskCode.currency }'`);
                }
            }
        } else {
            const columnExists = await checkColumnExists(reportType, 'Original_Currency_Code');
            if (columnExists) {
                whereClauses.push(`and Original_Currency_Code = '${ riskCode.original_currency_code || riskCode.currency }'`);
            }
        }
    }

    // Construct the message
    const userMessage = `Create a ${ ReportLength.length > 1 ? 'join sql query using unique field from ' + reportType + ' tables' : 'sql query from ' + reportType + ' table' } ${ whereClauses.join(' ') }. Return only the following fields: ${ field }`;

    const sqlQuery = await generateSQl(userMessage);
    const response = await query(sqlQuery);

    return response;
}

module.exports = { getReportData };
