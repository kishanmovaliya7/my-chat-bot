const ExcelJS = require("exceljs");

async function getExcelReportForEmail(selectedValues) {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Report");

    // Check if selectedValues is empty
    // if (!selectedValues || selectedValues.length === 0) {
    //   // sheet.addRow(["No data available"]);
    //   sheet.addRow(defaultHeader);
    // } else {
      // column header
      const columnHeaders = Object.keys(selectedValues[0]);
      sheet.addRow(columnHeaders);

      // data rows
      selectedValues.forEach((row) => {
        const rowData = columnHeaders.map((header) => {
          const value = row[header];
          return value !== undefined && value !== null ? value : "null";
        });
        sheet.addRow(rowData);
      });
    // }

    // Generate the file and return its buffer
    const buffer = await workbook.xlsx.writeBuffer();
    console.log("The Excel report has been generated successfully.");
    return buffer;
  } catch (error) {
    console.error(
      "An error occurred while generating the Excel report:",
      error
    );
    throw error;
  }
}

module.exports = { getExcelReportForEmail };
