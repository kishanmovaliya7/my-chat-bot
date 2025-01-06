const { CardFactory } = require('botbuilder');

async function getQuestionType(context) {
    const buttons = [
        {
            type: 'messageBack',
            title: 'Ask a Question',
            text: 'q&a',
            value: {step: 'step1', data:'q&a'},
            displayText: 'Ask a Question',
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
        { text: 'Welcome to Fusion Assistant! \n\n Hey there! 😊 How can I assist you today?' }
    );

    await context.sendActivity({
        type: 'message',
        attachments: [heroCard]
    });
}

module.exports = { getQuestionType };
