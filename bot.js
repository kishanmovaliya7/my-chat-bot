const { ActivityHandler, MemoryStorage, ConversationState, CardFactory } = require('botbuilder');
const { sendReportTypeOptions } = require('./src/components/sendReportTypeOptions');
const { getQuestionType } = require('./src/components/getQuestionType');
const { createDatePickerCard } = require('./src/components/createDatePickerCard');
const { sendRiskCodesOptions } = require('./src/components/sendRiskCodesOptions');
const { specificPeriod } = require('./src/components/specificPeriod');
const { specificClassesCard } = require('./src/components/specificClassesCard');
const { selectFields } = require('./src/components/selectFields');
const { generateReport } = require('./src/components/generateReport');
const { downloadPDFReport } = require('./src/components/downloadPDFReport');
const { saveReport } = require('./src/components/saveReport');
const { downloadExcelReport } = require('./src/components/downloadExcelReport');
const { getTableDataFromQuery } = require('./src/components/getTableDataFromQuery');

class EchoBot extends ActivityHandler {
    constructor() {
        super();

        const memoryStorage = new MemoryStorage();
        this.conversationState = new ConversationState(memoryStorage);
        this.conversationStateAccessor = this.conversationState.createProperty('reportState');
        this.selectedValuesAccessor = this.conversationState.createProperty('selectedValues');

        this.onMessage(async (context, next) => {
            const userMessage = context?.activity?.text?.toLowerCase();
            const state = await this.conversationStateAccessor.get(context, { currentStep: 1 });
            const selectedValues = await this.selectedValuesAccessor.get(context, {});

            switch (state.currentStep) {
            case 1:
                if (userMessage.includes('data')) {
                    await context.sendActivity('ask your question');
                    state.currentStep = 99;
                } else {
                    await sendReportTypeOptions(context);
                    state.currentStep = 2;
                }
                break;

            case 2: {
                const reportChoices = ['Policy', 'Premium', 'Claims'];
                const reportType = context?.activity?.value?.Report;

                if (reportChoices.includes(reportType)) {
                    selectedValues.reportType = reportType;
                    await specificPeriod(context);
                    state.currentStep = 3;
                } else {
                    await context.sendActivity('Please select from: Policy, Premium or Claims.');
                }
                break;
            }

            case 3:
                if (userMessage === 'yes') {
                    const datePickerCard = await createDatePickerCard();
                    await context.sendActivity({ attachments: [datePickerCard] });

                    selectedValues.period = {
                        startDate: '',
                        endDate: ''
                    };
                    state.currentStep = 4;
                } else {
                    await sendRiskCodesOptions(context);
                    state.currentStep = 5;
                }
                break;

            case 4:
                if (context.activity.value) {
                    const { startDate, endDate } = context.activity.value;

                    selectedValues.period.startDate = startDate;
                    selectedValues.period.endDate = endDate;
                }
                await sendRiskCodesOptions(context);
                state.currentStep = 5;
                break;

            case 5: {
                const riskCodesChoices = ['Class of Business', 'Original Currency Code'];
                if (riskCodesChoices.includes(context?.activity?.text)) {
                    await specificClassesCard(context);
                    state.currentStep = 6;
                } else {
                    await context.sendActivity('Please select from: Class of Business or Original Currency Code.');
                }
                break;
            }
            case 6: {
                selectedValues.riskCode = context.activity.value;

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
                    { text: 'Would you like all available fields in the report?' }
                );
                await context.sendActivity({
                    type: 'message',
                    attachments: [heroCard]
                });
                state.currentStep = 7;
                break;
            }

            case 7:
                if (userMessage === 'yes') {
                    await generateReport(context);
                    selectedValues.field = 'all';
                    state.currentStep = 10;
                } else if (userMessage === 'no') {
                    await selectFields(context);
                    state.currentStep = 9;
                }
                break;

            case 9:
                await generateReport(context);
                selectedValues.field = context.activity.value.field;
                state.currentStep = 10;
                break;

            case 10: {
                userMessage === 'pdf' ? await downloadPDFReport(context, selectedValues) : await downloadExcelReport(context, selectedValues);

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
                    { text: 'Would you like this report saved for future use?' }
                );
                await context.sendActivity({
                    type: 'message',
                    attachments: [heroCard]
                });
                state.currentStep = 11;
                break;
            }

            case 11 :
                if (userMessage === 'yes') {
                    await saveReport(context, userMessage);
                    // state.currentStep = 12;
                } else {
                    await context.sendActivity('Thank you!');
                }
                break;
            case 99 :
                await getTableDataFromQuery(context);
                break;

            default:
                await context.sendActivity('Could you be more specific?');
                break;
            }

            await this.conversationState.saveChanges(context);
            await this.selectedValuesAccessor.set(context, selectedValues);
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            let isQuestionTypeSent = false;

            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id && !isQuestionTypeSent) {
                    await getQuestionType(context);
                    isQuestionTypeSent = true;
                }
            }

            // Move to step 1 after getQuestionType
            const state = await this.conversationStateAccessor.get(context, { currentStep: 1 });
            state.currentStep = 1;
            await this.conversationState.saveChanges(context);

            await next();
        });
    }
}

module.exports.EchoBot = EchoBot;
