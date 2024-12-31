const { CardFactory } = require('botbuilder');
const { query } = require('../services/db');

async function getOptionValue(context) {
    try {
        const rawDetails = await query(`SELECT DISTINCT "${ context?.activity?.text }" FROM rawDataTable`);
        return rawDetails;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function specificClassesCard(context) {
    const options = await getOptionValue(context);

    const choices = options.map(item => ({
        title: item[`${ context?.activity?.text }`],
        value: item[`${ context?.activity?.text }`]
    }));
    const card = {
        type: 'AdaptiveCard',
        body: [
            {
                type: 'TextBlock',
                text: 'Select Specific Classes:',
                wrap: true
            },
            {
                type: 'Input.ChoiceSet',
                id: context?.activity?.text.toLowerCase().replace(/\s+/g, '_'),
                style: 'expanded',
                isMultiSelect: true,
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

module.exports = { specificClassesCard };
