const { CardFactory } = require('botbuilder');
const { query } = require('../services/db');

async function getOptionValue(ans) {
    const riskCodeSelected = ans.includes('business') ? 'Class of Business' : 'Original Currency Code';
    try {
        const rawDetails = await query(`SELECT DISTINCT "${ riskCodeSelected }" FROM rawDataTable`);
        return rawDetails;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function specificClassesCard(context, ans) {
    const riskCodeSelected = ans.includes('business') ? 'Class of Business' : 'Original Currency Code';

    const options = await getOptionValue(ans);

    const choices = options.map(item => ({
        title: item[`${ riskCodeSelected }`],
        value: item[`${ riskCodeSelected }`]
    }));
    const card = {
        type: 'AdaptiveCard',
        body: [
            {
                type: 'Input.ChoiceSet',
                id: ans.replace(/\s+/g, '_'),
                style: 'expanded',
                isMultiSelect: true,
                label: `${ ans.includes('business') ? 'Choose your preferred classes…' : 'Choose your preferred Currency…' }`,
                isRequired: true,
                errorMessage: 'Please select atleast one options',
                choices: choices
            }
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: 'Submit',
                data: {
                    step: 'step6'
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

module.exports = { specificClassesCard, getOptionValue };
