const fs = require('fs');
const path = require('path');
const { getReportData } = require('./getReport');
const { query } = require('../services/db');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

async function getAllColumns() {
    try {
        const rawDetails = await query('PRAGMA table_info(rawDataTable)');
        const columnNames = rawDetails.map(column => column.name);
        return columnNames;
    } catch (error) {
        console.error('Error:', error);
    }
}

function getUniqueFilePath(basePath, fileName) {
    const ext = path.extname(fileName);
    const name = path.basename(fileName, ext);
    let uniquePath = path.join(basePath, fileName);
    let counter = 1;

    while (fs.existsSync(uniquePath)) {
        uniquePath = path.join(basePath, `${ name }(${ counter })${ ext }`);
        counter++;
    }

    return uniquePath;
}

async function downloadPDFReport(context, selectedValues) {
    const ReportFromTable = await getReportData(selectedValues);
    const allColumns = await getAllColumns();

    try {
        const doc = new jsPDF();

        // Prepare column headers and rows
        const columnHeaders = selectedValues.field === 'all' ? allColumns : selectedValues.field.split(',');
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

        // Save the PDF file
        const downloadsFolder = path.join(require('os').homedir(), 'Downloads');
        const filePath = getUniqueFilePath(downloadsFolder, 'report.pdf');
        const pdfData = doc.output('arraybuffer');
        fs.writeFileSync(filePath, Buffer.from(pdfData));

        await context.sendActivity('Report has been downloaded.');
    } catch (error) {
        await context.sendActivity('An error occurred while downloading the report.');
    }
}

module.exports = { downloadPDFReport };
