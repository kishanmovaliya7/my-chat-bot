const { query } = require('../services/db');

const getTableListController = async (req, res) => {
    try {
        const tables = await query('SELECT name FROM sqlite_master WHERE type = "table";');
        const tableName = tables.map(row => row.name);

        if (tableName) {
            res.status(200).json({ data: tableName, message: 'TableName fetched successfully.' });
        } else {
            res.status(200).json({ data: [], message: 'Tables Not Found' });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const getBusinessValue = async (req, res) => {
    try {
        const businessColumnValues = await query('SELECT DISTINCT "Class_of_business" FROM Policy');
        const classOfBusinessArray = businessColumnValues.map(row => row.Class_of_Business);

        if (classOfBusinessArray) {
            res.status(200).json({ data: classOfBusinessArray, message: 'Class fetched successfully.' });
        } else {
            res.status(200).json({ message: 'Data Not Found' });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const getCurrencyValue = async (req, res) => {
    try {
        const originalCurrencyCodeValues = await query('SELECT DISTINCT "Original_Currency_Code" FROM Policy');
        const originalCurrencyCodeArray = originalCurrencyCodeValues.map(row => row.Original_Currency_Code);

        if (originalCurrencyCodeArray) {
            res.status(200).json({ data: originalCurrencyCodeArray, message: 'Currency fetched successfully.' });
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
            const rawDetails = await query(`PRAGMA table_info(${ table.trim() })`);
            columnNames = [...columnNames, ...rawDetails.map(column => `${ table }.'${ column.name }'`)];
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
