const { CardFactory } = require('botbuilder');

async function editOptions(context) {
    const heroCard = CardFactory.heroCard(
        '',
        undefined,
        [
            {
                type: 'messageBack',
                title: 'Save',
                text: 'Save',
                value: {step: 'step22', data:'Save'},
                displayText: 'Save'
            },
            {
                type: 'messageBack',
                title: 'Cancel',
                text: 'Cancel',
                value: {step: 'step22', data:'Cancel'},
                displayText: 'Cancel'
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
                text: "Yes",
                value: {step: 'step11', data:'Yes'},
                displayText: 'Yes'
            },
            {
                type: 'messageBack',
                title: 'No',
                text: "No",
                value: {step: 'step11', data:'No'},
                displayText: 'No'
            }
        ],
        { text: 'Question 5 of 5: \n\n Would you like this report saved for future use?' }
    );
    await context.sendActivity({ attachments: [heroCard] });
}

module.exports = { editOptions, saveOptions };
