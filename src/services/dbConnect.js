const sql = require('mssql');
const cron = require("node-cron");
const axios = require('axios');
const { AzureOpenAI } = require('openai');

// Azure OpenAI Configuration
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const modelDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'depmodel';

const client = new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion: '2024-08-01-preview',
    deployment: modelDeployment,
});

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

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log("Connected to MSSQL with Pooling");
        return pool;
    })
    .catch(err => {
        console.error("Database Connection Failed! Error: ", err);
    });


let poolConnectionPromise;

const getPool = async () => {
    if (!poolConnectionPromise) {
        try {
            poolConnectionPromise = new sql.ConnectionPool(config);
            await poolConnectionPromise.connect();
            console.log('✅ Database connected successfully');
        } catch (error) {
            console.error('❌ Database connection error:', error);
            poolConnectionPromise = null;
        }
    }
    return poolConnectionPromise;
};

const SQLquery = async (queryString, params = {}) => {
    try {
        const pool = await poolPromise;
        // const request = pool.request();

        // const pool = await getPool();
        if (!pool) throw new Error('Database connection not available');

        const request = pool.request();

        Object.keys(params).forEach((key, index) => {
            request.input(`param${index}`, params[key]);
        });

        const result = await request.query(queryString);
        return result.recordset;
    } catch (error) {
        console.error('Query Execution Error:', error);
        throw error;
    }
};

const createBotReportTable = async (tableName = 'botreportsData') => {
    try {
        const createTableQuery = `
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${tableName}' AND TABLE_SCHEMA = 'config')
            BEGIN
                CREATE TABLE config.${tableName} (
                    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
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

// Function to fetch database schema
async function getDatabaseInfo() {
    try {
        const result = await SQLquery(`SELECT  TABLE_CATALOG, TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS where TABLE_NAME in ('dim_policy', 'fct_policy', 'fact_premium', 'dim_claims', 'fact_claims_dtl') and TABLE_SCHEMA='dwh'`);

        const data = result ?? [];

        const tables = data?.reduce((acc, cur) => {
            const tableName = `${cur.TABLE_SCHEMA}.${cur.TABLE_NAME}`
            if (acc?.[tableName]) {
                acc[tableName] = [...acc[tableName], `${cur.COLUMN_NAME} ${cur.DATA_TYPE}${cur.DATA_TYPE === 'varchar' ? "(MAX)" : ""}`]
            } else {
                acc[tableName] = [`${cur.COLUMN_NAME} ${cur.DATA_TYPE}${cur.DATA_TYPE === 'varchar' ? "(MAX)" : ""}`]
            }
            return acc;
        }, {})

        const tableResult = Object.entries(tables)?.map(table => `create table ${table[0]} (${table[1].join(', ')})`);

        return tableResult;
    } catch (error) {
        console.error('Error fetching database info:', error.message);
        throw new Error('Failed to retrieve database schema.');
    }
}

// Function to format schema info
function formatDatabaseSchemaInfo(schemaDict) {
    return schemaDict.join('\n');
}

const generateSQl = async (userMessage) => {
    try {
        const schemaDict = await getDatabaseInfo();
        const schemaString = formatDatabaseSchemaInfo(schemaDict);

        const completion = await client.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: userMessage }],
            temperature: 1,
            max_tokens: 1024,
            top_p: 1,
            tools: [
                {
                    type: 'function',
                    function: {
                        name: 'askDatabase',
                        description: `Use this function to answer user questions. Output should be a fully formed SQL query.`,
                        parameters: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: `
                        SQL query extracting info to answer the user's question.
                        SQL should be written using this database schema:
                        ${schemaString}
                          The query should be returned in plain text, not in JSON
                        `,
                                },
                            },
                            required: ['query'],
                        },
                    }
                },
            ],
            tool_choice: 'auto'
        })
        const queryCall = completion.choices[0]?.message?.tool_calls[0];
        if (queryCall) {
            const arguments = JSON.parse(queryCall.function.arguments);
            const sqlQuery = arguments.query

            return sqlQuery;
        }
        return null
    } catch (error) {
        return null
    }
}

const runAllCronJobs = async () => {
    const sql = 'SELECT * FROM config.botreportsData WHERE isDeleted = 0 AND isConfirm = 1';
    try {
        const data = await SQLquery(sql);

        for (const iterator of data) {
            const reportMetadata = iterator;
            cron.schedule(
                reportMetadata?.scheduler,
                async () => {
                    let queryString;

                    if (reportMetadata.sqlQuery) {
                        queryString = reportMetadata?.sqlQuery
                    } else {
                        const tableList = reportMetadata?.table_list;
                        const userMessage = `Create a ${tableList && typeof tableList === 'string' && tableList.split(",").length > 1
                            ? `join SQL query using a unique field from ${tableList} tables`
                            : `SQL query from ${tableList} table`
                            } and Include a WHERE clause with ${reportMetadata?.startDate ? `Start Date >= '${reportMetadata?.startDate}'` : ''
                            }${reportMetadata?.endDate ? ` AND End Date <= '${reportMetadata?.endDate}'` : ''
                            }${reportMetadata?.classOfBusiness ? ` AND class of business name = '${reportMetadata?.classOfBusiness}'` : ''
                            }${reportMetadata?.originalCurrencyCode ? ` AND currency code = '${reportMetadata?.originalCurrencyCode}'` : ''
                            } and return only these fields: ${reportMetadata?.field}. Ignore the filter if the column is not valid.`;

                        queryString = await generateSQl(userMessage);
                    }

                    const policyData = await SQLquery(queryString);

                    const data = {
                        reportName: iterator?.reportName,
                        reportMetadata,
                        email: iterator?.userEmail,
                        policyData
                    };

                    console.log('schedule email sending started----', process.env.AZURE_CHATBOT_SCHEDULER_BASE_URL);
                    await axios.post(`${process.env.AZURE_CHATBOT_SCHEDULER_BASE_URL}/api/send-email?code=${process.env.AZURE_CHATBOT_SCHEDULER_FUNCTION_KEY}`, data);
                },
                { name: `Schedule-${iterator?.reportName}`, timezone: 'America/New_York' }
            );
        }

        return data;
    } catch (err) {
        console.error('Error running cron job:', err);
    }
};

const runCronJobByFileName = async (filename) => {
    const sql = `SELECT * FROM config.botreportsData WHERE reportName = ${filename} AND isDeleted = 0 AND isConfirm = 1`;
    try {
        const queryData = await SQLquery(sql);
        const reportMetadata = queryData[0]

        if (queryData.length > 0) {
            cron.schedule(
                reportMetadata?.scheduler,
                async () => {
                    let queryString;

                    if (reportMetadata.sqlQuery) {
                        queryString = reportMetadata?.sqlQuery
                    } else {
                        const tableList = reportMetadata?.table_list;
                        const userMessage = `Create a ${tableList && typeof tableList === 'string' && tableList.split(",").length > 1
                            ? `join SQL query using a unique field from ${tableList} tables`
                            : `SQL query from ${tableList} table`
                            } and Include a WHERE clause with ${reportMetadata?.startDate ? `Start Date >= '${reportMetadata?.startDate}'` : ''
                            }${reportMetadata?.endDate ? ` AND End Date <= '${reportMetadata?.endDate}'` : ''
                            }${reportMetadata?.classOfBusiness ? ` AND class of business name = '${reportMetadata?.classOfBusiness}'` : ''
                            }${reportMetadata?.originalCurrencyCode ? ` AND currency code = '${reportMetadata?.originalCurrencyCode}'` : ''
                            } and return only these fields: ${reportMetadata?.field}. Ignore the filter if the column is not valid.`;

                        queryString = await generateSQl(userMessage);
                    }

                    const policyData = await SQLquery(queryString);

                    const data = {
                        reportName: queryData[0]?.reportName,
                        reportMetadata,
                        email: queryData[0]?.userEmail,
                        policyData
                    };

                    console.log('schedule email sending started----');
                    await axios.post(`${process.env.AZURE_CHATBOT_SCHEDULER_BASE_URL}/api/send-email`, data);
                },
                { name: `Schedule-${reportMetadata?.reportName}`, timezone: "America/New_York" }
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
    SQLquery,
    createBotReportTable,
    poolPromise,
    runCronJobByFileName,
    runAllCronJobs
};