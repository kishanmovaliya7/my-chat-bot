const fs = require('fs');
const path = require('path');
const { getReportData } = require('./getReport');
const { jsPDF } = require('jspdf');
const { CardFactory } = require('botbuilder');
require('jspdf-autotable');

// // Function to create a unique file path in the 'public' folder
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

async function downloadPDFReport(context, selectedValues) {
    const ReportFromTable = await getReportData(selectedValues);
    console.log('selectedValues',selectedValues,ReportFromTable);
    
    
    try {  
        if(ReportFromTable?.length) {
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
            return fileName;
        } else {
            await context.sendActivity('No matching records found for your selected filter. Please adjust your filter criteria and try again!');
        }
    } catch (error) {
        await context.sendActivity('An error occurred while downloading the report: ' + error.message);
    }
}

module.exports = { downloadPDFReport };
