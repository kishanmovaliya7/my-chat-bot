const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { getReportData } = require('./getReport');
const { CardFactory } = require('botbuilder');

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

async function downloadExcelReport(context, selectedValues) {
    try {
        const ReportFromTable = await getReportData(selectedValues);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Report');

        sheet.addRow(Object.keys(ReportFromTable[0]));

        ReportFromTable.forEach((row) => {
            const values = Object.values(row).map(value =>
                value === null || value === undefined ? '' : value
            );
            sheet.addRow(values);
        });

        const publicDir = path.join(__dirname, '..', '..', 'public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir);
        }

        const { filePath, fileName } = getUniqueFilePath(publicDir, 'report.xlsx');

        await workbook.xlsx.writeFile(filePath);

        const downloadUrl = `${ process.env.BASE_URL }/public/${ fileName }`;

        const buttons = [
            {
                type: 'openUrl',
                title: 'Download Report',
                value: downloadUrl
            }
        ];

        const heroCard = CardFactory.heroCard(
            '',
            undefined,
            buttons,
            { text: 'Your report is ready! \n\n Click the button below to download your report.' }
        );

        await context.sendActivity({
            type: 'message',
            attachments: [heroCard]
        });
    } catch (error) {
        await context.sendActivity('An error occurred while downloading the Excel report.');
    }
}

module.exports = { downloadExcelReport };
