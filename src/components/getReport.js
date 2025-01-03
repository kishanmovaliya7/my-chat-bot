const { query } = require('../services/db');

async function getReportData(selectedValues) {
    try {
        const { period, riskCode, field } = selectedValues;
        console.log('selectedValues', selectedValues);

        const fieldSelection = field.split(',')
            .map(f => `"${ f.trim() }"`)
            .join(', ');

        let dateFilter = '';

        if (period && period.startDate && period.endDate) {
            const formatDate = (dateString) => {
                const date = new Date(dateString);
                return date.toISOString().split('T')[0];
            };

            const formattedStartDate = formatDate(period.startDate);
            const formattedEndDate = formatDate(period.endDate);

            dateFilter = `WHERE "Start Date" BETWEEN '${ formattedStartDate }' AND '${ formattedEndDate }'`;
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

        const queryStr = `SELECT ${ fieldSelection } FROM ${ selectedValues.reportType } ${ dateFilter }`;
        const reportData = await query(queryStr);
        return reportData;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

module.exports = { getReportData };
