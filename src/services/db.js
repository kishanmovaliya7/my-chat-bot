const sqlite3 = require("sqlite3");
const cron = require("node-cron");
const XLSX = require("xlsx");
const mailerFunction = require("../components/nodemailer");

const db = new sqlite3.Database('rawData.db', (err) => {
    if (err) {
        console.log('Error Occurred - ' + err.message);
    } else {
        console.log('Database Connected');
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
    if (!value) return '';

    if (value instanceof Date) {
        return value.toISOString().split('T')[0];
    }

    try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    } catch (e) {
        console.log(`Error parsing date: ${ value }`);
    }

    return null;
};

const checkTableExists = async (tableName) => {
    const sql = `PRAGMA table_info(${ tableName })`;
    try {
        const result = await query(sql);
        return result.length > 0;
    } catch (err) {
        console.error('Error checking table existence:', err);
        return false;
    }
};

const createTable = async (tableName, columns) => {
    const columnsDefinition = columns.map(col => {
        return `\`${ col }\` TEXT`;
    }).join(', ');

    const sql = `CREATE TABLE IF NOT EXISTS ${ tableName } (${ columnsDefinition })`;

    try {
        await query(sql);
        console.log(`Table ${ tableName } created successfully.`);
    } catch (err) {
        console.error('Error creating table:', err);
    }
};

const importDataFromXlsx = async (xlsxFilePath) => {
    const workbook = XLSX.readFile(xlsxFilePath, {
        cellDates: true
    });
    
    for (const sheetName of workbook.SheetNames) {
        const tableName = sheetName;
        const sheet = workbook.Sheets[sheetName];
    
        const data = XLSX.utils.sheet_to_json(sheet);
    
        if (data.length === 0) {
            console.log('No data found in the XLSX file.');
            return;
        }
    
        const columns = Object.keys(data[0]);
    
        const tableExists = await checkTableExists(tableName);
        if (tableExists) {
            const deleteSql = `DELETE FROM ${ tableName }`;
            try {
                await query(deleteSql);
            } catch (err) {
                console.log('Error deleting existing data:', err);
                return;
            }
        } else {
            await createTable(tableName, columns);
        }
    
        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT INTO ${ tableName } (\`${ columns.join('`, `') }\`) VALUES (${ placeholders })`;
    
        for (const row of data) {
            const values = columns.map(col => {
                if (col.toLowerCase().includes('percentage') && row[col]) {
                    return (row[col] * 100) + '%';
                }
    
                if (col.toLowerCase().includes('date')) {
                    return formatDate(row[col]);
                }
    
                return row[col];
            });
    
            try {
                await query(sql, values);
            } catch (err) {
                console.log('Error inserting row:', err, sql);
            }
        }
    }

    console.log('Data import complete.');
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
      Name: "testReports-1735894403790",
      reportName: "Policy",
      email: "tests@gmail.com",
      reportFilter: {
        StartDate: "05/01/2022",
        EndDate: "05/01/2023",
        ClassOfBusiness: "VAT BOND",
        Field:
          "Policy.Policy Reference, Policy.Original Insured, Policy.Territory, Policy.Insured, Policy.Start Date, Policy.Expiry Date, Policy.Class of Business, Policy.Original Currency Code, Policy.Exchange Rate, Policy.Limit of Liability, Policy.100% Gross Premium, Policy.Signed Line, Policy.Gross Premium Paid this Time , Policy.Gross Premium Paid this Time in Settlement Currency, Policy.Commission Percentage, Policy.Brokerage Percentage, Policy.Agreement Reference, Policy.Settlement Currency Code, Policy.Org or Personal, Policy.Insurer, Policy.Period, Policy.Year",
      },
      scheduler: { minute: 2, hours: 3, days: 1, month: 2, week: 1 },
      isDeleted: 1,
      emailLists: "[object Object]",
    };
  
    try {
      await addEntry("savedReports", newEntry);
      // console.log('Report entry added successfully.');
    } catch (err) {
      console.error("Error adding report entry:", err);
    }
  };
  
  const runAllCronJobs = async () => {
    const sql = `SELECT * FROM SavedReport WHERE isDeleted = 0`;
    try {
      const data = await query(sql);
  
      for (const iterator of data) {
        console.log("iterator.schedule", iterator.Name);
  
        const schedule = iterator.scheduler;
        cron.schedule(
          `*/1 * * * *`,
          async () => {
            console.log('Called')
            // await mailerFunction(iterator);
          },
          { name: `Schedule-${iterator.Name}`, timezone: "America/New_York" }
        );
      }
  
      return data;
    } catch (err) {
      console.error("Error running cron job:", err);
    }
  };
  
module.exports = {
  db,
  query,
  importDataFromXlsx,
  runAllCronJobs,
  addEntryToSaveReport,
};
