const { CardFactory } = require('botbuilder');

async function editOptions(context) {
    const heroCard = CardFactory.heroCard(
        '',
        undefined,
        [
            {
                type: 'messageBack',
                title: 'Save',
                value: 'Save',
                displayText: 'step22'
            },
            {
                type: 'messageBack',
                title: 'Cancel',
                value: 'Cancel',
                displayText: 'step22'
            }
        ],
        { text: 'Question 5 of 5: \n\n Would you like this report saved?' }
    );
    await context.sendActivity({ attachments: [heroCard] });
}

async function saveOptions(context) {
    const heroCard = CardFactory.heroCard(
        '',
        undefined,
        [
            {
                type: 'messageBack',
                title: 'Yes',
                value: 'Yes',
                displayText: 'step10'
            },
            {
                type: 'messageBack',
                title: 'No',
                value: 'No',
                displayText: 'step10'
            }
        ],
        { text: 'Question 5 of 5: \n\n Would you like this report saved for future use?' }
    );
    await context.sendActivity({ attachments: [heroCard] });
}

module.exports = { editOptions, saveOptions };
