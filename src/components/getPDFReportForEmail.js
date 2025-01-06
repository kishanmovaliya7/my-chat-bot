const { jsPDF } = require("jspdf");
require("jspdf-autotable");

async function getPDFReportForEmail(selectedValues, defaultHeader) {
  try {
    const doc = new jsPDF();
    
    if (!selectedValues || selectedValues.length === 0) {
      doc.setFontSize(14);
      doc.setFontSize(14);
      doc.text("Report", 10, 10);

      doc.autoTable({
        styles: {
          cellPadding: 0.5,
          fontSize: 3,
        },
        head: [defaultHeader],
        body: [],
        startY: 20,
        theme: "grid",
      });
    } else {
      const columnHeaders = Object.keys(selectedValues[0]);
      const tableData = selectedValues.map((row) =>
        columnHeaders.map((header) => {
          const value = row[header];
          return value !== undefined && value !== null ? String(value) : "null";
        })
      );

      doc.setFontSize(14);
      doc.text("Report", 10, 10);

      doc.autoTable({
        styles: {
          cellPadding: 0.5,
          fontSize: 3,
        },
        head: [columnHeaders],
        body: tableData,
        startY: 20,
        theme: "grid",
      });
    }

    const pdfData = doc.output("arraybuffer");
    return Buffer.from(pdfData);
  } catch (error) {
    console.error("An error occurred while generating the PDF report:", error);
    throw error;
  }
}

module.exports = { getPDFReportForEmail };
