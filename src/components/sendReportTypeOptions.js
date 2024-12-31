const { CardFactory } = require('botbuilder');

async function sendReportTypeOptions(context) {
    const card = {
        type: 'AdaptiveCard',
        body: [
            {
                type: 'TextBlock',
                text: 'Of course! I can help generate reports based on Policy, Premium, or Claims data.\n\n Which dataset would you like to use?',
                size: 'small'
            },
            {
                type: 'TextBlock',
                text: 'List to Choose From:',
                size: 'medium'
            },
            {
                type: 'Input.ChoiceSet',
                id: 'Report',
                style: 'expanded',
                isMultiSelect: false,
                choices: [
                    {
                        title: 'Policy',
                        value: 'Policy'
                    },
                    {
                        title: 'Premium',
                        value: 'Premium'
                    },
                    {
                        title: 'Claims',
                        value: 'Claims'
                    }
                ]
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

module.exports = { sendReportTypeOptions };
