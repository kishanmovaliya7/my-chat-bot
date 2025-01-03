const { CardFactory } = require('botbuilder');

async function schedulerForm(context) {
    const card = {
        type: 'AdaptiveCard',
        body: [
            {
                type: 'Input.Text',
                id: 'minute',
                placeholder: 'Enter between 0 - 60',
                label: 'Minute',
                isRequired: true,
                errorMessage: 'Enter between 0 - 60',
                maxLength: 2
            },
            {
                type: 'Input.Text',
                id: 'hour',
                placeholder: 'Enter hour between 0 - 23',
                label: 'Hour',
                isRequired: true,
                errorMessage: 'Please enter hour between 0 - 23',
                maxLength: 2
            },
            {
                type: 'Input.Text',
                id: 'day',
                placeholder: 'Enter between 0 - 31',
                label: 'Day',
                isRequired: true,
                errorMessage: 'Enter day between 0 - 31',
                maxLength: 2
            },
            {
                type: 'Input.Text',
                id: 'week',
                placeholder: 'Enter between 0 - 6',
                label: 'Week',
                isRequired: true,
                errorMessage: 'Enter week between 0 - 6',
                maxLength: 1
            },
            {
                type: 'Input.Text',
                id: 'month',
                placeholder: 'Enter between 0 - 12',
                label: 'Minute',
                isRequired: true,
                errorMessage: 'Enter month between 0 - 12',
                maxLength: 2
            }
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: 'OK',
                data: {step: 'step14'}
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

async function askForToEmail(context) {
    const card = {
        type: 'AdaptiveCard',
        body: [
            {
                type: 'Input.Text',
                id: 'email',
                placeholder: 'Enter receiver email',
                label: 'To Email',
                isRequired: true,
                errorMessage: 'Please enter valid email',
            },
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: 'OK',
                data: {step: 'step17'}
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

async function AskforEmailConfirmation(context) {
    const heroCard = CardFactory.heroCard(
        '',
        undefined,
        [
            {
                type: 'messageBack',
                title: 'Yes',
                text: 'Yes',
                value: {step:'step15',data:'Yes'},
                displayText: 'Yes'
            },
            {
                type: 'messageBack',
                title: 'No',
                text: 'No',
                value: {step:'step15',data:'No'},
                displayText: 'No'
            }
        ],
        { text: 'Scheduler has been set! \n\n Shall I email this to you every time?' }
    );
    await context.sendActivity({ attachments: [heroCard] });
}

async function AskforOtherEmailConfirmation(context) {
    const heroCard = CardFactory.heroCard(
        '',
        undefined,
        [
            {
                type: 'messageBack',
                title: 'Yes',
                text: 'Yes',
                value: {step:'step16',data:'Yes'},
                displayText: 'Yes'
            },
            {
                type: 'messageBack',
                title: 'No',
                text: 'No',
                value: {step:'step16',data:'No'},
                displayText: 'No'
            }
        ],
        { text: 'Would you like to add another email to receive this report?' }
    );
    await context.sendActivity({ attachments: [heroCard] });
}

async function AskforSchedulerConfirmation(context) {
    const heroCard = CardFactory.heroCard(
        '',
        undefined,
        [
            {
                type: 'messageBack',
                title: 'Yes',
                text: 'Yes',
                value: {step:'step13',data:'Yes'},
                displayText: 'Yes'
            },
            {
                type: 'messageBack',
                title: 'No',
                text: 'No',
                value: {step:'step13',data:'No'},
                displayText: 'No'
            }
        ],
        { text: 'Would you like to scheduler this to run on specific dates?' }
    );
    await context.sendActivity({ attachments: [heroCard] });
}

module.exports = { schedulerForm, AskforSchedulerConfirmation, AskforOtherEmailConfirmation, AskforEmailConfirmation, askForToEmail };
