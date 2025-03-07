const { query } = require('../services/db');
const { SQLquery } = require('../services/dbConnect');

// const getTableListController = async (req, res) => {
//     try {
//         const tables = await query('SELECT name FROM sqlite_master WHERE type = "table";');
//         const tableName = tables.map(row => row.name);

//         if (tableName) {
//             res.status(200).json({ data: tableName, message: 'TableName fetched successfully.' });
//         } else {
//             res.status(200).json({ data: [], message: 'Tables Not Found' });
//         }
//     } catch (error) {
//         res.status(500).send(error.message);
//     }
// };

const getTableListController = async (req, res) => {
    try {
        // const queryString = `
        //     SELECT TABLE_SCHEMA, TABLE_NAME 
        //     FROM INFORMATION_SCHEMA.TABLES 
        //     WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME IN ('dim_policy', 'fact_premium', 'dim_claims');
        // `;

        // const tables = await SQLquery(queryString);
        // const tableNames = tables.map(row => `${row.TABLE_SCHEMA}.${row.TABLE_NAME}`);
        const tableNames = [{ label: 'Policy', value: "dwh.dim_policy" }, { label: "Claims", value: "dwh.dim_claims" }, { label: "Premium", value: "dwh.fact_premium" }];

        if (tableNames.length > 0) {
            res.status(200).json({data:tableNames });
        } else {
            res.status(200).json([] );
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getBusinessValue = async (req, res) => {
    try {
        const businessColumnValues = await SQLquery('SELECT DISTINCT business_class_name FROM dwh.dim_business_class WHERE business_class_name IS NOT NULL');
        const classOfBusinessArray = businessColumnValues.map(row => row.business_class_name);

        if (classOfBusinessArray) {
            res.status(200).json({ data: classOfBusinessArray, message: 'Business Class fetched successfully.' });
        } else {
            res.status(200).json({ message: 'Data Not Found' });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const getCurrencyValue = async (req, res) => {
    try {
        const originalCurrencyCodeValues = await SQLquery('SELECT DISTINCT currency_code FROM dwh.dim_agreement WHERE currency_code IS NOT NULL');
        const originalCurrencyCodeArray = originalCurrencyCodeValues.map(row => row.currency_code);

        if (originalCurrencyCodeArray) {
            res.status(200).json({ data: originalCurrencyCodeArray, message: 'Currency Code fetched successfully.' });
        } else {
            res.status(200).json({ message: 'Data Not Found' });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const AllColumns = async (listOfTables) => {
    let columnNames = [];
    if (listOfTables?.length) {
        for (const table of listOfTables) {
            const tableSchema = table.split(".")[0]
            const tableName = table.split(".")[1]
            const tableMapping = {
                "dwh.dim_policy": ["fct_policy", "dim_policy"],
                "dwh.dim_claims": ["fact_claims_dtl", "dim_claims"],
                "dwh.fact_premium": ["fact_premium"]
            };
            const tablesToQuery = tableMapping[table] || [tableName]
            const rawDetails = await SQLquery(`SELECT COLUMN_NAME, MIN(TABLE_NAME) AS TABLE_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = '${tableSchema}'
                AND TABLE_NAME IN (${tablesToQuery.map(t => `'${t}'`).join(",")})
                AND COLUMN_NAME != 'dw_ins_upd_dt'
                GROUP BY COLUMN_NAME;`)
            
            columnNames = [...columnNames, ...rawDetails.map(column => `${column.TABLE_NAME}.'${column.COLUMN_NAME}'`)];

            // const uniqueColumns = new Set();
            // const formattedColumns = rawDetails
            //     .filter(column => {
            //         if (uniqueColumns.has(column.COLUMN_NAME)) {
            //             return false;
            //         }
            //         uniqueColumns.add(column.COLUMN_NAME);
            //         return true;
            //     })
            //     .map(column => `${column.TABLE_NAME}.'${column.COLUMN_NAME}'`);

            // columnNames = [...columnNames, ...formattedColumns];
        }
    }
    return columnNames;
};

const getAllColumns = async (req, res) => {
    try {
        const listOfTables = req?.query?.table.split(',');
        const columnNames = await AllColumns(listOfTables);

        if (columnNames) {
            res.status(200).json({ data: columnNames, message: 'All Field fetched successfully.' });
        } else {
            res.status(200).json({ message: 'Data Not Found' });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};

module.exports = { getTableListController, getBusinessValue, getCurrencyValue, getAllColumns, AllColumns };
