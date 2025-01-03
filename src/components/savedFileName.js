const { CardFactory } = require('botbuilder');

async function savedFileName(context) {
    const card = {
        type: 'AdaptiveCard',
        body: [
            {
                type: 'Input.Text',
                id: 'filename',
                placeholder: 'enter saved report name',
                label: 'enter file name:',
                isRequired: true,
                errorMessage: 'Please enter file name',
                maxLength: 500
            }
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: 'OK'
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
