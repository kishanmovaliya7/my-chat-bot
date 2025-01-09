const { CardFactory } = require('botbuilder');
const { query } = require('../services/db');

async function getAllColumns(reportType) {
    try {
        const listOfTables = reportType?.split(',');
        
        let columnNames = []
        if(listOfTables?.length) {
            for (const table of listOfTables) {
                const rawDetails = await query(`PRAGMA table_info(${table.trim()})`);
                columnNames = [...columnNames, ...rawDetails.map(column => `${table}.'${column.name}'`)];
            }
        }
        return columnNames;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function selectFields(context, reportType, selectedField) {
    const fields = await getAllColumns(reportType);
    
    const choices = fields.map(item => ({
        title: item.replace('.', ". "),
        value: item
    }));
    // Default selected values
    const defaultSelectedValues = choices.map(choice => choice.value).join(',');
    const defaultFields = selectedField || defaultSelectedValues;

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
                value: defaultFields,
                label: 'Fields:',
                isRequired: true,
                "separator": true,
                errorMessage: 'Please select field',
                choices: choices
            }
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: 'Submit',
                data: {
                    step: 'step9'
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

const askForFieldconfirmation = async(context) => {
const heroCard = CardFactory.heroCard(
                    '',
                    undefined,
                    [
                      {
                        type: 'messageBack',
                        title: 'Yes',
                        value: {step: 'step8', data: 'Yes'},
                        text: "yes",
                        displayText: 'Yes',
                      },
                      {
                        type: 'messageBack',
                        title: 'No',
                        value: {step: 'step8', data: 'no'},
                        text: "no",
                        displayText: 'No',
                      },
                    ],
                    {
                      text: 'Question 3 of 5: \n\n Would you like all available fields in the report?',
                    }
                  );
                  await context.sendActivity({ attachments: [heroCard] });
                  
}

module.exports = { selectFields, getAllColumns, askForFieldconfirmation };
