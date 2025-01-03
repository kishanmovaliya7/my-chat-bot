const { CardFactory } = require('botbuilder');

async function savedFileName(context) {
    const card = {
        type: 'AdaptiveCard',
        body: [
            {
                type: 'Input.Text',
                id: 'filename',
                placeholder: 'Enter file name for future use',
                label: 'Enter file Name:',
                isRequired: true,
                errorMessage: 'Please enter file name',
                maxLength: 500
            }
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: 'OK',
                data: {step: 'step11'}
            }
        ],
        $schema: 'http://adaptivecards.io/schemas/adaptive-card',
        version: '1.3'
    };

    const adaptiveCard = CardFactory.adaptiveCard(card);

    await context.sendActivity({
        type: 'message',
        attachments: [adaptiveCard]
    });
}

module.exports = { savedFileName };
