const { CardFactory } = require('botbuilder');

async function sendRiskCodesOptions(context) {
    const buttons = [
        {
            type: 'imBack',
            title: 'Class of Business',
            value: 'Class of Business'
        },
        {
            type: 'imBack',
            title: 'Original Currency Code',
            value: 'Original Currency Code'
        }
    ];

    const heroCard = CardFactory.heroCard(
        '',
        undefined,
        buttons,
        { text: 'Would you like a specific class or a group of risk codes??\n\nList to Choose From:' }
    );

    // Send the card as a message
    await context.sendActivity({
        type: 'message',
        attachments: [heroCard]
    });
}

module.exports = { sendRiskCodesOptions };
