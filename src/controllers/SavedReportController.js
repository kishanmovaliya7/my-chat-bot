const { SQLquery, runCronJobByFileName } = require('../services/dbConnect');
const { deleteFileFromContainer } = require('./DownloadController');

const insertValues = async (tableName, values) => {
    const columns = Object.keys(values).join(', ');
    const paramNames = Object.keys(values).map((key, index) => `@param${index}`).join(', ');

    const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${paramNames})`;

    try {
        await SQLquery(sql, values);
        const savedReportData = await SQLquery('SELECT * FROM config.botreportsData WHERE isDeleted = 0 ORDER BY createdAt DESC;');
        
        return savedReportData[0];
    } catch (err) {
        console.error("Insert Error:", err);
        return null;
    }
};

const updateValues = async (tableName, values, id) => {

    const filteredValues = Object.fromEntries(
        Object.entries(values).filter(([key]) => key.toLowerCase() !== 'id')
    );

    const columns = Object.keys(filteredValues)
        .map((key, index) => `${key} = @param${index}`)
        .join(', ');

    const sql = `UPDATE ${tableName} SET ${columns} WHERE Id = @param${Object.keys(filteredValues).length}`;

    const queryParams = Object.values(filteredValues).reduce((acc, value, index) => {
        acc[`@param${index}`] = value;
        return acc;
    }, {});

    queryParams[`@param${Object.keys(filteredValues).length}`] = id;

    try {
        return await SQLquery(sql, queryParams);
    } catch (err) {
        console.error("SQL Update Error:", err);
        return null;
    }
};

const getSavedReportController = async (req, res) => {
    try {
        const savedReportData = await SQLquery('SELECT * FROM config.botreportsData WHERE isDeleted = 0 ORDER BY updatedAt DESC;');
        if (savedReportData) {
            res.status(200).json({ data: savedReportData, message: 'Getting Report Data Successfully.' });
        } else {
            res.status(200).json({ data: [], message: 'Report Not Found' });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const deleteSavedReportController = async (req, res) => {
    try {
        const Id = req?.params?.id;
        const tableName = 'config.botreportsData';

        const existingRecord = await SQLquery(`SELECT * FROM config.botreportsData WHERE Id = ${Id}`);

        if (!existingRecord || existingRecord.length === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }

        let reportMetadata = existingRecord[0]

        if(reportMetadata.downloadFile) {
            await deleteFileFromContainer(reportMetadata.downloadFile.split(`${process.env.STORAGE_BASE_URL}/reports/`)[1])
        }

        // Flatten the values to match the columns in the database
        const flattenedValues = {
            ...reportMetadata,
            isDeleted: 1,
            downloadFile: null
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

        const singleData = await SQLquery(`SELECT * FROM config.botreportsData WHERE Id = ${Id}`);
        if (singleData) {
            res.status(200).json({ data: singleData });
        } else {
            res.status(200).json({ data: [], message: 'Report Not Found' });
        }

    } catch (error) {
        res.status(500).send(error.message);
    }
};

const saveConfirmtionSavedReportController = async (req, res) => {
    try {
        const Id = req?.params?.id;
        const tableName = 'config.botreportsData';
        const existingRecord = await SQLquery(`SELECT * FROM config.botreportsData WHERE Id = ${Id}`);

        if (!existingRecord || existingRecord.length === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }

        const reportMetadata = existingRecord[0]

        reportMetadata.isConfirm = 1;

        const flattenedValues = reportMetadata
        await updateValues(tableName, flattenedValues, Id);
        res.status(200).json({ message: 'Set email confirmation' });

    } catch (error) {
        res.status(500).send(error.message);
    }
};

const savedReportController = async (req, res) => {
    try {
        const { fileName, reportType, period, Currency, Business, field, type, scheduler, emailLists, downloadFile, sqlQuery } = req.body;
        const tableName = 'config.botreportsData';

        const flattenedValues = {
            reportName: fileName || "",
            userEmail: 'test@gmail.com',
            isDeleted: 0,
            table_list: reportType || "",
            startDate: period?.startDate ? period.startDate : null,
            endDate: period?.endDate ? period.endDate : null,
            classOfBusiness: Business || "",
            originalCurrencyCode: Currency || "",
            field: field || "",
            scheduler: scheduler || "",
            emailLists: emailLists || "",
            isConfirm: 0,
            downloadType: type || "",
            downloadFile: downloadFile || "",
            sqlQuery: sqlQuery || ""
        }
        const insertedValue = await insertValues(tableName, flattenedValues);

        res.status(200).json({ data: insertedValue, message: 'Report Saved Successfully' });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const editReportController = async (req, res) => {
    try {
        const Id = req?.params?.id;
        const { reportType, period, Currency, Business, field, type, scheduler, emailLists, downloadFile, sqlQuery } = req.body;

        const tableName = 'config.botreportsData';

        const existingRecord = await SQLquery(`SELECT * FROM config.botreportsData WHERE Id = ${Id}`);

        if (!existingRecord || existingRecord.length === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }

        let reportMetadata = existingRecord[0]

        if (reportMetadata.downloadFile && downloadFile && reportMetadata.downloadFile !== downloadFile) {
            await deleteFileFromContainer(reportMetadata.downloadFile.split(`${process.env.STORAGE_BASE_URL}/reports/`)[1])
        }

        // const flattenedValues = {
        //     userEmail: 'test@gmail.com',
        //     isDeleted: 0,
        //     table_list: reportType || reportMetadata.table_list,
        //     startDate: period?.startDate || reportMetadata.startDate || null,
        //     endDate: period?.endDate || reportMetadata.endDate || null,
        //     classOfBusiness: Business || reportMetadata.classOfBusiness || null,
        //     originalCurrencyCode: Currency || reportMetadata.originalCurrencyCode || null,
        //     field: field || reportMetadata.field,
        //     scheduler: scheduler || reportMetadata.scheduler,
        //     emailLists: emailLists || reportMetadata.emailLists || null,
        //     isConfirm: 0,
        //     downloadType: type || reportMetadata.downloadType,
        //     downloadFile: downloadFile || reportMetadata.downloadFile || null,
        //     sqlQuery: sqlQuery || reportMetadata.sqlQuery,
        // }

        const flattenedValues = {
            userEmail: 'test@gmail.com',
            isDeleted: 0 || reportMetadata.isDeleted,
            table_list: reportType,
            startDate: period?.startDate || null,
            endDate: period?.endDate || null,
            classOfBusiness: Business || null,
            originalCurrencyCode: Currency || null,
            field: field,
            scheduler: scheduler,
            emailLists: emailLists || null,
            isConfirm: 0 || reportMetadata.isConfirm,
            downloadType: type,
            downloadFile: downloadFile || null,
            sqlQuery: sqlQuery,
        }

        await updateValues(tableName, flattenedValues, Id);
        await runCronJobByFileName(existingRecord[0]?.reportName);

        res.status(200).json({ data: flattenedValues, message: 'Report Updated Successfully' });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

module.exports = { saveConfirmtionSavedReportController, getSavedReportController, getSingleSavedReportController, savedReportController, editReportController, deleteSavedReportController };
