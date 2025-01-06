const { CardFactory } = require('botbuilder');

async function promptForFilters(context) {
    const card = {
        type: 'AdaptiveCard',
        body: [
            {
                type: 'TextBlock',
                text: 'I will now ask you a series of questions to set filters and ensure I can provide the right report you\'re looking for. Please help me by answering these five questions.',
                wrap: true
            }
        ],
        actions: [],
        $schema: 'http://adaptivecards.io/schemas/adaptive-card',
        version: '1.3'
    };

    const adaptiveCard = CardFactory.adaptiveCard(card);

    await context.sendActivity({
        type: 'message',
        attachments: [adaptiveCard]
    });
}

async function specificPeriod(context, ans) {
    const buttons = [
        {
            type: 'messageBack',
            title: 'Yes',
            text: 'Yes',
            value: {step: 'step3', data: 'Yes'},
            displayText: 'Yes'
        },
        {
            type: 'messageBack',
            title: 'No',
            text: 'No',
            value: {step: 'step3', data: 'No'},
            displayText: 'No'
        }
    ];
    const heroCard = CardFactory.heroCard(
        '',
        undefined,
        buttons,
        { text: 'Question 1 of 5: \n\n Great, and is there a specific period you would like the report to encapsulate?' }
    );

    await context.sendActivity({
        type: 'message',
        attachments: [heroCard]
    });
}

module.exports = { specificPeriod, promptForFilters };
