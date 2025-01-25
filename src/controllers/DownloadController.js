const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const ExcelJS = require('exceljs');
require('jspdf-autotable');
const { getReportData } = require('../components/getReport');

// Azure Blob Storage configuration
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME;

function getUniqueFilePath(basePath, fileName) {
    const ext = path.extname(fileName);
    const name = path.basename(fileName, ext);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Replace colons and dots with dashes
    const uniqueName = `${ name }_${ timestamp }${ ext }`;
    const uniquePath = path.join(basePath, uniqueName);

    return {
        filePath: uniquePath,
        fileName: path.basename(uniquePath)
    };
}


const PDFDownloadController = async (req, res) => {
    try {
        const { ReportFromTable, sqlQuery } = await getReportData(req.body);
        if (ReportFromTable?.length) {
            const doc = new jsPDF();

            // Prepare column headers and rows
            const columnHeaders = ReportFromTable?.length ? Object.keys(ReportFromTable[0]) : [];
            const tableData = ReportFromTable?.map(row =>
                columnHeaders.map(header => String(row[header] || ''))
            );
            doc.setFontSize(14);
            doc.text('Report', 10, 10);

            // Add table using autoTable
            doc.autoTable({
                styles: {
                    cellPadding: 0.5,
                    fontSize: 3
                },
                head: [columnHeaders],
                body: tableData,
                startY: 20,
                theme: 'grid'
            });

            // Convert PDF to buffer
            const pdfData = doc.output('arraybuffer');
            const pdfBuffer = Buffer.from(pdfData);

            if (!AZURE_STORAGE_CONNECTION_STRING || !CONTAINER_NAME) {
                throw new Error('Azure Storage connection details are missing in environment variables');
            }

            // Create blob service client
            const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
            const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

            // Generate unique file name
            const uniqueFileName = `report-${ uuidv4() }.pdf`;

            // Upload file to Azure Blob Storage
            const blockBlobClient = containerClient.getBlockBlobClient(uniqueFileName);
            await blockBlobClient.upload(pdfBuffer, pdfBuffer.length, {
                blobHTTPHeaders: { blobContentType: 'application/pdf' }
            });

            const downloadUrl = `${ process.env.BASE_URL }/api/download/${ uniqueFileName }`;

            res.status(200).json({ data: downloadUrl, sqlQuery: sqlQuery, message: 'Download URL generated successfully.' });
        } else {
            res.status(200).json({ message: 'No matching records found for your selected filter. Please adjust your filter criteria and try again!' });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const ExcelDownloadController = async (req, res) => {
    try {
        const { ReportFromTable, sqlQuery } = await getReportData(req.body);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Report');

        if (ReportFromTable?.length) {
            sheet.addRow(Object.keys(ReportFromTable[0]));

            ReportFromTable?.forEach((row) => {
                sheet.addRow(Object.values(row));
            });

            const publicDir = path.join(__dirname, '..', '..', 'public');
            if (!fs.existsSync(publicDir)) {
                fs.mkdirSync(publicDir);
            }

            const { filePath, fileName } = getUniqueFilePath(publicDir, 'report.xlsx');

            await workbook.xlsx.writeFile(filePath);

            const downloadUrl = `${ process.env.BASE_URL }/public/${ fileName }`;

            res.status(200).json({ data: downloadUrl, sqlQuery: sqlQuery, message: 'Download URL generated successfully.' });
        } else {
            res.status(200).json({ message: 'No matching records found for your selected filter. Please adjust your filter criteria and try again!' });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const downloadController = async (req, res) => {
    const fileName = req.params.filename;

    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        const blobClient = containerClient.getBlobClient(fileName);

        const exists = await blobClient.exists();
        if (!exists) {
            res.status(404).send('File not found.');
            return;
        }

        const downloadBlockBlobResponse = await blobClient.download();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${ fileName }`);

        downloadBlockBlobResponse.readableStreamBody.pipe(res);

        downloadBlockBlobResponse.readableStreamBody.on('end', () => {
            console.log('File successfully streamed.');
        });
    } catch (error) {
        console.error('Error downloading file:', error.message);
        res.status(500).send('Error downloading the file.');
    }
};

module.exports = { PDFDownloadController, ExcelDownloadController, downloadController };
