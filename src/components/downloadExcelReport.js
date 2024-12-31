const ExcelJS = require('exceljs');
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

async function downloadExcelReport(context, selectedValues) {
    try {
        const ReportFromTable = await getReportData(selectedValues);
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Report');

        sheet.addRow(Object.keys(ReportFromTable[0]));

        ReportFromTable.forEach((row) => {
            sheet.addRow(Object.values(row));
        });

        const downloadsFolder = path.join(require('os').homedir(), 'Downloads');
        const filePath = getUniqueFilePath(downloadsFolder, 'report.xlsx');

        await workbook.xlsx.writeFile(filePath);

        await context.sendActivity('The Excel report has been downloaded.');
    } catch (error) {
        await context.sendActivity('An error occurred while downloading the Excel report.');
    }
}

module.exports = { downloadExcelReport };
