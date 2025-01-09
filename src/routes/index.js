const express = require('express');
const { query } = require('../services/db');
const { PDFDownloadController, ExcelDownloadController } = require('../controllers/DownloadController');
const { getSavedReportController, getSingleSavedReportController, savedReportController } = require('../controllers/SavedReportController');

const router = express.Router();

router.get('/savedReport', getSavedReportController);

router.get('/savedReport/:filename', getSingleSavedReportController);

router.get('/business', async (req, res) => {
    try {
        const businessColumnValues = await query('SELECT DISTINCT "Class_of_business" FROM Policy');
        const classOfBusinessArray = businessColumnValues.map(row => row.Class_of_Business);

        res.status(200).json(classOfBusinessArray);
    } catch (error) {
        res.status(500).json(error.message);
    }
});

router.get('/currency', async (req, res) => {
    try {
        const originalCurrencyCodeValues = await query('SELECT DISTINCT "Original_Currency_Code" FROM Policy');
        const originalCurrencyCodeArray = originalCurrencyCodeValues.map(row => row.Original_Currency_Code);

        res.status(200).json(originalCurrencyCodeArray);
    } catch (error) {
        res.status(500).json(error.message);
    }
});

router.get('/all-fields', async (req, res) => {
    try {
        let columnNames = [];
        const listOfTables = req?.query?.table.split(',');

        if (listOfTables?.length) {
            for (const table of listOfTables) {
                const rawDetails = await query(`PRAGMA table_info(${ table.trim() })`);
                columnNames = [...columnNames, ...rawDetails.map(column => `${ table }.'${ column.name }'`)];
            }
        }
        res.status(200).json(columnNames);
    } catch (error) {
        res.status(500).json(error.message);
    }
});

router.post('/pdf', PDFDownloadController);
router.post('/excel', ExcelDownloadController);

router.post('/saved-report', savedReportController);
// router.post('/edit-report', editReportController);

module.exports = { router };
