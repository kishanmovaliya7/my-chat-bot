const express = require('express');
const { PDFDownloadController, ExcelDownloadController, downloadController } = require('../controllers/DownloadController');
const { getSavedReportController, getSingleSavedReportController, savedReportController, editReportController, deleteSavedReportController, saveConfirmtionSavedReportController } = require('../controllers/SavedReportController');
const { getAllColumns, getCurrencyValue, getBusinessValue, getTableListController } = require('../controllers/TableDataController');
const { getQuestionsController } = require('../controllers/QuestionsController');

const router = express.Router();

router.post('/question', getQuestionsController);

router.get('/saved-report', getSavedReportController);
router.get('/saved-report/:id', getSingleSavedReportController);
router.put('/save-confirmtion-of-schedule/:id', saveConfirmtionSavedReportController);

router.get('/data-tables', getTableListController); // done

router.get('/business', getBusinessValue); // done
router.get('/currency', getCurrencyValue); // done

router.get('/all-fields', getAllColumns); // done

router.post('/pdf', PDFDownloadController); // working
router.post('/excel', ExcelDownloadController);
router.get('/download/:filename', downloadController);

router.post('/save-report', savedReportController);
router.post('/edit-report/:id', editReportController);
router.delete('/delete-report/:id', deleteSavedReportController);

module.exports = { router };
