const { CardFactory } = require('botbuilder');
const { query } = require('../services/db');

async function getAllColumns() {
    try {
        const rawDetails = await query('PRAGMA table_info(rawDataTable)');
        const columnNames = rawDetails.map(column => column.name);
        return columnNames;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function selectFields(context) {
    const fields = await getAllColumns();

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
                text: 'I can remove data fields, please select if you want to choose fields to keep or fields to remove.',
                wrap: true
            },
            {
                type: 'Input.ChoiceSet',
                id: 'field',
                style: 'expanded',
                isMultiSelect: true,
                value: defaultSelectedValues,
                label: 'fields:',
                isRequired: true,
                errorMessage: 'Please select field',
                choices: choices
            }
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: 'Submit',
                data: {
                    step: 'step8'
                }
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

module.exports = { selectFields, getAllColumns };
