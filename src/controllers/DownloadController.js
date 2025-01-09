const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const ExcelJS = require('exceljs');
require('jspdf-autotable');
const { getReportData } = require('../components/getReport');

function getUniqueFilePath(basePath, fileName) {
    const ext = path.extname(fileName);
    const name = path.basename(fileName, ext);
    let uniquePath = path.join(basePath, fileName);
    let counter = 1;

    while (fs.existsSync(uniquePath)) {
        uniquePath = path.join(basePath, `${ name }(${ counter })${ ext }`);
        counter++;
    }

    return {
        filePath: uniquePath,
        fileName: path.basename(uniquePath)
    };
}

const PDFDownloadController = async (req, res) => {
    try {
        const ReportFromTable = await getReportData(req.body);
        if (ReportFromTable?.length) {
            const doc = new jsPDF();

            // Prepare column headers and rows
            const columnHeaders = ReportFromTable.length ? Object.keys(ReportFromTable[0]) : [];
            const tableData = ReportFromTable.map(row =>
                columnHeaders.map(header => String(row[header] || ''))
            );
            // Add Title
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

            const publicDir = path.join(__dirname, '..', '..', 'public');
            if (!fs.existsSync(publicDir)) {
                fs.mkdirSync(publicDir);
            }
            const { filePath, fileName } = getUniqueFilePath(publicDir, 'report.pdf');

            const pdfData = doc.output('arraybuffer');
            fs.writeFileSync(filePath, Buffer.from(pdfData));

            const downloadUrl = `${ process.env.BASE_URL }/public/${ fileName }`;

            res.status(200).json({ data: downloadUrl, message: 'Download URL generated successfully.' });
        } else {
            res.status(500).json({ message: 'No matching records found for your selected filter. Please adjust your filter criteria and try again!' });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const ExcelDownloadController = async (req, res) => {
    try {
        const ReportFromTable = await getReportData(req.body);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Report');

        if (ReportFromTable.length) {
            sheet.addRow(Object.keys(ReportFromTable[0]));

            ReportFromTable.forEach((row) => {
                sheet.addRow(Object.values(row));
            });

            const publicDir = path.join(__dirname, '..', '..', 'public');
            if (!fs.existsSync(publicDir)) {
                fs.mkdirSync(publicDir);
            }

            const { filePath, fileName } = getUniqueFilePath(publicDir, 'report.xlsx');

            await workbook.xlsx.writeFile(filePath);

            const downloadUrl = `${ process.env.BASE_URL }/public/${ fileName }`;

            res.status(200).json({ data: downloadUrl, message: 'Download URL generated successfully.' });
        } else {
            res.status(200).json({ message: 'No matching records found for your selected filter. Please adjust your filter criteria and try again!' });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};

module.exports = { PDFDownloadController, ExcelDownloadController };
