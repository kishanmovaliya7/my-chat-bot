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

const createTable = async (tableName, columns) => {
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

const getSavedReportController = async (req, res) => {
    try {
        const savedReportData = await query('SELECT * FROM SavedReport');
        res.status(200).json(savedReportData);
    } catch (error) {
        res.status(500).json(error.message);
    }
};

const getSingleSavedReportController = async (req, res) => {
    try {
        const Name = req?.params?.filename;
        const singleData = await query('SELECT * FROM SavedReport WHERE Name = ?', [Name]);
        res.status(200).json(singleData);
    } catch (error) {
        res.status(500).json(error.message);
    }
};

const savedReportController = async (req, res) => {
    try {
        const { fileName, reportType, period, Currency, Business, field, type, defaultColumn } = req.body;
        const tableName = 'SavedReport';

        const flattenedValues = {
            Name: `${ fileName }-${ Date.now() }`,
            reportName: reportType,
            email: 'test@gmail.com',
            reportFilter: {
                StartDate: period ? period?.startDate : null,
                EndDate: period ? period?.endDate : null,
                ClassOfBusiness: Business || null,
                OriginalCurrencyCode: Currency || null,
                Field: field
            },
            scheduler: '',
            isDeleted: false,
            emailLists: '',
            isConfirm: false,
            downloadType: type,
            defaultColumns: defaultColumn,
            created_at: new Date()
        };

        const tableExists = await checkTableExists(tableName);

        if (!tableExists) {
            await createTable(tableName, flattenedValues);
        } else {
            await insertValues(tableName, flattenedValues);
        }

        res.status(200).json('Report Saved Successfully');
    } catch (error) {
        res.status(500).json(error.message);
    }
};

// const editReportController = async (req, res) => {
//     try {
//         const { fileName, reportType, period, Currency, Business, field, type, defaultColumn } = req.body;
//         const tableName = 'SavedReport';

//         // Flatten the values to match the columns in the database
//         const flattenedValues = {
//             reportName: reportType,
//             email: 'test@gmail.com',
//             reportFilter: {
//                 StartDate: period ? period?.startDate : null,
//                 EndDate: period ? period?.endDate : null,
//                 ClassOfBusiness: Business || null,
//                 OriginalCurrencyCode: Currency || null,
//                 Field: field
//             },
//             scheduler: '',
//             isDeleted: false,
//             emailLists: '',
//             isConfirm: false,
//             downloadType: type,
//             defaultColumns: defaultColumn,
//             created_at: new Date()
//         };

//         // Serialize the reportFilter object to store it as a JSON string
//         if (flattenedValues.reportFilter) {
//             flattenedValues.reportFilter = JSON.stringify(flattenedValues.reportFilter);
//         }

//         await updateValues(tableName, flattenedValues, fileName);

//         res.status(200).json('Report Updated Successfully');
//     } catch (error) {
//         res.status(500).json(error.message);
//     }
// };

module.exports = { getSavedReportController, getSingleSavedReportController, savedReportController };
