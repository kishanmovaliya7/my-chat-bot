const { CardFactory } = require('botbuilder');

async function generateReport(context) {
    const buttons = [
        {
            type: 'imBack',
            title: 'PDF',
            value: 'PDF'
        },
        {
            type: 'imBack',
            title: 'Excel',
            value: 'Excel'
        }
    ];
    const heroCard = CardFactory.heroCard(
        '',
        undefined,
        buttons,
        { text: 'How would you like to save the report?\n\nOptions to Choose From:' }
    );

    await context.sendActivity({
        type: 'message',
        attachments: [heroCard]
    });
}

module.exports = { generateReport };
