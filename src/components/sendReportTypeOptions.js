const { CardFactory } = require('botbuilder');

async function sendReportTypeOptions(context) {
    const card = {
        type: 'AdaptiveCard',
        $schema: 'http://adaptivecards.io/schemas/adaptive-card',
        version: '1.3',
        body: [
            {
                label: 'Of Course! \n\n Zoe and Steve have taught me how to run reports on Policy, Premium and Claims data.\n\n Which would you like it compiled from?',
                type: 'Input.ChoiceSet',
                id: 'Report',
                style: 'expanded',
                isRequired: true,
                errorMessage: 'Please select one or more datasets that you would like to compile from.',
                isMultiSelect: true,
                choices: [
                    {
                        title: 'Policy',
                        value: 'Policy',
                    },
                    {
                        title: 'Premium',
                        value: 'Premium'
                    },
                    {
                        title: 'Claims',
                        value: 'Claims'
                    },
                    {
                        title: 'Combine',
                        value: 'Combine'
                    }
                ]
            }
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: 'Submit',
                data: {
                    step: 'step2'
                }
            }
        ]
    };

    const adaptiveCard = CardFactory.adaptiveCard(card);

    await context.sendActivity({
        type: 'message',
        attachments: [adaptiveCard]
    });
}

module.exports = { sendReportTypeOptions };
