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
    // if (columns.reportFilter) {
    //     columns.reportFilter = JSON.stringify(columns.reportFilter);
    // }

    const columnsDefinition = Object.entries(columns)
        .map(([colName, colValue]) => `\`${ colName }\` ${ inferColumnType(colValue) }`)
        .join(', ');

    const sql = `CREATE TABLE ${ tableName } (${ columnsDefinition })`;

    try {
        await query(sql);
        return await insertValues(tableName, columns);
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
        const response = await query(sql, Object.values(values));
        return response;
    } catch (err) {
        return null;
    }
};

const updateValues = async (tableName, values, filename) => {
    const columns = Object.keys(values).map(col => `\`${ col }\` = ?`).join(', ');

    const sql = `UPDATE ${ tableName } SET ${ columns } WHERE Name = ?`;

    const queryParams = [...Object.values(values), filename];

    try {
        return await query(sql, queryParams);
    } catch (err) {
        return null
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
        return null;
    }
}

async function editReport(context, filename, selectedValues) {
    const { reportType, period, riskCode, Business, field } = selectedValues;
    const tableName = 'SavedReport';

    // Flatten the values to match the columns in the database
    const flattenedValues = {
        reportName: reportType,
        email: 'test@gmail.com',
        reportFilter: {
            StartDate: period ? period.startDate : null,
            EndDate: period ? period.endDate : null,
            ClassOfBusiness: Business ? Business?.class_of_business || Business?.business : null,
            OriginalCurrencyCode: riskCode ? riskCode.original_currency_code || riskCode.currency : null,
            Field: field
        },
        scheduler: '',
        isDeleted: false,
        isConfirm: false,
        emailLists: "",
        created_at: new Date()
    };

    // Serialize the reportFilter object to store it as a JSON string
    if (flattenedValues.reportFilter) {
        flattenedValues.reportFilter = JSON.stringify(flattenedValues.reportFilter);
    }

    // Update the values in the database
    await updateValues(tableName, flattenedValues, filename);

    // Send a success message to the user
    await context.sendActivity(`${ filename } edited successfully.`);
}

async function saveReport(context, filename, selectedValues) {
    const { reportType, period, riskCode, Business, field, type, defaultColumn } = selectedValues;

    const tableName = 'SavedReport';

    const flattenedValues = {
        Name: filename,
        reportName: reportType,
        email: 'test@gmail.com',
        reportFilter: {
            StartDate: period ? period?.startDate : null,
            EndDate: period ? period?.endDate : null,
            ClassOfBusiness: Business ? Business?.class_of_business || Business?.business : null,
            OriginalCurrencyCode: riskCode ? riskCode?.original_currency_code || riskCode.currency : null,
            Field: field
        },
        scheduler: '',
        isDeleted: false,
        emailLists: "",
        isConfirm: false,
        downloadType: type,
        defaultColumns: defaultColumn,
        created_at: new Date()
    };

    const tableExists = await checkTableExists(tableName);

    if (!tableExists) {
        return await createTable(tableName, flattenedValues);
    } else {
        return await insertValues(tableName, flattenedValues);
    }
}

const updateReport = async (filename, field) => {
    const response = await query(`update SavedReport set ${field} where Name = "${filename}"`)
    return response 
}
module.exports = { saveReport, getSavedReport, getSingleSavedReport, editReport, updateReport };
