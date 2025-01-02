const { CardFactory } = require('botbuilder');

async function generateReport(context) {
    const buttons = [
        {
            type: 'messageBack',
            title: 'PDF',
            value: 'PDF',
            displayText: 'step9'
        },
        {
            type: 'messageBack',
            title: 'Excel',
            value: 'Excel',
             displayText: 'step9'
        }
    ];
    const heroCard = CardFactory.heroCard(
        '',
        undefined,
        buttons,
        { text: 'Question 4 of 5: \n\n How would you like to save the report?\n\nOptions to Choose From:' }
    );

    await context.sendActivity({
        type: 'message',
        attachments: [heroCard]
    });
}

module.exports = { generateReport };
