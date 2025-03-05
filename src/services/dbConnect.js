const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

// Common Query Function with Parameterized Queries
const SQLquery = async (queryString, params = []) => {
    try {
        const pool = await sql.connect(config);
        const request = pool.request();

        params.forEach((param, index) => {
            request.input(`param${index + 1}`, param);
        });

        const result = await request.query(queryString);
        return result.recordset;
    } catch (error) {
        console.error('Query Execution Error:', error);
        throw error;
    }
};

const createBotReportTable = async (tableName = 'botreports') => {
    try {
        const createTableQuery = `
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${tableName}' AND TABLE_SCHEMA = 'config')
            BEGIN
                CREATE TABLE config.${tableName} (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    reportName VARCHAR(100) NOT NULL,
                    userEmail VARCHAR(100) NOT NULL,
                    createdAt DATETIME DEFAULT GETDATE(),
                    updatedAt DATETIME DEFAULT GETDATE(),
                    isDeleted BIT DEFAULT 0,
                    table_list VARCHAR(1000),
                    startDate DATE,
                    endDate DATE,
                    classOfBusiness VARCHAR(MAX),
                    originalCurrencyCode VARCHAR(1000),
                    field VARCHAR(MAX),
                    scheduler VARCHAR(1000),
                    emailLists VARCHAR(1000),
                    isConfirm BIT DEFAULT 0,
                    downloadType VARCHAR(100),
                    downloadFile VARCHAR(1000),
                    sqlQuery VARCHAR(MAX)
                );
            END;
        `;

        await SQLquery(createTableQuery);
        console.log(`Table "${tableName}" created successfully (if not exists).`);
    } catch (error) {
        console.error(`Error creating table "${tableName}":`, error);
        throw error;
    }
};

module.exports = {
    SQLquery,
    createBotReportTable
};