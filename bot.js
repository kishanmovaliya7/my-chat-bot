const { ActivityHandler, MemoryStorage, ConversationState, CardFactory } = require('botbuilder');
const { sendReportTypeOptions, getSavedReportName } = require('./src/components/sendReportTypeOptions');
const { getQuestionType } = require('./src/components/getQuestionType');
const { createDatePickerCard } = require('./src/components/createDatePickerCard');
const { sendRiskCodesOptions } = require('./src/components/sendRiskCodesOptions');
const { specificPeriod, promptForFilters } = require('./src/components/specificPeriod');
const { specificClassesCard, getOptionValue } = require('./src/components/specificClassesCard');
const { selectFields, getAllColumns } = require('./src/components/selectFields');
const { generateReport } = require('./src/components/generateReport');
const { downloadPDFReport } = require('./src/components/downloadPDFReport');
const { saveReport, getSavedReport, getSingleSavedReport, editReport } = require('./src/components/saveReport');
const { downloadExcelReport } = require('./src/components/downloadExcelReport');
const { getTableDataFromQuery } = require('./src/components/getTableDataFromQuery');
const { AzureOpenAI } = require('openai');
const { savedFileName } = require('./src/components/savedFileName');
const { saveOptions, editOptions } = require('./src/components/saveReportOption');

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

function hasMatchingValue(array1, array2) {
    return array1.some(item => array2.includes(item));
}

class EchoBot extends ActivityHandler {
    constructor() {
        super();

        const memoryStorage = new MemoryStorage();
        this.conversationState = new ConversationState(memoryStorage);
        this.conversationStateAccessor = this.conversationState.createProperty('reportState');
        this.selectedValuesAccessor = this.conversationState.createProperty('selectedValues');
        this.optionFieldValueAccessor = this.conversationState.createProperty('fieldValues');
        this.savedReportAccessor = this.conversationState.createProperty('savedReport');

        this.onMessage(async (context, next) => {
            try {
                const userMessage = context?.activity?.text?.toLowerCase() || (typeof context?.activity?.value === 'string' ? context?.activity?.value?.toLowerCase() : null);
                const state = await this.conversationStateAccessor.get(context, { currentStep: 1 });
                const selectedValues = await this.selectedValuesAccessor.get(context, {});
                const fieldValues = await this.optionFieldValueAccessor.get(context, []);
                const savedReport = await this.savedReportAccessor.get(context, {});
                              

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

                        if(context?.activity?.value?.data === 'new report'){
                            await sendReportTypeOptions(context);
                            savedReport.report ={}
                            state.currentStep = 2;
                        } else if (ans?.toLowerCase() === 'q&a') {
                            await context.sendActivity('You have selected Q&A. \n Ask your question, and Bot will assist you promptly.');
                            state.currentStep = 99;
                        } else if (ans?.toLowerCase() === 'report') {
                            const data = await getSavedReport();
                            if (data) {
                                await getSavedReportName(context, data);
                                state.currentStep = 12;
                            } else {
                                await sendReportTypeOptions(context);
                                state.currentStep = 2;
                            } 
                        } else{
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
                                        content: `Identify relevant options (Policy, Premium, Claims, Combine) from the input: ${userMessage}. Return only the matching options. If none match, return "None."`
                                    }
                                ],
                                model: 'gpt-4',
                                max_tokens: 5
                            });

                            ans = openaiResponse.choices[0].message.content.trim();
                        }
                        
                        if (ans.toLowerCase().includes('combine') || hasMatchingValue(reportChoices, ans?.split(','))) {
                            selectedValues.reportType = ans.toLowerCase().includes('combine') ? reportChoices.join(','): ans;
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
                                        // content: `Question: choose an option
                                        // Option1: class of business
                                        // option2: original currency code
                                        // If user select option1 then return only "class of business".
                                        // If user selects option2 then return only "original currency code".
                                        // User answer is '${ userMessage }'
                                        // Return only one word based on the selection.
                                        // `
                                        content: `Choose an option:
                                        Option 1: class of business
                                        Option 2: original currency code
                                        User answer: '${ userMessage }'
                                        If user selects option 1, return "class of business".
                                        If user selects option 2, return "original currency code".
                                        Return one word based on the selection.
                                        `
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
                                        content: `Choose an option:
                                        ${ fieldOptions }
                                        ${ selectedOptions }
                                        User answer: '${ userMessage }'
                                        Instructions:
                                        - For "select all," return all options as JSON object.
                                        - For multiple options: { "${ selectedColumnType === 'Class of Business' ? 'class_of_business' : 'original_currency_code' }": "OIL & GAS PACKAGE, CAR" }.
                                        - For a single option: { "${ selectedColumnType === 'Class of Business' ? 'class_of_business' : 'original_currency_code' }": "OIL & GAS PACKAGE" }.
                                        - Output only valid JSON object.`
                                    }
                                ],
                                model: 'gpt-4',
                                max_tokens: 100
                            });
                            ans = openaiResponse.choices[0].message.content.trim();
                            const rawResponse = ans.replace(/^```json|```$/g, '').trim();
                            ans = JSON.parse(rawResponse);
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
                            const AllFields = await getAllColumns(selectedValues.reportType);
                            const result = AllFields.join(', ');                            
                            selectedValues.field = result;
                            await generateReport(context);
                            state.currentStep = 9;
                        } else if (ans === 'no') {
                            await selectFields(context, selectedValues.reportType);
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
                                        // content: `choose an option
                                        // ${ fieldOptions }
                                        // ${ selectedOptions }
                                        // User answer is '${ userMessage }'
                                        // If the user selects options, return them as a comma-separated string, e.g., 'Policy Reference, Original Insured'.
                                        // If the user deselects any option, exclude those from the returned string.
                                        // Return only the selected options in a comma-separated format, without any explanation.
                                        // Example: If the user deselects 'Policy Reference' and 'Original Insured', return: 'Territory, Insured, Start Date, Expiry Date'.
                                        // Ensure that the list accurately reflects the options selected and deselected by the user, in the exact format as provided.
                                        // `
                                        content: `Choose an option: ${ fieldOptions } ${ selectedOptions }
                                        User's answer: '${ userMessage }'                                  
                                        Return selected options as a comma-separated string, excluding any deselected ones. If a range (e.g., 1 to 10) is deselected, remove those fields from the selected values. Example: 'Territory, Insured, Start Date' if 'Policy Reference' and 'Original Insured' are deselected.`
                                    }
                                ],
                                model: 'gpt-4',
                                max_tokens: 100
                            });
                            ans = openaiResponse.choices[0].message.content.trim();
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
                                        // content: `Question: choose an option
                                        // Option1: pdf
                                        // Option2: excel
                                        // If user selects option1 then return only "pdf".
                                        // If user selects option2 then return only "excel".
                                        // User answer is '${ userMessage }'
                                        // Return only one word based on the selection.
                                        // `
                                        content: `Select:
                                        pdf
                                        excel
                                        Input: ${ userMessage }
                                        Return one word.`
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

                                if (savedReport.report.reportName) {
                                    await editOptions(context);
                                    state.currentStep = 13
                                  } else {
                                    await saveOptions(context);
                                    state.currentStep = 10;
                                  }
                                  
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
                            await savedFileName(context);
                            state.currentStep = 11;
                        } else if (ans === 'no') {
                            await context.sendActivity('Thank you!');
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
                case 11: {
                    const filename = `${ context.activity.value.filename }-${ new Date().getTime() }`;
                    await saveReport(context,filename, selectedValues);
                    break;
                }
                case 12: {
                    const selectedSavedReport = context?.activity?.value?.savedReport
                    savedReport.filename = selectedSavedReport;
                    try {
                        if(selectedSavedReport){
                            const singleData = await getSingleSavedReport(selectedSavedReport) 
                            const reportData = singleData[0]
                            const filteredValue = JSON.parse(reportData?.reportFilter) 
                            savedReport.report = reportData;

                            selectedValues.reportType = reportData.reportName,
                            selectedValues.period = { startDate: filteredValue.StartDate, endDate: filteredValue.EndDate };
                            selectedValues.riskCode = filteredValue.ClassOfBusiness ? {class_of_business: filteredValue.ClassOfBusiness}:{original_currency_code: filteredValue.OriginalCurrencyCode};
                            selectedValues.field = filteredValue.Field;

                            await sendReportTypeOptions(context,reportData.reportName);
                            if (filteredValue.StartDate && filteredValue.EndDate) {
                                const datePickerCard = await createDatePickerCard(filteredValue);
                                await context.sendActivity({ attachments: [datePickerCard] });
                            }
                            if (filteredValue.ClassOfBusiness) {
                                await specificClassesCard(context, 'business', filteredValue);
                            }
                            if (filteredValue.OriginalCurrencyCode){
                                await specificClassesCard(context, 'currency', filteredValue);
                            }
                            if(filteredValue.Field){
                                await selectFields(context, reportData.reportName);
                            }
                        }
                    } catch (error) {
                        await context.sendActivity(
                            'Sorry, We could not process with your answer.'
                        );
                    }
                    break;
                }
                case 13: {
                    let ans = null;

                    try {
                        if (userMessage === 'save' || userMessage === 'cancel') {
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
                                        save
                                        cancel
                                        Input: ${ userMessage }
                                        Return one word.`
                                    }
                                ],
                                model: 'gpt-4',
                                max_tokens: 2
                            });

                            ans = openaiResponse.choices[0].message.content.trim();
                        }
                        if (ans === 'save') {
                            await editReport(context, savedReport.filename, selectedValues);
                        } else if (ans === 'cancel') {
                            await context.sendActivity('Thank you!');
                        } else {
                            await context.sendActivity('Invalid selection. Please choose "save" or "cancel".');
                        }
                    } catch (error) {
                        await context.sendActivity(
                            'Sorry, We could not process with your answer.'
                        );
                    }
                    break;
                }
                case 99: {
                    await getTableDataFromQuery(context);
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
                await this.savedReportAccessor.set(context, savedReport);
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
