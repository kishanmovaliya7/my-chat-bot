const { CardFactory } = require('botbuilder');

async function sendRiskCodesOptions(context) {
    const buttons = [
        {
            type: 'messageBack',
            title: 'Class of Business',
            value: 'Class of Business',
            displayText: 'step5'
        },
        {
            type: 'messageBack',
            title: 'Original Currency Code',
            value: 'Original Currency Code',
            displayText: 'step5'
        }
    ];

    const heroCard = CardFactory.heroCard(
        '',
        undefined,
        buttons,
        { text: 'Question 2 of 5: \n\n Would you like a specific class or a group of risk codes??\n\nList to Choose From:' }
    );

    // Send the card as a message
    await context.sendActivity({
        type: 'message',
        attachments: [heroCard]
    });
}

module.exports = { sendRiskCodesOptions };
