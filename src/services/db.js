const sqlite3 = require("sqlite3");
const cron = require("node-cron");
const XLSX = require("xlsx");
const mailerFunction = require("../components/nodemailer");

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
      return `\`${col.trim().replace(/ /g, '_')}\` TEXT`;
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

    const columns = Object.keys(data[0])?.map(col => col.trim().replace(/ /g, '_').replace('100%','hundred_percentage'));

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

        if (col.toLowerCase().includes("date") || col.toLowerCase().includes("inception") || col.toLowerCase().includes("expiry")) {
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

    const dropTableQuery = `DROP TABLE IF EXISTS SavedReport`;
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
    await addEntry("SavedReport", newEntry);
    // console.log('Report entry added successfully.');
  } catch (err) {
    console.error("Error adding report entry:", err);
  }
};

const runAllCronJobs = async () => {
  const sql = `SELECT * FROM SavedReport WHERE isDeleted = 0 AND isConfirm = 1`;
  try {
    const data = await query(sql);

    for (const iterator of data) {
      console.log("iterator.scheduler", iterator.scheduler);

      cron.schedule(
        `${iterator.scheduler}`,
        async () => {
          console.log(iterator.Name, "Called at", new Date());
          await mailerFunction(iterator);
        },
        { name: `Schedule-${iterator.Name}`, timezone: "America/New_York" }
      );
    }

    return data;
  } catch (err) {
    console.error("Error running cron job:", err);
  }
};

const runCronJobByFileName = async (field) => {
  const sql = `SELECT * FROM SavedReport WHERE Name = '${field}'`;
  try {
    const data = await query(sql);
    console.log("data", data, JSON.stringify(data));
    if(data.length) {
      cron.schedule(
        data[0].scheduler,
        async () => {
          console.log(data[0].Name, "Called at*", new Date());
          await mailerFunction(data[0]);
        },
        { name: `Schedule-${data[0].Name}`, timezone: "America/New_York" }
      );
    }


    return {
      success: true,
      data: data,
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
