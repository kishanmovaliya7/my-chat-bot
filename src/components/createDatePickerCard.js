const { CardFactory } = require('botbuilder');

async function createDatePickerCard(filteredValue = {}) {
    return CardFactory.adaptiveCard({
        type: 'AdaptiveCard',
        body: [
            {
                type: 'TextBlock',
                text: 'Please select the start and end dates for your report:',
                wrap: true
            },
            {
                type: 'Input.Date',
                id: 'startDate',
                label: 'Start Date:',
                value: `${ filteredValue.StartDate }`,
                style: 'text',
                isRequired: true,
                errorMessage: 'Please select Start Date'
            },
            {
                type: 'Input.Date',
                id: 'endDate',
                label: 'End Date:',
                value: `${ filteredValue.EndDate }`,
                style: 'text',
                isRequired: true,
                errorMessage: 'Please select End Date'
            }
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: 'Submit Dates',
                data: {
                    step: 'step4'
                }
            }
        ],
        $schema: 'http://adaptivecards.io/schemas/adaptive-card',
        version: '1.3'
    });
}

module.exports = { createDatePickerCard };
