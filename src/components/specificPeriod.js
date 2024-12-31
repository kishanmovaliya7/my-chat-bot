const { CardFactory } = require('botbuilder');

async function specificPeriod(context) {
    const buttons = [
        {
            type: 'imBack',
            title: 'Yes',
            value: 'Yes'
        },
        {
            type: 'imBack',
            title: 'No',
            value: 'No'
        }
    ];
    const heroCard = CardFactory.heroCard(
        '',
        undefined,
        buttons,
        { text: 'Great! Would you like the report to cover a specific period?' }
    );

    await context.sendActivity({
        type: 'message',
        attachments: [heroCard]
    });
}

module.exports = { specificPeriod };
