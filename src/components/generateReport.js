const { CardFactory } = require('botbuilder');

async function generateReport(context) {
    const buttons = [
        {
            type: 'messageBack',
            title: 'PDF',
            value: {step: 'step10', data:'PDF'},
            text: 'PDF',
            displayText: 'PDF'
        },
        {
            type: 'messageBack',
            title: 'Excel',
            text:"Excel",
            value: {step: 'step10', data:'Excel'},
            displayText: 'Excel'
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
