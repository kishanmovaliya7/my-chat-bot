const { CardFactory } = require('botbuilder');

async function getQuestionType(context) {
    const buttons = [
        {
            type: 'imBack',
            title: 'Question on the data with an answer',
            value: 'Data with an Answer'
        },
        {
            type: 'imBack',
            title: 'Report Generation',
            value: 'Report'
        }
    ];
    const heroCard = CardFactory.heroCard(
        'Choose an option',
        undefined,
        buttons
    );

    await context.sendActivity({
        type: 'message',
        attachments: [heroCard]
    });
}

module.exports = { getQuestionType };
