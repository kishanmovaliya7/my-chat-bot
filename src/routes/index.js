const express = require('express');
const { PDFDownloadController, ExcelDownloadController } = require('../controllers/DownloadController');
const { getSavedReportController, getSingleSavedReportController, savedReportController, editReportController, deleteSavedReportController } = require('../controllers/SavedReportController');
const { getAllColumns, getCurrencyValue, getBusinessValue, getTableListController } = require('../controllers/TableDataController');
const { getQuestionsController } = require('../controllers/QuestionsController');

const router = express.Router();

router.post('/question', getQuestionsController);

router.get('/saved-report', getSavedReportController);
router.get('/saved-report/:filename', getSingleSavedReportController);

router.get('/data-tables', getTableListController);

router.get('/business', getBusinessValue);
router.get('/currency', getCurrencyValue);

router.get('/all-fields', getAllColumns);

router.post('/pdf', PDFDownloadController);
router.post('/excel', ExcelDownloadController);

router.post('/save-report', savedReportController);
router.post('/edit-report/:filename', editReportController);
router.delete('/delete-report/:filename', deleteSavedReportController);

module.exports = { router };
