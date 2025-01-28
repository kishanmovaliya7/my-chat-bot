const sqlite3 = require("sqlite3");
const cron = require("node-cron");
const XLSX = require("xlsx");
const mailerFunction = require("../components/nodemailer");
const { DefaultAzureCredential } = require("@azure/identity");
const { LogicManagementClient } = require("@azure/arm-logic");
const { generateSQl } = require("../components/getTableDataFromQuery");
const axios = require('axios');

const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
const resourceGroupName = process.env.RESOURCE_GROUP_NAME;
const logicAppName = "Scheduler";
const location = process.env.LOCATION;

const db = new sqlite3.Database("rawData.db", (err) => {
  if (err) {
    console.log("Error Occurred - " + err.message);
  } else {
    console.log("Database Connected");
  }
});

// Function to run SQL queries
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

// Function to format date value
const formatDate = (value) => {
  if (!value) return "";

  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  } catch (e) {
    console.log(`Error parsing date: ${value}`);
  }

  return null;
};

const checkTableExists = async (tableName) => {
  const sql = `PRAGMA table_info(${tableName})`;
  try {
    const result = await query(sql);
    return result.length > 0;
  } catch (err) {
    console.error("Error checking table existence:", err);
    return false;
  }
};

const createTable = async (tableName, columns) => {
  const columnsDefinition = columns
    .map((col) => {
      return `\`${col.trim().replace(/ /g, "_")}\` TEXT`;
    })
    .join(", ");

  const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnsDefinition})`;

  try {
    await query(sql);
    console.log(`Table ${tableName} created successfully.`);
  } catch (err) {
    console.error("Error creating table:", err);
  }
};

const importDataFromXlsx = async (xlsxFilePath) => {
  const workbook = XLSX.readFile(xlsxFilePath, {
    cellDates: true,
  });

  for (const sheetName of workbook.SheetNames) {
    const tableName = sheetName;
    const sheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      console.log("No data found in the XLSX file.");
      return;
    }

    const columns = Object.keys(data[0])?.map((col) =>
      col.trim().replace(/ /g, "_").replace("100%", "hundred_percentage")
    );

    const tableExists = await checkTableExists(tableName);
    if (tableExists) {
      const deleteSql = `DELETE FROM ${tableName}`;
      try {
        await query(deleteSql);
      } catch (err) {
        console.log("Error deleting existing data:", err);
        return;
      }
    } else {
      await createTable(tableName, columns);
    }

    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT INTO ${tableName} (\`${columns.join(
      "`, `"
    )}\`) VALUES (${placeholders})`;

    for (const row of data) {
      const values = Object.keys(data[0]).map((col) => {
        if (col.toLowerCase().includes("percentage") && row[col]) {
          return row[col] * 100 + "%";
        }

        if (
          col.toLowerCase().includes("date") ||
          col.toLowerCase().includes("inception") ||
          col.toLowerCase().includes("expiry")
        ) {
          return formatDate(row[col]);
        }

        return row[col];
      });

      try {
        await query(sql, values);
      } catch (err) {
        console.log("Error inserting row:", err, sql);
      }
    }
  }

  console.log("Data import complete.");
};
const dropTable = async () => {
  try {
    console.log("CALL DROP");

    const dropTableQuery = `DROP TABLE IF EXISTS savedReports`;
    await query(dropTableQuery);
    console.log("DELEted");
  } catch (error) {
    console.log("something went wrong when trying to drop the table");
  }
};

const addEntry = async (tableName, data) => {
  const columns = Object.keys(data);

  const placeholders = columns.map(() => "?").join(", ");

  const sql = `INSERT INTO ${tableName} (\`${columns.join(
    "`, `"
  )}\`) VALUES (${placeholders})`;

  const tableExists = await checkTableExists(tableName);

  try {
    if (tableExists) {
      await query(
        sql,
        columns.map((col) => data[col])
      );
      console.log("Entry added successfully.");
    } else {
      await createTable(tableName, columns);
      console.log("Entry created successfully.");
    }
  } catch (err) {
    console.error("Error adding entry:", err);
  }
};

const addEntryToSaveReport = async () => {
  console.log("FUNCTION CALL FOR ADD ENTRY TO SAVE REPORT");

  const newEntry = {
    Name: "testingReport1-1735894403790",
    reportName: "Claims",
    email: "test1@gmail.com",
    reportFilter: JSON.stringify({
      StartDate: "1970-01-01",
      EndDate: "1970-01-01",
      ClassOfBusiness: ["Property", "CAR", "VAT BOND"],
      OriginalCurrencyCode: ["EUR", "GBP"],
      Field:
        "Policy.`Policy Reference`, Policy.`Original Insured`, Policy.`Territory`, Policy.`Insured`, Policy.`Start_Date`, Policy.`Expiry_Date`, Policy.`Class_of_Business`, Policy.`Original_Currency_Code`, Policy.`Exchange Rate`, Policy.`Limit of Liability`, Policy.`100% Gross Premium`, Policy.`Signed Line`, Policy.`Gross Premium Paid this Time `, Policy.`Gross Premium Paid this Time in Settlement Currency`, Policy.`Commission Percentage`, Policy.`Brokerage Percentage`, Policy.`Agreement Reference`, Policy.`Settlement Currency Code`, Policy.`Org or Personal`, Policy.`Insurer`, Policy.`Period`, Policy.`Year`",
    }),
    scheduler: "1 1 1 1 1",
    isDeleted: 0,
    emailLists: "kishanmovaliya17@gmail.com",
    isConfirm: 1,
    created_at: "1735923807529.0",
  };

  try {
    await addEntry("savedReports", newEntry);
    // console.log('Report entry added successfully.');
  } catch (err) {
    console.error("Error adding report entry:", err);
  }
};

function cronToMappedRecurrence(cronExpression) {
    const cronParts = cronExpression.split(' ');
    let frequency = '';
    let interval = 1;

    // Check for frequency based on the cron expression
    if (cronParts[0] !== '*') {
        frequency = 'Minute';
        interval = parseInt(cronParts[0], 10);
    } else if (cronParts[1] !== '*') {
        frequency = 'Hour';
        interval = parseInt(cronParts[1], 10);
    } else if (cronParts[2] !== '*') {
        frequency = 'Day';
        interval = parseInt(cronParts[2], 10);
    } else if (cronParts[3] !== '*') {
        frequency = 'Month';
        interval = parseInt(cronParts[3], 10);
    } else if (cronParts[4] !== '*') {
        frequency = 'Week';
        interval = parseInt(cronParts[4], 10);
    }

    // Default to Minute and interval of 1 if no valid cron pattern found
    if (!frequency) {
        frequency = 'Minute';
        interval = 1;
    }

    return {
        frequency: frequency,
        interval: interval
    };
}

async function createLogicApp(iterator) {
    const recurrence = cronToMappedRecurrence(JSON.parse(iterator?.reportMetadata)?.scheduler);
    const reportMetadata =
    iterator?.reportMetadata && JSON.parse(iterator?.reportMetadata);
    const emailArray = reportMetadata?.emailLists;

    try {
        const credential = new DefaultAzureCredential();
        const client = new LogicManagementClient(credential, subscriptionId);

        const parameters = {
            location: location,
            definition: {
                $schema:
                  'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowDefinition.json#',
                actions: {
                    'Send_an_email_(V2)': {
                        runAfter: {},
                        type: 'ApiConnection',
                        inputs: {
                            host: {
                                connection: {
                                    name: "@parameters('$connections')['outlook']['connectionId']"
                                }
                            },
                            method: 'post',
                            body: {
                                To: emailArray.join('; '),
                                Subject: `${ iterator?.reportName } report`,
                                Body: `<p class="editor-paragraph">Hello, Please find the attached report for ${ iterator?.reportName }.\n\nBest regards,\nYour Team</p>`,
                                Importance: 'Normal'
                            },
                            path: '/v2/Mail'
                        }
                    }
                },
                outputs: {},
                triggers: {
                    Recurrence: {
                        recurrence: recurrence,
                        type: 'Recurrence'
                    }
                }
            },
            state: 'Enabled'
        };

        await client.workflows.createOrUpdate(
            resourceGroupName,
            logicAppName,
            parameters
        );

        console.log('Logic App created successfully');
    } catch (err) {
        console.error('Error creating Logic App:', err);
    }
}

const runAllCronJobs = async () => {
    const sql = `SELECT * FROM savedReports WHERE isDeleted = 0 AND reportMetadata->>'isConfirm' = 1`;
    try {
        const data = await query(sql);

        for (const iterator of data) {
            const reportMetadata = iterator?.reportMetadata && JSON.parse(iterator?.reportMetadata);

            cron.schedule(
                reportMetadata?.scheduler,
                async () => {
                    const policyData = await query(reportMetadata?.sqlQuery);

                    const data = {
                        reportName: iterator?.reportName,
                        reportMetadata,
                        email: iterator?.userEmail,
                        policyData
                    };

                    console.log('schedule email sending started----');
                    await axios.post(`${ process.env.AZURE_CHATBOT_SCHEDULER_BASE_URL }/api/send-email`, data);
                },
                { name: `Schedule-${ iterator?.reportName }`, timezone: 'America/New_York' }
            );
        }

        return data;
    } catch (err) {
        console.error('Error running cron job:', err);
    }
};

const runCronJobByFileName = async (filename) => {
    const sql = `SELECT * FROM savedReports WHERE reportName = '${ filename }' AND isDeleted = 0 AND reportMetadata->>'isConfirm' = 1`;
    try {
        const queryData = await query(sql);
        const reportMetadata = queryData[0]?.reportMetadata && JSON.parse(queryData[0]?.reportMetadata);

        if (queryData.length > 0) {
            cron.schedule(
                reportMetadata?.scheduler,
                async () => {
                    const policyData = await query(reportMetadata?.sqlQuery);

                    const data = {
                        reportName: queryData[0]?.reportName,
                        reportMetadata,
                        email: queryData[0]?.userEmail,
                        policyData
                    };

                    console.log('schedule email sending started----');
                    await axios.post(`${ process.env.AZURE_CHATBOT_SCHEDULER_BASE_URL }/api/send-email`, data);
                },
                { name: `Schedule-${ reportMetadata?.reportName }`, timezone: "America/New_York" }
            );
        }

        return {
            success: true,
            data: queryData
        };
    } catch (err) {
        console.error("Error running cron job:", err, sql);
        return {
            success: false,
            message: err.message || "Sorry, We could not process with your answer",
        };
    }
};

module.exports = {
  db,
  query,
  importDataFromXlsx,
  runAllCronJobs,
  addEntryToSaveReport,
  dropTable,
  runCronJobByFileName,
};
