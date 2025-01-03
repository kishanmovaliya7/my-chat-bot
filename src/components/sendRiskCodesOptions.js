const { CardFactory } = require('botbuilder');

async function sendRiskCodesOptions(context) {
    const buttons = [
        {
            type: 'messageBack',
            title: 'Class of Business',
            text: 'Class of Business',
            value: {step: 'step5', data: 'Class of Business'},
            displayText: 'Class of Business'
        },
        {
            type: 'messageBack',
            title: 'Original Currency Code',
            text: 'Original Currency Code',
            value: {step: 'step5', data: 'Original Currency Code'},
            displayText: 'Original Currency Code'
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
