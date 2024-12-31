const { CardFactory } = require('botbuilder');

async function createDatePickerCard() {
    return CardFactory.adaptiveCard({
        type: 'AdaptiveCard',
        body: [
            {
                type: 'TextBlock',
                text: 'Please select the start and end dates for your report:',
                weight: 'Bolder',
                size: 'Medium'
            },
            {
                type: 'TextBlock',
                text: 'Start Date:',
                weight: 'Bolder',
                size: 'small'
            },
            {
                type: 'Input.Date',
                id: 'startDate',
                placeholder: 'YYYY-MM-DD',
                style: 'text'
            },
            {
                type: 'TextBlock',
                text: 'End Date:',
                weight: 'Bolder',
                size: 'small'
            },
            {
                type: 'Input.Date',
                id: 'endDate',
                placeholder: 'YYYY-MM-DD',
                style: 'text'
            }
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: 'Submit Dates'
            }
        ],
        $schema: 'http://adaptivecards.io/schemas/adaptive-card',
        version: '1.3'
    });
}

module.exports = { createDatePickerCard };
