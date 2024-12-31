const { CardFactory } = require('botbuilder');
const { query } = require('../services/db');

async function getAllColumns(context) {
    try {
        const rawDetails = await query('PRAGMA table_info(rawDataTable)');
        const columnNames = rawDetails.map(column => column.name);
        return columnNames;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function selectFields(context) {
    const fields = await getAllColumns(context);

    const choices = fields.map(item => ({
        title: item,
        value: item
    }));
    // Default selected values
    const defaultSelectedValues = choices.map(choice => choice.value).join(',');

    const card = {
        type: 'AdaptiveCard',
        body: [
            {
                type: 'TextBlock',
                text: 'Select Fields',
                weight: 'Bolder',
                size: 'medium'
            },
            {
                type: 'Input.ChoiceSet',
                id: 'field',
                style: 'expanded',
                isMultiSelect: true,
                value: defaultSelectedValues,
                choices: choices
            }
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: 'Submit'
            }
        ],
        $schema: 'http://adaptivecards.io/schemas/adaptive-card',
        version: '1.3'
    };

    const adaptiveCard = CardFactory.adaptiveCard(card);

    await context.sendActivity({
        type: 'message',
        attachments: [adaptiveCard]
    });
}

module.exports = { selectFields };
