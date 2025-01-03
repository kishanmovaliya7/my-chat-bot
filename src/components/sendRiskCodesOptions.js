const { CardFactory } = require('botbuilder');

async function sendRiskCodesOptions(context) {
    const buttons = [
        {
            type: 'messageBack',
            title: 'Yes',
            text: 'Yes',
            value: {step: 'step5', data: 'Yes'},
            displayText: 'Yes'
        },
        {
            type: 'messageBack',
            title: 'No',
            text: 'No',
            value: {step: 'step5', data: 'No'},
            displayText: 'No'
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
