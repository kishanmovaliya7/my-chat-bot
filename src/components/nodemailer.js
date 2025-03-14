const nodemailer = require("nodemailer");
const sqlite3 = require("sqlite3");
const { generateSQl } = require("./getTableDataFromQuery");
const { getExcelReportForEmail } = require("./getExcelReportForEmail");
const { getPDFReportForEmail } = require("./getPDFReportForEmail");

async function sendAnEmail(
  reportName,
  email,
  bufferData,
  fileName,
  downloadType,
  loggedInEmail
) {
  const userMessage = `Hello, Please find the attached report for ${reportName}.\n\nBest regards,\nYour Team`;

  const transporter = nodemailer.createTransport({
    host: "arisoft-technologies.com",
    port: 587,
    auth: {
      user: "kishan@arisoft-technologies.com",
      pass: "mKishan@123",
    },
    secureConnection: false,
    tls: {
      rejectUnauthorized: false,
    },
  });

  const recipientEmails = email ? JSON.parse(email) : null;

  // Send an email
  const mailOptions = {
    from: "kishan@arisoft-technologies.com",
    to: loggedInEmail + recipientEmails ? `, ${recipientEmails}` : '',
    subject: `${reportName} Report`,
    text: userMessage,
    attachments: [
      {
        filename: fileName,
        content: bufferData,
        contentType:
          downloadType === "excel"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf",
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully: ", {
      res: info.response,
      email: recipientEmails,
    });

    return { success: true, data: info.response };
  } catch (error) {
    console.error("Error sending email: ", error);
    return { success: false, error: error };
  }
}

// Function to run SQL queries
const db = new sqlite3.Database("rawData.db", (err) => {
  if (err) {
    console.log("Error Occurred - " + err.message);
  } else {
    console.log("Database Connected");
  }
});

const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
};

async function mailerFunction(iterator) {
  const {
    Name,
    reportName,
    reportFilter,
    emailLists,
    downloadType,
    defaultColumns,
    email
  } = iterator;
  const report = JSON.parse(reportFilter);

  // const userMessage = `Create a join sql query using unique field from ${reportName} tables and return only this ${abc} `;

  // const userMessage = `Create a join sql query using unique field from ${reportName} tables and start date is greater then or eqaul to ${report.StartDate} and end date is less then or eqaul to ${report.EndDate} and Class of Business is ${report.ClassOfBusiness} and Original Currency Code is ${report.OriginalCurrencyCode} and return only this ${report.Field} `;

  // const userMessage = `Create a join sql query using unique field from ${ reportName } tables ${ report?.StartDate && `and start date is ${ report?.StartDate }` } ${ report?.EndDate && `and end date is ${ report?.EndDate }` } ${ (Business?.ClassOfBusiness || Business?.business) && `and Class of Business is ${ Business?.class_of_business || Business?.business }` } ${ (riskCode?.OriginalCurrencyCode || riskCode?.currency) && `and Original Currency Code is ${ riskCode?.OriginalCurrencyCode || riskCode?.currency }` }  and return only this ${ field }`;

  const userMessage = `${
    reportName.split(",").length > 1
      ? "Create a join sql query using unique field"
      : "Create a sql query"
  } from ${reportName} tables ${
    report?.StartDate
      ? `and start date is greater than or equal to ${report?.StartDate}`
      : ""
  } ${
    report?.EndDate
      ? `and end date is less than or equal to ${report?.EndDate}`
      : ""
  } ${
    report?.ClassOfBusiness.business || report?.business
      ? `and Class of Business is ${
          report?.ClassOfBusiness.business || report?.business
        }`
      : ""
  } ${
    report?.OriginalCurrencyCode || report?.currency
      ? `and Original Currency Code is ${
          report?.OriginalCurrencyCode || report?.currency
        }`
      : ""
  } and return only this ${report.Field}`;

  const sqlQuery = await generateSQl(userMessage);
  const policyData = await query(sqlQuery);

  let bufferData;
  let fileName;

  let input = defaultColumns;
  let defaultHeader = input.replace(/policy\./g, "");

  if (downloadType === "excel") {
    bufferData = await getExcelReportForEmail(policyData, defaultHeader);
    fileName = `${Name}.xlsx`;
  } else {
    bufferData = await getPDFReportForEmail(policyData, defaultHeader);
    fileName = `${Name}.pdf`;
  }
  console.log("bufferData", bufferData);

  await sendAnEmail(reportName, emailLists, bufferData, fileName, downloadType, email);
}

module.exports = mailerFunction;
