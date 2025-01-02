const { CardFactory } = require('botbuilder');

async function getQuestionType(context) {
    const buttons = [
        {
            type: 'messageBack',
            title: 'Question on the data with an answer',
            value: 'q&a',
            displayText: 'step1'
        },
        {
            type: 'messageBack',
            title: 'Report Generation',
            value: 'report',
            displayText: 'step1'
        }
    ];
    const heroCard = CardFactory.heroCard(
        '',
        undefined,
        buttons,
        { text: 'Welcome to Fusion Assistant! \n\n How can I help you get started today?' }
    );

    await context.sendActivity({
        type: 'message',
        attachments: [heroCard]
    });
}

module.exports = { getQuestionType };
