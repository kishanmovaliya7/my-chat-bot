const { query } = require('../services/db');
const { deleteFileFromContainer } = require('./DownloadController');
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
        const tableExists = await checkTableExists('savedReports');

        if (tableExists) {
            const savedReportData = await query('SELECT * FROM savedReports WHERE isDeleted = 0 ORDER BY createdAt DESC');
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
        const tableName = 'savedReports';

        const existingRecord = await query('SELECT * FROM savedReports WHERE Id = ?', [Id]);

        if (!existingRecord || existingRecord.length === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }

        let reportMetadata = existingRecord[0]?.reportMetadata
            ? JSON.parse(existingRecord[0].reportMetadata)
            : {};

        if(reportMetadata.downloadFile) {
            await deleteFileFromContainer(reportMetadata.downloadFile.split(`${ process.env.STORAGE_BASE_URL }reports/`)[1])
        }
        // Flatten the values to match the columns in the database
        const flattenedValues = {
            isDeleted: true,
            reportMetadata: {...reportMetadata, downloadFile: null}
        };

        if (flattenedValues.reportMetadata) {
            flattenedValues.reportMetadata = JSON.stringify(flattenedValues.reportMetadata);
        }

        await updateValues(tableName, flattenedValues, Id);

        res.status(200).json({ message: 'Report Deleted Successfully' });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const getSingleSavedReportController = async (req, res) => {
    try {
        const Id = req?.params?.id;
        const tableExists = await checkTableExists('savedReports');

        if (tableExists) {
            const singleData = await query('SELECT * FROM savedReports WHERE Id = ?', [Id]);
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
        const tableExists = await checkTableExists('savedReports');

        if (tableExists) {
            const existingRecord = await query('SELECT * FROM savedReports WHERE Id = ?', [Id]);

            if (!existingRecord || existingRecord.length === 0) {
                return res.status(404).json({ message: 'Record not found' });
            }

            const reportMetadata = existingRecord[0]?.reportMetadata
                ? JSON.parse(existingRecord[0].reportMetadata)
                : {};

            reportMetadata.isConfirm = true;

            const flattenedValues = {
                reportMetadata: JSON.stringify(reportMetadata)
            };
            await updateValues('savedReports', flattenedValues, Id);
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
        const tableName = 'savedReports';

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
                downloadFile: downloadFile || null,
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
        const tableName = 'savedReports';

        const existingRecord = await query('SELECT * FROM savedReports WHERE Id = ?', [Id]);

        if (!existingRecord || existingRecord.length === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }

        let reportMetadata = existingRecord[0]?.reportMetadata
            ? JSON.parse(existingRecord[0].reportMetadata)
            : {};

        if(reportMetadata.downloadFile && downloadFile && reportMetadata.downloadFile !== downloadFile) {
            await deleteFileFromContainer(reportMetadata.downloadFile.split(`${ process.env.STORAGE_BASE_URL }reports/`)[1])
        }
        reportMetadata = {
            ...reportMetadata,
            tables: reportType || reportMetadata.tables,
            startDate: period?.startDate || reportMetadata.startDate || null,
            endDate: period?.endDate || reportMetadata.endDate || null,
            classOfBusiness: Business || reportMetadata.classOfBusiness || null,
            originalCurrencyCode: Currency || reportMetadata.originalCurrencyCode || null,
            field: field || reportMetadata.field,
            scheduler: scheduler || reportMetadata.scheduler,
            emailLists: emailLists || reportMetadata.emailLists || null,
            downloadType: type || reportMetadata.downloadType,
            downloadFile: downloadFile || reportMetadata.downloadFile || null,
            sqlQuery: sqlQuery || reportMetadata.sqlQuery,
            defaultColumns: defaultColumn || reportMetadata.defaultColumns
        };

        // Flatten the values to match the columns in the database
        const flattenedValues = {
            userEmail: 'test@gmail.com',
            createdAt: new Date(),
            isDeleted: false,
            reportMetadata: reportMetadata
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
