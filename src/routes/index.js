const express = require('express');
const { PDFDownloadController, ExcelDownloadController } = require('../controllers/DownloadController');
const { getSavedReportController, getSingleSavedReportController, savedReportController, editReportController } = require('../controllers/SavedReportController');
const { getAllColumns, getCurrencyValue, getBusinessValue, getTableListController } = require('../controllers/TableDataController');

const router = express.Router();

router.get('/saved-report', getSavedReportController);
router.get('/saved-report/:filename', getSingleSavedReportController);

router.get('/data-tables', getTableListController);

router.get('/business', getBusinessValue);
router.get('/currency', getCurrencyValue);

router.get('/all-fields', getAllColumns);

router.post('/pdf', PDFDownloadController);
router.post('/excel', ExcelDownloadController);

router.post('/save-report', savedReportController);
router.post('/edit-report', editReportController);

module.exports = { router };
