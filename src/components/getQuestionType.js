const { CardFactory } = require('botbuilder');

async function getQuestionType(context) {
    const buttons = [
        {
            type: 'messageBack',
            title: 'Question on the data with an answer',
            value: {step: 'step1', data:'q&a'},
            displayText: 'Question and Answer',
        },
        {
            type: 'messageBack',
            title: 'Report Generation',
            text: 'Report Generation',
            value: {step: 'step1', data:'report'},
            displayText: 'Report Generation'
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
