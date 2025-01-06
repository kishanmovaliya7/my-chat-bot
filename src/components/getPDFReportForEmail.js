const { jsPDF } = require('jspdf');
require('jspdf-autotable');

async function getPDFReportForEmail(selectedValues) {
    try {
        const doc = new jsPDF();

        const columnHeaders = Object.keys(selectedValues[0]);
        const tableData = selectedValues.map(row =>
            columnHeaders.map(header => String(row[header] || ''))
        );

        doc.setFontSize(14);
        doc.text('Report', 10, 10);

        doc.autoTable({
            styles: {
                cellPadding: 0.5,
                fontSize: 3,
            },
            head: [columnHeaders],
            body: tableData,
            startY: 20,
            theme: 'grid',
        });

        const pdfData = doc.output('arraybuffer');
        return Buffer.from(pdfData); 
    } catch (error) {
        console.error('An error occurred while generating the PDF report:', error);
        throw error;
    }
}

module.exports = { getPDFReportForEmail };
