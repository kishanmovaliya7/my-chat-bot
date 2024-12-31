const { query } = require('../services/db');

function convertToDDMMYYYY(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${ day }/${ month }/${ year }`;
}

async function getReportData(selectedValues) {
    try {
        const { period, riskCode, field } = selectedValues;

        const fieldSelection = field === 'all' ? '*' : field.split(',')
            .map(f => `"${ f.trim() }"`)
            .join(', ');

        let dateFilter = '';

        if (period && period.startDate && period.endDate) {
            const startDate = convertToDDMMYYYY(period.startDate);
            const endDate = convertToDDMMYYYY(period.endDate);

            dateFilter = `WHERE "Start Date" BETWEEN '${ startDate }' AND '${ endDate }'`;
        }

        if (riskCode?.class_of_business) {
            const formattedRiskCode = riskCode.class_of_business
                .split(',')
                .map(item => `"${ item.trim() }"`)
                .join(', ');

            dateFilter += period
                ? ` AND "Class of Business" IN (${ formattedRiskCode })`
                : `WHERE "Class of Business" IN (${ formattedRiskCode })`;
        }

        if (riskCode?.original_currency_code) {
            const formattedRiskCode = riskCode.original_currency_code
                .split(',')
                .map(item => `'${ item.trim() }'`)
                .join(', ');

            dateFilter += period || riskCode.class_of_business
                ? ` AND "Original Currency Code" IN (${ formattedRiskCode })`
                : `WHERE "Original Currency Code" IN (${ formattedRiskCode } )`;
        }

        const queryStr = `SELECT ${ fieldSelection } FROM rawDataTable ${ dateFilter }`;
        const reportData = await query(queryStr);
        return reportData;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

module.exports = { getReportData };
