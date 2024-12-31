const sqlite3 = require('sqlite3');
const XLSX = require('xlsx');

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

// Function to import data from XLSX to SQLite
const importDataFromXlsx = async (xlsxFilePath, tableName) => {
    const workbook = XLSX.readFile(xlsxFilePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
        console.log('No data found in the XLSX file.');
        return;
    }

    const columns = Object.keys(data[0]);

    // Check if the table exists
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
        const values = columns.map(col => row[col]);

        try {
            await query(sql, values);
        } catch (err) {
            console.log('Error inserting row:', err);
        }
    }

    console.log('Data import complete.');
};

module.exports = {
    db,
    query,
    importDataFromXlsx
};
