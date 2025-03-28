const { CardFactory } = require('botbuilder');
const { query } = require('../services/db');
const { generateSQl } = require('./getTableDataFromQuery');

async function getOptionValue(ans) {
    const riskCodeSelected = ans.includes('business') ? 'Class_of_Business' : 'Original_Currency_Code';
    try {
        const sql = await generateSQl(`give me list of ${riskCodeSelected}`);

        const rawDetails = await query(sql || `SELECT DISTINCT "${ riskCodeSelected }" FROM Policy`);

        return rawDetails;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function specificClassesCard(context, ans, parsedObject = '') {
    const riskCodeSelected = ans.includes('business') ? 'Class_of_Business' : 'Original_Currency_Code';

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
                value: `${ ans === 'business' ? parsedObject.ClassOfBusiness : parsedObject.OriginalCurrencyCode}`,
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
                    step: ans.includes('business') ?'step6' : 'step7'
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
