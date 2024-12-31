const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');
const { getReportData } = require('./getReport');

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

    try {
        const doc = new jsPDF();

        // Set initial position
        const x = 10;
        let y = 20;

        // Calculate the maximum width for each column based on the data
        const columnHeaders = selectedValues.field === 'all' ? ['Policy Reference', 'Original Insured', 'Territory', 'Insured', 'Start Date', 'Expiry Date', 'Class of Business', 'Original Currency Code', 'Exchange Rate', 'Limit of Liability', '100% Gross Premium', 'Signed Line', 'Gross Premium Paid this Time', 'Gross Premium Paid this Time in Settlement Currency', 'Commission Percentage', 'Commission Amount in Original Currency', 'Commission Amount in Settlement Currency', 'Brokerage Percentage', 'Brokerage in Original Currency', 'Brokerage in Settlement Currency', 'Final Net Premium in Original Currency', 'Final Net Premium in Settlement Currency', 'Agreement Reference', 'Settlement Currency Code', 'Org or Personal', 'Insurer', 'Period', 'Year'] : selectedValues.field.split(',');
        const maxWidths = columnHeaders.map(header => {
            return Math.max(...ReportFromTable.map(row => doc.getTextWidth(String(row[header]))));
        });

        // Add Title
        doc.setFontSize(14);
        doc.text('Report', x, y);
        y += 10;

        // Set font size for the table headers
        doc.setFontSize(12);
        columnHeaders.forEach((header, i) => {
            doc.text(header, x + (i === 0 ? 0 : maxWidths.slice(0, i).reduce((acc, width) => acc + width + 10, 0)), y);
        });
        y += 10;

        // Add table rows
        ReportFromTable.forEach((row) => {
            columnHeaders.forEach((header, i) => {
                doc.text(String(row[header]), x + (i === 0 ? 0 : maxWidths.slice(0, i).reduce((acc, width) => acc + width + 10, 0)), y);
            });
            y += 10;
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
