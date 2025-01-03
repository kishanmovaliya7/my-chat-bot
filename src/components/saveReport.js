const { query } = require('../services/db');

const checkTableExists = async (tableName) => {
    const sql = `PRAGMA table_info(${ tableName })`;
    try {
        const result = await query(sql);
        return result.length > 0;
    } catch (err) {
        console.error('Error checking table existence:', err);
        return false;
    }
};

const inferColumnType = (value) => {
    if (typeof value === 'string') {
        return 'TEXT';
    } else if (typeof value === 'number') {
        return 'INTEGER';
    } else if (typeof value === 'boolean') {
        return 'BOOLEAN';
    } else if (typeof value === 'object' && value !== null) {
        return 'TEXT';
    } else {
        return 'TEXT';
    }
};

const createTable = async (tableName, columns) => {
    // Serialize the reportFilter object to a JSON string
    if (columns.reportFilter) {
        columns.reportFilter = JSON.stringify(columns.reportFilter);
    }

    const columnsDefinition = Object.entries(columns)
        .map(([colName, colValue]) => `\`${ colName }\` ${ inferColumnType(colValue) }`)
        .join(', ');

    const sql = `CREATE TABLE IF NOT EXISTS ${ tableName } (${ columnsDefinition })`;

    try {
        await query(sql);
        await insertValues(tableName, columns);
        console.log(`Table ${ tableName } created successfully.`);
    } catch (err) {
        console.error('Error creating table:', err);
    }
};

const insertValues = async (tableName, values) => {
    const columns = Object.keys(values).map(col => `\`${ col }\``).join(', ');
    const placeholders = Object.keys(values).map(() => '?').join(', ');
    const sql = `INSERT INTO ${ tableName } (${ columns }) VALUES (${ placeholders })`;

    // Serialize the reportFilter object before inserting
    if (values.reportFilter) {
        values.reportFilter = JSON.stringify(values.reportFilter);
    }

    try {
        await query(sql, Object.values(values));
        console.log('Values inserted successfully.');
    } catch (err) {
        console.error('Error inserting values:', err);
    }
};

async function getSavedReport() {
    try {
        const tableInfo = await query('PRAGMA table_info(SavedReport)');

        if (tableInfo.length === 0) {
            return null;
        }

        const savedReportData = await query('SELECT * FROM SavedReport');

        // Deserialize reportFilter column if it exists
        savedReportData.forEach(row => {
            if (row.reportFilter) {
                row.reportFilter = JSON.parse(row.reportFilter);
            }
        });

        return savedReportData;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function getSingleSavedReport(selectedSavedReport) {
    try {
        const singleData = await query('SELECT * FROM SavedReport WHERE Name = ?', [selectedSavedReport]);

        return singleData;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function saveReport(context, filename, selectedValues) {
    const { reportType, period, riskCode, field } = selectedValues;
    const tableName = 'SavedReport';

    const flattenedValues = {
        Name: filename,
        reportName: reportType,
        email: 'test@gmail.com',
        reportFilter: {
            StartDate: period ? period?.startDate : null,
            EndDate: period ? period?.endDate : null,
            ClassOfBusiness: riskCode ? riskCode?.class_of_business : null,
            OriginalCurrencyCode: riskCode ? riskCode?.original_currency_code : null,
            Field: field
        },
        scheduler: '',
        isDeleted: false,
        emailLists: [],
        created_at: new Date()
    };

    const tableExists = await checkTableExists(tableName);

    if (!tableExists) {
        await createTable(tableName, flattenedValues);
    } else {
        await insertValues(tableName, flattenedValues);
    }

    await context.sendActivity(`${ filename } saved succesfully.`);
}
module.exports = { saveReport, getSavedReport, getSingleSavedReport };
