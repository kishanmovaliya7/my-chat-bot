const nodemailer = require("nodemailer");
const sqlite3 = require("sqlite3");
const { generateSQl } = require("./getTableDataFromQuery");
const { getExcelReportForEmail } = require("./getExcelReportForEmail");
const { getPDFReportForEmail } = require("./getPDFReportForEmail");

async function sendAnEmail(reportName, email, excelBuffer, type) {
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

  // Send an email
  const mailOptions = {
    from: "kishan@arisoft-technologies.com",
    to: email,
    subject: `${reportName} Report`,
    text: userMessage,
    attachments: [
      {
        filename: `${type === "excel" ? "report.xlsx" : "report.pdf"}`,
        content: excelBuffer,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully: ", info.response);
  } catch (error) {
    console.error("Error sending email: ", error);
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
  const { reportName, reportFilter, emailLists } = iterator;
  const report = JSON.parse(reportFilter);

    // const userMessage = `Create a join sql query using unique field from ${reportName} tables and return only this ${abc} `;

    // const userMessage = `Create a join sql query using unique field from ${reportName} tables and start date is greater then or eqaul to ${report.StartDate} and end date is less then or eqaul to ${report.EndDate} and Class of Business is ${report.ClassOfBusiness} and Original Currency Code is ${report.OriginalCurrencyCode} and return only this ${report.Field} `;
    
    const userMessage = `${reportName.split(',').length > 1 ? 'Create a join sql query using unique field' : 'Create a sql query'} from ${reportName} tables ${ report?.startDate && `and start date is greater then or eqaul to  ${ report?.startDate }` } ${ report?.EndDate && `and end date is less then or eqaul to ${ report?.EndDate }` } ${ (report?.ClassOfBusiness || report?.business) && `and Class of Business is ${ report?.ClassOfBusiness || report?.business }` } ${ (report?.OriginalCurrencyCode || report?.currency) && `and Original Currency Code is ${ report?.OriginalCurrencyCode || report?.currency }` }  and return only this ${ field }`;


  const sqlQuery = await generateSQl(userMessage);
  console.log("sqlQuery", sqlQuery);

  const policyData = await query(sqlQuery);
  // const excelBuffer = await getExcelReportForEmail(policyData);
  const pdfBuffer = await getPDFReportForEmail(policyData);
  await sendAnEmail(reportName, emailLists, pdfBuffer, "pdf");
}

module.exports = mailerFunction;
