const { query } = require('../services/db');
const { AllColumns } = require('./TableDataController');

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

const updateValues = async (tableName, values, filename) => {
    const columns = Object.keys(values).map(col => `\`${ col }\` = ?`).join(', ');

    const sql = `UPDATE ${ tableName } SET ${ columns } WHERE Name = ?`;

    const queryParams = [...Object.values(values), filename];

    try {
        return await query(sql, queryParams);
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
        const tableExists = await checkTableExists('SavedReport');

        if (tableExists) {
            const savedReportData = await query('SELECT * FROM SavedReport WHERE isDeleted = 0');
            if (savedReportData) {
                res.status(200).json({ data: savedReportData, message: 'Report Generated Successfully.' });
            } else {
                res.status(200).json({ data: [], message: 'Report Not Found' });
            }
        } else {
            res.status(200).json({
                data: [],
                message: 'Table Not Exist.'
            });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const deleteSavedReportController = async (req, res) => {
    try {
        const fileName = req?.params?.filename;
        const tableName = 'SavedReport';

        // Flatten the values to match the columns in the database
        const flattenedValues = {
            isDeleted: true
        };
        await updateValues(tableName, flattenedValues, fileName);

        res.status(200).json({ message: 'Report Deleted Successfully' });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const getSingleSavedReportController = async (req, res) => {
    try {
        const Name = req?.params?.filename;
        const tableExists = await checkTableExists('SavedReport');

        if (tableExists) {
            const singleData = await query('SELECT * FROM SavedReport WHERE Name = ?', [Name]);
            if (singleData) {
                res.status(200).json({ data: singleData });
            } else {
                res.status(200).json({ data: [], message: 'Report Not Found' });
            }
        } else {
            res.status(200).json({
                message: 'Table Not Exist.'
            });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const savedReportController = async (req, res) => {
    try {
        const { fileName, reportType, period, Currency, Business, field, type, scheduler, emailLists } = req.body;
        const defaultColumn = await AllColumns(reportType?.split(','));
        const tableName = 'SavedReport';

        const flattenedValues = {
            Name: fileName,
            reportName: reportType,
            email: 'test@gmail.com',
            reportFilter: {
                StartDate: period ? period?.startDate : null,
                EndDate: period ? period?.endDate : null,
                ClassOfBusiness: Business || null,
                OriginalCurrencyCode: Currency || null,
                Field: field
            },
            scheduler: scheduler,
            isDeleted: false,
            emailLists: emailLists,
            isConfirm: false,
            downloadType: type,
            defaultColumns: JSON.stringify(defaultColumn),
            created_at: new Date()
        };

        const tableExists = await checkTableExists(tableName);

        if (!tableExists) {
            await createTable(tableName, flattenedValues);
        } else {
            await insertValues(tableName, flattenedValues);
        }

        res.status(200).json({ data: flattenedValues, message: 'Report Saved Successfully' });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const editReportController = async (req, res) => {
    try {
        const { fileName, reportType, period, Currency, Business, field, type, scheduler, emailLists } = req.body;
        const defaultColumn = await AllColumns(reportType?.split(','));
        const tableName = 'SavedReport';

        // Flatten the values to match the columns in the database
        const flattenedValues = {
            reportName: reportType,
            email: 'test@gmail.com',
            reportFilter: {
                StartDate: period ? period?.startDate : null,
                EndDate: period ? period?.endDate : null,
                ClassOfBusiness: Business || null,
                OriginalCurrencyCode: Currency || null,
                Field: field
            },
            scheduler: scheduler,
            isDeleted: false,
            emailLists: emailLists,
            isConfirm: false,
            downloadType: type,
            defaultColumns: JSON.stringify(defaultColumn)
        };

        // Serialize the reportFilter object to store it as a JSON string
        if (flattenedValues.reportFilter) {
            flattenedValues.reportFilter = JSON.stringify(flattenedValues.reportFilter);
        }

        await updateValues(tableName, flattenedValues, fileName);

        res.status(200).json({ data: flattenedValues, message: 'Report Updated Successfully' });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

module.exports = { getSavedReportController, getSingleSavedReportController, savedReportController, editReportController, deleteSavedReportController };
