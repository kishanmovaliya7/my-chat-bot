const { query } = require('../services/db');
const { AllColumns } = require('./TableDataController');
const { v4: uuidv4 } = require('uuid');

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

    // Serialize the reportMetadata object before inserting
    if (values.reportMetadata) {
        values.reportMetadata = JSON.stringify(values.reportMetadata);
    }

    try {
        const response = await query(sql, Object.values(values));
        return response;
    } catch (err) {
        return null;
    }
};

const updateValues = async (tableName, values, id) => {
    const columns = Object.keys(values).map(col => `\`${ col }\` = ?`).join(', ');

    const sql = `UPDATE ${ tableName } SET ${ columns } WHERE Id = ?`;

    const queryParams = [...Object.values(values), id];

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
        const Id = req?.params?.id;
        const tableName = 'SavedReport';

        // Flatten the values to match the columns in the database
        const flattenedValues = {
            isDeleted: true
        };
        await updateValues(tableName, flattenedValues, Id);

        res.status(200).json({ message: 'Report Deleted Successfully' });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const getSingleSavedReportController = async (req, res) => {
    try {
        const Id = req?.params?.id;
        const tableExists = await checkTableExists('SavedReport');

        if (tableExists) {
            const singleData = await query('SELECT * FROM SavedReport WHERE Id = ?', [Id]);
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

const saveConfirmtionSavedReportController = async (req, res) => {
    try {
        const Id = req?.params?.id;
        const tableExists = await checkTableExists('SavedReport');

        if (tableExists) {
            const flattenedValues = {
                isConfirm: true
            };
            await updateValues('SavedReport', flattenedValues, Id);
            res.status(200).json({ message: 'Set email confirmation' });
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
        const { fileName, reportType, period, Currency, Business, field, type, scheduler, emailLists, downloadFile, sqlQuery } = req.body;
        const defaultColumn = await AllColumns(reportType?.split(','));
        const tableName = 'SavedReport';

        const flattenedValues = {
            Id: uuidv4(),
            reportName: fileName,
            userEmail: 'test@gmail.com',
            createdAt: new Date(),
            isDeleted: false,
            reportMetadata: {
                tables: reportType,
                startDate: period ? period?.startDate : null,
                endDate: period ? period?.endDate : null,
                classOfBusiness: Business || null,
                originalCurrencyCode: Currency || null,
                field: field,
                scheduler: scheduler,
                emailLists: emailLists || null,
                isConfirm: false,
                downloadType: type,
                downloadFile: downloadFile,
                sqlQuery: sqlQuery,
                defaultColumns: defaultColumn
            }
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
        const Id = req?.params?.id;
        const { reportType, period, Currency, Business, field, type, scheduler, emailLists, downloadFile, sqlQuery } = req.body;
        const defaultColumn = await AllColumns(reportType?.split(','));
        const tableName = 'SavedReport';

        // Flatten the values to match the columns in the database
        const flattenedValues = {
            userEmail: 'test@gmail.com',
            createdAt: new Date(),
            isDeleted: false,
            reportMetadata: {
                tables: reportType,
                startDate: period ? period?.startDate : null,
                endDate: period ? period?.endDate : null,
                classOfBusiness: Business || null,
                originalCurrencyCode: Currency || null,
                field: field,
                scheduler: scheduler,
                emailLists: emailLists || null,
                isConfirm: false,
                downloadType: type,
                downloadFile: downloadFile,
                sqlQuery: sqlQuery,
                defaultColumns: defaultColumn
            }
        };

        // Serialize the reportMetadata object to store it as a JSON string
        if (flattenedValues.reportMetadata) {
            flattenedValues.reportMetadata = JSON.stringify(flattenedValues.reportMetadata);
        }

        await updateValues(tableName, flattenedValues, Id);

        res.status(200).json({ data: flattenedValues, message: 'Report Updated Successfully' });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

module.exports = { saveConfirmtionSavedReportController, getSavedReportController, getSingleSavedReportController, savedReportController, editReportController, deleteSavedReportController };
