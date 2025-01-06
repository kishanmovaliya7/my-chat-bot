const ExcelJS = require("exceljs");

async function getExcelReportForEmail(selectedValues) {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Report");

    // Add column headers
    sheet.addRow(Object.keys(selectedValues[0]));

    // Add data rows
    selectedValues.forEach((row) => {
      sheet.addRow(Object.values(row));
    });

    // Generate the file and return its buffer
    const buffer = await workbook.xlsx.writeBuffer();

    console.log("The Excel report has been generated successfully.");
    return buffer; 
  } catch (error) {
    console.error("An error occurred while generating the Excel report:", error);
    throw error; 
  }
}

module.exports = { getExcelReportForEmail };
