const { ActivityHandler, MemoryStorage, ConversationState, CardFactory } = require('botbuilder');
const { sendReportTypeOptions } = require('./src/components/sendReportTypeOptions');
const { getQuestionType } = require('./src/components/getQuestionType');
const { createDatePickerCard } = require('./src/components/createDatePickerCard');
const { sendRiskCodesOptions } = require('./src/components/sendRiskCodesOptions');
const { specificPeriod, promptForFilters } = require('./src/components/specificPeriod');
const { specificClassesCard, getOptionValue } = require('./src/components/specificClassesCard');
const { selectFields, getAllColumns } = require('./src/components/selectFields');
const { generateReport } = require('./src/components/generateReport');
const { downloadPDFReport } = require('./src/components/downloadPDFReport');
const { saveReport } = require('./src/components/saveReport');
const { downloadExcelReport } = require('./src/components/downloadExcelReport');
const { getTableDataFromQuery } = require('./src/components/getTableDataFromQuery');
const { AzureOpenAI } = require('openai');

// Azure OpenAI Configuration
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY; // Use API Key or Token Provider
const modelDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'depmodel';

const client = new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion: '2024-08-01-preview',
    deployment: modelDeployment
});

class EchoBot extends ActivityHandler {
    constructor() {
        super();

        const memoryStorage = new MemoryStorage();
        this.conversationState = new ConversationState(memoryStorage);
        this.conversationStateAccessor = this.conversationState.createProperty('reportState');
        this.selectedValuesAccessor = this.conversationState.createProperty('selectedValues');
        this.optionFieldValueAccessor = this.conversationState.createProperty('fieldValues');

        this.onMessage(async (context, next) => {
            try {
                const userMessage = context?.activity?.text?.toLowerCase() || (typeof context?.activity?.value === 'string' ? context?.activity?.value?.toLowerCase() : null);
                const state = await this.conversationStateAccessor.get(context, { currentStep: 1 });
                const selectedValues = await this.selectedValuesAccessor.get(context, {});
                const fieldValues = await this.optionFieldValueAccessor.get(context, []);

                // Validate if the conversation should be reset
                if (userMessage === 'restart' || userMessage === 'start over') {
                    await this.resetConversation(context, state);
                    await getQuestionType(context);
                    return await next();
                }
                const stepCount = context.activity.channelData?.messageBack?.displayText || context.activity.value?.step;
                if (stepCount) {
                    state.currentStep = parseInt(stepCount.slice(4));
                }
                switch (state.currentStep) {
                case 1:
                    try {
                        let ans = null;
                        if (userMessage?.toLowerCase() === 'q&a' || userMessage?.toLowerCase() === 'report') {
                            ans = userMessage;
                        } else {
                            const openaiResponse = await client.chat.completions.create({
                                messages: [
                                    {
                                        role: 'user',
                                        content: `Question: choose an option
                                        Option1: Q&A
                                        option2: report Generation
                                        If user select option1 then return only "q&a".
                                        If user selects option2 then return only "report".
                                        User answer is '${ userMessage }'
                                        Return only one word based on the selection.
                                        `
                                    }
                                ],
                                model: 'gpt-4',
                                max_tokens: 2
                            });
                            ans = openaiResponse.choices[0].message.content.trim();
                        }
                        if (ans?.toLowerCase() === 'q&a') {
                            await context.sendActivity('You have selected Q&A. \n Ask your question, and Bot will assist you promptly.');
                            state.currentStep = 99;
                        } else if (ans?.toLowerCase() === 'report') {
                            await sendReportTypeOptions(context);
                            state.currentStep = 2;
                        } else {
                            await context.sendActivity('Please select valid option');
                        }
                    } catch (error) {
                        await context.sendActivity(
                            'Sorry, We could not process with your answer.'
                        );
                    }
                    break;
                case 2: {
                    const reportChoices = ['Policy', 'Premium', 'Claims'];
                    const reportType = (context?.activity?.value?.Report);
                    let ans = null;

                    try {
                        if (reportChoices.includes(reportType)) {
                            ans = reportType;
                        } else {
                            const openaiResponse = await client.chat.completions.create({
                                messages: [
                                    {
                                        role: 'user',
                                        // content: `Question: choose an option
                                        // Option1: Policy
                                        // Option2: Premium
                                        // Option3: Claims
                                        // If user selects option1 then return only "Policy".
                                        // If user selects option2 then return only "Premium".
                                        // If user selects option3 then return only "Claims".
                                        // User answer is '${ userMessage }'
                                        // Return only one word based on the selection.
                                        // `
                                        content: `Select:
                                        Policy
                                        Premium
                                        Claims
                                        Input: ${ userMessage }
                                        Return one word.`
                                    }
                                ],
                                model: 'gpt-4',
                                max_tokens: 2
                            });

                            ans = openaiResponse.choices[0].message.content.trim();
                        }
                        if (reportChoices.includes(ans)) {
                            selectedValues.reportType = ans;
                            await promptForFilters(context);
                            await specificPeriod(context, ans);
                            state.currentStep = 3;
                        } else {
                            await context.sendActivity('Please select one or more datasets that you would like to compile from.');
                        }
                    } catch (error) {
                        await context.sendActivity(
                            'Sorry, We could not process with your answer.'
                        );
                    }
                    break;
                }
                case 3: {
                    let ans = null;
                    try {
                        if (userMessage === 'yes' || userMessage === 'no') {
                            ans = userMessage;
                        } else {
                            const openaiResponse = await client.chat.completions.create({
                                messages: [
                                    {
                                        role: 'user',
                                        // content: `Question: choose an option
                                        // Option1: Yes
                                        // Option2: No
                                        // If user selects option1 then return only "yes".
                                        // If user selects option2 then return only "no".
                                        // User answer is '${ userMessage }'
                                        // Return only one word based on the selection.
                                        // `
                                        content: `Select:
                                        yes
                                        no
                                        Input: ${ userMessage }
                                        Return one word.`
                                    }
                                ],
                                model: 'gpt-4',
                                max_tokens: 2
                            });

                            ans = openaiResponse.choices[0].message.content.trim();
                        }
                        if (ans === 'yes') {
                            const datePickerCard = await createDatePickerCard();
                            await context.sendActivity({ attachments: [datePickerCard] });
                            selectedValues.period = { startDate: '', endDate: '' };
                            state.currentStep = 4;
                        } else if (ans === 'no') {
                            await sendRiskCodesOptions(context);
                            state.currentStep = 5;
                        } else {
                            await context.sendActivity('Invalid selection. Please choose "yes" or "no".');
                        }
                    } catch (error) {
                        await context.sendActivity(
                            'Sorry, We could not process with your answer.'
                        );
                    }
                    break;
                }
                case 4: {
                    let ans = null;
                    const dates = context.activity.value;

                    try {
                        if (dates?.startDate || dates?.endDate) {
                            ans = {
                                startDate: dates?.startDate,
                                endDate: dates?.endDate
                            };
                        } else {
                            const openaiResponse = await client.chat.completions.create({
                                messages: [
                                    {
                                        role: 'user',
                                        // content: `Question: Validate if these dates are acceptable
                                        // User answer is '${ userMessage }'

                                        // Rules:
                                        // 1. Start date must be before end date
                                        // 2. Dates should not be empty

                                        // If dates are valid return only in this exact format: {"startDate": "DD-MM-YYYY", "endDate": "DD-MM-YYYY"}
                                        // If dates are invalid return only "no".`
                                        content: `${ userMessage }
                                        Return only:
                                        Valid -> {"startDate": "DD-MM-YYYY", "endDate": "DD-MM-YYYY"}
                                        Invalid -> "no"`
                                    }
                                ],
                                model: 'gpt-4',
                                max_tokens: 50
                            });
                            ans = openaiResponse.choices[0].message.content.trim();
                            ans = JSON.parse(ans);
                        }

                        if (ans.startDate || ans.endDate) {
                            selectedValues.period = {
                                startDate: ans.startDate,
                                endDate: ans.endDate
                            };
                            await sendRiskCodesOptions(context);
                            state.currentStep = 5;
                        } else {
                            await context.sendActivity('Invalid dates, please enter valid dates "DD-MM-YYYY" formate');
                        }
                    } catch (error) {
                        await context.sendActivity('Sorry, We could not process your dates.');
                    }
                    break;
                }
                // shorten prompt is pending for this step
                case 5: {
                    let ans = null;
                    try {
                        if (userMessage.includes('business') || userMessage.includes('currency')) {
                            ans = userMessage;
                        } else {
                            const openaiResponse = await client.chat.completions.create({
                                messages: [
                                    {
                                        role: 'user',
                                        content: `Question: choose an option
                                        Option1: class of business
                                        option2: original currency code
                                        If user select option1 then return only "class of business".
                                        If user selects option2 then return only "original currency code".
                                        User answer is '${ userMessage }'
                                        Return only one word based on the selection.
                                        `
                                        // content: `Choose: Option1 -business, Option2 - currency. Selected: '${ userMessage }'. Return only one word based on the selection`
                                    }
                                ],
                                model: 'gpt-4',
                                max_tokens: 10
                            });
                            ans = openaiResponse.choices[0].message.content.trim().toLowerCase();
                        }
                        if (ans.includes('business') || ans.includes('currency')) {
                            await specificClassesCard(context, ans);

                            const fields = await getOptionValue(ans);
                            fieldValues.push(fields);

                            state.currentStep = 6;
                        } else {
                            await context.sendActivity('Please select valid option');
                        }
                    } catch (error) {
                        await context.sendActivity(
                            'Sorry, We could not process with your answer.'
                        );
                    }
                    break;
                }
                case 6: {
                    const riskCode = context.activity.value;

                    let ans = null;
                    try {
                        if (riskCode) {
                            ans = riskCode;
                        } else {
                            const fieldOptions = fieldValues.flat().map((item, index) => `option${ index + 1 }: ${ Object.values(item)[0] }`);
                            const selectedColumnType = fieldValues.flat().map(item => Object.keys(item)[0])[0];

                            const selectedOptions = fieldValues.flat().map((item, index) => `If user select option${ index + 1 } then return only ${ Object.values(item)[0] }`);

                            const openaiResponse = await client.chat.completions.create({
                                messages: [
                                    {
                                        role: 'user',
                                        content: `Question: choose an option
                                        ${ fieldOptions }
                                        ${ selectedOptions }
                                        User answer is '${ userMessage }'
                                        If user selects "select all", return all field options.
                                        If user selects options, return them as a JSON object: e.g. '{ ${ selectedColumnType === 'Class of Business' ? 'class_of_business' : 'original_currency_code' }: "OIL & GAS PACKAGE, CAR" }'.
                                        Return only one word based on the selection.
                                        Only provide the field in the exact format as shown.
                                        `
                                        // content: `Choose an option:
                                        // ${ fieldOptions }
                                        // ${ selectedOptions }
                                        // User answer: '${ userMessage }'
                                        // If user selects "select all", return all options.
                                        // If user selects options, return as JSON: '{ ${ selectedColumnType === 'Class of Business' ? 'class_of_business' : 'original_currency_code' }: "OIL & GAS PACKAGE, CAR" }'.
                                        // Return only one word based on the selection in the exact format.
                                        // `
                                    }
                                ],
                                model: 'gpt-4',
                                max_tokens: 100
                            });
                            ans = openaiResponse.choices[0].message.content.trim();
                        }

                        if (ans) {
                            selectedValues.riskCode = ans;
                            const heroCard = CardFactory.heroCard(
                                '',
                                undefined,
                                [
                                    { type: 'messageBack', title: 'Yes', value: 'Yes', displayText: 'step7' },
                                    { type: 'messageBack', title: 'No', value: 'No', displayText: 'step7' }
                                ],
                                { text: 'Question 3 of 5: \n\n Would you like all available fields in the report?' }
                            );
                            await context.sendActivity({ attachments: [heroCard] });
                            state.currentStep = 7;
                        } else {
                            await context.sendActivity('Please select valid option');
                        }
                    } catch (error) {
                        await context.sendActivity(
                            'Sorry, We could not process with your answer.'
                        );
                    }
                    break;
                }
                case 7: {
                    let ans = null;
                    try {
                        if (userMessage === 'yes' || userMessage === 'no') {
                            ans = userMessage;
                        } else {
                            const openaiResponse = await client.chat.completions.create({
                                messages: [
                                    {
                                        role: 'user',
                                        // content: `Question: choose an option
                                        // Option1: Yes
                                        // Option2: No
                                        // If user selects option1 then return only "yes".
                                        // If user selects option2 then return only "no".
                                        // User answer is '${ userMessage }'
                                        // Return only one word based on the selection.
                                        // `
                                        content: `Select:
                                        yes
                                        no
                                        Input: ${ userMessage }
                                        Return one word.`
                                    }
                                ],
                                model: 'gpt-4',
                                max_tokens: 2
                            });

                            ans = openaiResponse.choices[0].message.content.trim();
                        }
                        if (ans === 'yes') {
                            await generateReport(context);
                            selectedValues.field = 'all';
                            state.currentStep = 9;
                        } else if (ans === 'no') {
                            await selectFields(context);
                            state.currentStep = 8;
                        } else {
                            await context.sendActivity('Invalid selection. Please choose "yes" or "no".');
                        }
                    } catch (error) {
                        await context.sendActivity(
                            'Sorry, We could not process with your answer.'
                        );
                    }
                    break;
                }
                case 8: {
                    let ans = null;
                    const fields = context.activity.value?.field;

                    try {
                        if (fields) {
                            ans = fields;
                        } else {
                            const fieldOptions = await getAllColumns();
                            const selectedOptions = fieldOptions.map((item, index) => `If user select option${ index + 1 } then return only ${ item }`);

                            const openaiResponse = await client.chat.completions.create({
                                messages: [
                                    {
                                        role: 'user',
                                        content: `choose an option
                                        ${ fieldOptions }
                                        ${ selectedOptions }
                                        User answer is '${ userMessage }'
                                        If the user selects options, return them as a comma-separated string, e.g., 'Policy Reference, Original Insured'.
                                        If the user deselects any option, exclude those from the returned string.
                                        Return only the selected options in a comma-separated format, without any explanation. 
                                        Example: If the user deselects 'Policy Reference' and 'Original Insured', return: 'Territory, Insured, Start Date, Expiry Date'.
                                        Ensure that the list accurately reflects the options selected and deselected by the user, in the exact format as provided.
                                        `
                                        // content: `Choose an option: ${ fieldOptions } ${ selectedOptions }
                                        // User's answer: '${ userMessage }'
                                        // Return selected options as a comma-separated string, excluding any deselected ones. Example: 'Territory, Insured, Start Date' if 'Policy Reference' and 'Original Insured' are deselected.`
                                    }
                                ],
                                model: 'gpt-4',
                                max_tokens: 100
                            });
                            ans = openaiResponse.choices[0].message.content.trim();
                            console.log('ans----------', ans);
                        }

                        if (ans) {
                            await generateReport(context);
                            selectedValues.field = ans;
                            state.currentStep = 9;
                        } else {
                            await context.sendActivity('Please select valid option');
                        }
                    } catch (error) {
                        await context.sendActivity(
                            'Sorry, We could not process with your answer.'
                        );
                    }
                    break;
                }
                case 9: {
                    let ans = null;
                    try {
                        if (userMessage === 'pdf' || userMessage === 'excel') {
                            ans = userMessage;
                        } else {
                            const openaiResponse = await client.chat.completions.create({
                                messages: [
                                    {
                                        role: 'user',
                                        content: `Question: choose an option
                                        Option1: pdf
                                        Option2: excel
                                        If user selects option1 then return only "pdf".
                                        If user selects option2 then return only "excel".
                                        User answer is '${ userMessage }'
                                        Return only one word based on the selection.
                                        `
                                    }
                                ],
                                model: 'gpt-4',
                                max_tokens: 10
                            });

                            ans = openaiResponse.choices[0].message.content.trim();
                        }
                        if (ans === 'pdf' || ans === 'excel') {
                            ans === 'pdf'
                                ? await downloadPDFReport(context, selectedValues)
                                : await downloadExcelReport(context, selectedValues);
                            const heroCard = CardFactory.heroCard(
                                '',
                                undefined,
                                [
                                    { type: 'imBack', title: 'Yes', value: 'Yes' },
                                    { type: 'imBack', title: 'No', value: 'No' }
                                ],
                                { text: 'Question 5 of 5: \n\n Would you like this report saved for future use?' }
                            );
                            await context.sendActivity({ attachments: [heroCard] });
                            state.currentStep = 10;
                        } else {
                            await context.sendActivity('Invalid selection. Please choose "yes" or "no".');
                        }
                    } catch (error) {
                        await context.sendActivity(
                            'Sorry, We could not process with your answer.'
                        );
                    }
                    break;
                }
                case 10: {
                    if (userMessage === 'yes') {
                        await saveReport(context, selectedValues);
                    } else {
                        await context.sendActivity('Thank you!');
                    }
                    break;
                }
                case 99: {
                    await getTableDataFromQuery(context);
                    await context.sendActivity('Type "restart" to begin a new query.');
                    break;
                }

                default:
                    await this.resetConversation(context, state);
                    await getQuestionType(context);
                    break;
                }

                await this.conversationState.saveChanges(context);
                await this.selectedValuesAccessor.set(context, selectedValues);
                await this.optionFieldValueAccessor.set(context, fieldValues);
                await next();
            } catch (error) {
                await context.sendActivity('An error occurred. Let\'s start over.');
                await this.resetConversation(context, await this.conversationStateAccessor.get(context));
                await getQuestionType(context);
                await next();
            }
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    await getQuestionType(context);
                    break;
                }
            }
            await next();
        });
    }

    async resetConversation(context, state) {
        state.currentStep = 1;
        await this.selectedValuesAccessor.set(context, {});
        await this.conversationState.saveChanges(context);
    }
}

module.exports.EchoBot = EchoBot;
