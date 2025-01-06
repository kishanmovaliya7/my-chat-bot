const {
  ActivityHandler,
  MemoryStorage,
  ConversationState,
  CardFactory,
} = require('botbuilder');
const { AzureOpenAI } = require('openai');
// const cronstrue = require('cronstrue');

const {
  sendReportTypeOptions,
  getSavedReportName,
} = require('./src/components/sendReportTypeOptions');
const { getQuestionType } = require('./src/components/getQuestionType');
const {
  createDatePickerCard,
} = require('./src/components/createDatePickerCard');
const {
  sendRiskCodesOptions,
} = require('./src/components/sendRiskCodesOptions');
const {
  specificPeriod,
  promptForFilters,
} = require('./src/components/specificPeriod');
const {
  specificClassesCard,
  getOptionValue,
} = require('./src/components/specificClassesCard');
const {
  selectFields,
  getAllColumns,
  askForFieldconfirmation,
} = require('./src/components/selectFields');
const { generateReport } = require('./src/components/generateReport');
const { downloadPDFReport } = require('./src/components/downloadPDFReport');
const {
  saveReport,
  getSavedReport,
  getSingleSavedReport,
  editReport,
  updateReport,
} = require('./src/components/saveReport');
const { downloadExcelReport } = require('./src/components/downloadExcelReport');
const {
  getTableDataFromQuery,
} = require('./src/components/getTableDataFromQuery');
const { savedFileName } = require('./src/components/savedFileName');
const {
  saveOptions,
  editOptions,
} = require('./src/components/saveReportOption');
const {
  AskforSchedulerConfirmation,
  schedulerForm,
  AskforOtherEmailConfirmation,
  AskforEmailConfirmation,
  askForToEmail,
} = require('./src/components/scheduleOptions');

// Azure OpenAI Configuration
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY; // Use API Key or Token Provider
const modelDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'depmodel';

const client = new AzureOpenAI({
  endpoint,
  apiKey,
  apiVersion: '2024-08-01-preview',
  deployment: modelDeployment,
});

function hasMatchingValue(array1, array2) {
  return array1.some((item) => array2?.includes(item.toLowerCase())) || false;
}

class EchoBot extends ActivityHandler {
  constructor() {
    super();

    const memoryStorage = new MemoryStorage();
    this.conversationState = new ConversationState(memoryStorage);
    this.conversationStateAccessor =
      this.conversationState.createProperty('reportState');
    this.selectedValuesAccessor =
      this.conversationState.createProperty('selectedValues');
    this.optionFieldValueAccessor =
      this.conversationState.createProperty('fieldValues');
    this.savedReportAccessor =
      this.conversationState.createProperty('savedReport');

    this.onMessage(async (context, next) => {
      try {
        const userMessage =
          context?.activity?.text?.toLowerCase() ||
          (typeof context?.activity?.value === 'string'
            ? context?.activity?.value?.toLowerCase()
            : null);

        const state = await this.conversationStateAccessor.get(context, {
          currentStep: 1,
        });
        const selectedValues = await this.selectedValuesAccessor.get(
          context,
          {}
        );
        const fieldValues = await this.optionFieldValueAccessor.get(
          context,
          []
        );
        const savedReport = await this.savedReportAccessor.get(context, {});

        // Validate if the conversation should be reset
        if (userMessage === 'restart' || userMessage === 'start over') {
          await this.resetConversation(context, state);
          await getQuestionType(context);
          return await next();
        }

        const stepCount = context.activity.value?.step;
        if (stepCount) {
          state.currentStep =
            parseInt(stepCount.slice(4)) 
        }
        switch (state.currentStep) {
          case 1:
            try {
              let ans = null;
              if (
                userMessage?.toLowerCase() === 'q&a' ||
                userMessage?.toLowerCase() === 'report'
              ) {
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
                                        User answer is '${userMessage}'
                                        Return only one word based on the selection.
                                        `,
                    },
                  ],
                  model: 'gpt-4',
                  max_tokens: 2,
                });
                ans = openaiResponse.choices[0].message.content.trim();
              }
              if (context?.activity?.value?.data === 'new report') {
                await sendReportTypeOptions(context);
                savedReport.report = {};
                state.currentStep = 2;
              } else if (ans?.toLowerCase() === 'q&a') {
                await context.sendActivity(
                  'You have selected Q&A. \n Ask your question, and Bot will assist you promptly.'
                );
                state.currentStep = 99;
              } else if (ans?.toLowerCase() === 'report') {
                const data = await getSavedReport();
                if (data) {
                  await getSavedReportName(context, data);
                  state.currentStep = 21;
                } else {
                  await sendReportTypeOptions(context);
                  state.currentStep = 2;
                }
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
            const reportChoices = ['policy', 'premium', 'claims'];
            const reportType = context?.activity?.value?.Report?.toLowerCase();
            let ans = null;
            try {
              if (hasMatchingValue(reportChoices, reportType?.split(','))) {
                ans = reportType;
              } else {
                const openaiResponse = await client.chat.completions.create({
                  messages: [
                    {
                      role: 'user',
                      content: `Identify relevant options (Policy, Premium, Claims, Combine) from the input: ${userMessage}. Return only the matching options. If none match, return "None."`,
                    },
                  ],
                  model: 'gpt-4',
                  max_tokens: 5,
                });

                ans = openaiResponse.choices[0].message.content.trim();
              }
              if (
                ans.toLowerCase().includes('combine') ||
                hasMatchingValue(reportChoices, ans?.toLowerCase()?.split(','))
              ) {
                selectedValues.reportType = ans
                  .toLowerCase()
                  .includes('combine')
                  ? reportChoices.join(',')
                  : ans;
                if(savedReport.report?.reportName) {
                    await editOptions(context)
                    state.currentStep = 22;
                } else {
                    await promptForFilters(context);
                    await specificPeriod(context, ans);
                    state.currentStep = 3;
                }
              } else {
                await context.sendActivity(
                  'Please select one or more datasets that you would like to compile from.'
                );
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
                      content: `Select:
                                        yes
                                        no
                                        Input: ${userMessage}
                                        Return one word.`,
                    },
                  ],
                  model: 'gpt-4',
                  max_tokens: 2,
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
                await context.sendActivity(
                  'Invalid selection. Please choose "yes" or "no".'
                );
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
                  endDate: dates?.endDate,
                };
              } else {
                const openaiResponse = await client.chat.completions.create({
                  messages: [
                    {
                      role: 'user',
                      content: `${userMessage}
                                        Return only:
                                        Valid -> {"startDate": "DD-MM-YYYY", "endDate": "DD-MM-YYYY"}
                                        Invalid -> "no"`,
                    },
                  ],
                  model: 'gpt-4',
                  max_tokens: 50,
                });
                ans = openaiResponse.choices[0].message.content.trim();
                ans = JSON.parse(ans);
              }

              if (ans.startDate || ans.endDate) {
                selectedValues.period = {
                  startDate: ans.startDate,
                  endDate: ans.endDate,
                };
                await sendRiskCodesOptions(context);
                state.currentStep = 5;
              } else {
                await context.sendActivity(
                  'Invalid dates, please enter valid dates "DD-MM-YYYY" formate'
                );
              }
            } catch (error) {
              await context.sendActivity(
                'Sorry, We could not process your dates.'
              );
            }
            break;
          }
          case 5: {
            let ans = null;
            try {
              if (
                userMessage.includes('yes') ||
                userMessage.includes('no')
              ) {
                ans = userMessage;
              } else {
                const openaiResponse = await client.chat.completions.create({
                  messages: [
                    {
                      role: 'user',
                      content: `Select:
                                        yes
                                        no
                                        Input: ${userMessage}
                                        Return one word.
                                        `,
                    },
                  ],
                  model: 'gpt-4',
                  max_tokens: 10,
                });
                ans = openaiResponse.choices[0].message.content
                  .trim()
                  .toLowerCase();
              }
              if (ans.includes('yes')) {
                await specificClassesCard(context, 'business');

                const fields = await getOptionValue('business');
                fieldValues.push(fields);

                state.currentStep = 6;
              } else {
                await askForFieldconfirmation(context)
                state.currentStep = 8;
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
                const fieldOptions = fieldValues
                  .flat()
                  .map(
                    (item, index) =>
                      `option${index + 1}: ${Object.values(item)[0]}`
                  );
                const selectedColumnType = fieldValues
                  .flat()
                  .map((item) => Object.keys(item)[0])[0];

                const selectedOptions = fieldValues
                  .flat()
                  .map(
                    (item, index) =>
                      `If user select option${index + 1} then return only ${
                        Object.values(item)[0]
                      }`
                  );

                const openaiResponse = await client.chat.completions.create({
                  messages: [
                    {
                      role: 'user',
                      content: `Choose an option:
                                        ${fieldOptions}
                                        ${selectedOptions}
                                        User answer: '${userMessage}'
                                        Instructions:
                                        - For "select all," return all options as JSON object.
                                        - For multiple options: { "class_of_business": "OIL & GAS PACKAGE, CAR" }.
                                        - For a single option: { "class_of_business": "OIL & GAS PACKAGE" }.
                                        - Output only valid JSON object.`,
                    },
                  ],
                  model: 'gpt-4',
                  max_tokens: 100,
                });
                ans = openaiResponse.choices[0].message.content.trim();
                const rawResponse = ans.replace(/^```json|```$/g, '').trim();
                ans = JSON.parse(rawResponse);
              }

              if (ans) {
                selectedValues.Business = ans;
                if (savedReport.report?.reportName) {
                  await editOptions(context);
                  state.currentStep = 22;
                } else {
                    await specificClassesCard(context, 'currency');

                    const fields = await getOptionValue('currency');
                    fieldValues.push(fields);
    
                    state.currentStep = 8;
                }
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
            const riskCode = context.activity.value;

            let ans = null;
            try {
              if (riskCode) {
                ans = riskCode;
              } else {
                const fieldOptions = fieldValues
                  .flat()
                  .map(
                    (item, index) =>
                      `option${index + 1}: ${Object.values(item)[0]}`
                  );
                const selectedColumnType = fieldValues
                  .flat()
                  .map((item) => Object.keys(item)[0])[0];

                const selectedOptions = fieldValues
                  .flat()
                  .map(
                    (item, index) =>
                      `If user select option${index + 1} then return only ${
                        Object.values(item)[0]
                      }`
                  );

                const openaiResponse = await client.chat.completions.create({
                  messages: [
                    {
                      role: 'user',
                      content: `Choose an option:
                                        ${fieldOptions}
                                        ${selectedOptions}
                                        User answer: '${userMessage}'
                                        Instructions:
                                        - For "select all," return all options as JSON object.
                                        - For multiple options: { "original_currency_code": "OIL & GAS PACKAGE, CAR" }.
                                        - For a single option: { "original_currency_code": "OIL & GAS PACKAGE" }.
                                        - Output only valid JSON object.`,
                    },
                  ],
                  model: 'gpt-4',
                  max_tokens: 100,
                });
                ans = openaiResponse.choices[0].message.content.trim();
                const rawResponse = ans.replace(/^```json|```$/g, '').trim();
                ans = JSON.parse(rawResponse);
              }

              if (ans) {
                selectedValues.riskCode = ans;
                if (savedReport.report?.reportName) {
                  await editOptions(context);
                  state.currentStep = 22;
                } else {
                  await askForFieldconfirmation(context)
                  state.currentStep = 8;
                }
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
          case 8: {
            let ans = null;
            try {
              if (userMessage === 'yes' || userMessage === 'no') {
                ans = userMessage;
              } else {
                const openaiResponse = await client.chat.completions.create({
                  messages: [
                    {
                      role: 'user',
                      content: `Select:
                                        yes
                                        no
                                        Input: ${userMessage}
                                        Return one word.`,
                    },
                  ],
                  model: 'gpt-4',
                  max_tokens: 2,
                });

                ans = openaiResponse.choices[0].message.content.trim();
              }
              if (ans === 'yes') {
                const AllFields = await getAllColumns(
                  selectedValues.reportType
                );
                const result = AllFields.join(', ');
                selectedValues.field = result;
                await generateReport(context);
                state.currentStep = 9;
              } else if (ans === 'no') {
                await selectFields(context, selectedValues.reportType);
                state.currentStep = 8;
              } else {
                await context.sendActivity(
                  'Invalid selection. Please choose "yes" or "no".'
                );
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
            const fields = context.activity.value?.field;

            try {
              if (fields) {
                ans = fields;
              } else {
                const fieldOptions = await getAllColumns();
                const selectedOptions = fieldOptions.map(
                  (item, index) =>
                    `If user select option${index + 1} then return only ${item}`
                );

                const openaiResponse = await client.chat.completions.create({
                  messages: [
                    {
                      role: 'user',
                      content: `Choose an option: ${fieldOptions} ${selectedOptions}
                                        User's answer: '${userMessage}'                                  
                                        Return selected options as a comma-separated string, excluding any deselected ones. If a range (e.g., 1 to 10) is deselected, remove those fields from the selected values. Example: 'Territory, Insured, Start Date' if 'Policy Reference' and 'Original Insured' are deselected.`,
                    },
                  ],
                  model: 'gpt-4',
                  max_tokens: 100,
                });
                ans = openaiResponse.choices[0].message.content.trim();
              }

              if (ans) {
                await generateReport(context);
                selectedValues.field = ans;
                state.currentStep = 10;
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
          case 10: {
            let ans = null;
            try {
              if (userMessage?.toLowerCase() === 'pdf' || userMessage?.toLowerCase() === 'excel') {
                ans = userMessage?.toLowerCase();
              } else {
                const openaiResponse = await client.chat.completions.create({
                  messages: [
                    {
                      role: 'user',
                      content: `Select:
                                        pdf
                                        excel
                                        Input: ${userMessage}
                                        Return one word.`,
                    },
                  ],
                  model: 'gpt-4',
                  max_tokens: 10,
                });

                ans = openaiResponse.choices[0].message.content?.toLowerCase().trim();
              }
              if (ans === 'pdf' || ans === 'excel') {
                ans === 'pdf'
                  ? await downloadPDFReport(context, selectedValues)
                  : await downloadExcelReport(context, selectedValues);
                  
                    if (savedReport.report?.reportName) {
                        await editOptions(context);
                        state.currentStep = 22;
                      } else {
                        await saveOptions(context);
                        state.currentStep = 10;
                      }
                
              } else {
                await context.sendActivity(
                  'Invalid selection. Please choose "pdf" or "excel".'
                );
              }
            } catch (error) {
              await context.sendActivity(
                'Sorry, We could not process with your answer.'
              );
            }
            break;
          }
          case 11: {
            let ans = null;

            try {
              if (userMessage === 'yes' || userMessage === 'no') {
                ans = userMessage;
              } else {
                const openaiResponse = await client.chat.completions.create({
                  messages: [
                    {
                      role: 'user',
                      content: `Select:
                                        yes
                                        no
                                        Input: ${userMessage}
                                        Return one word.`,
                    },
                  ],
                  model: 'gpt-4',
                  max_tokens: 2,
                });

                ans = openaiResponse.choices[0].message.content.trim();
              }
              if (ans === 'yes') {
                await savedFileName(context);
                state.currentStep = 11;
              } else if (ans === 'no') {
                await context.sendActivity('Thank you!');
              } else {
                await context.sendActivity(
                  'Invalid selection. Please choose "yes" or "no".'
                );
              }
            } catch (error) {
              await context.sendActivity(
                'Sorry, We could not process with your answer.'
              );
            }
            break;
          }
          case 12: {
            try {
                const filename = `${ context.activity.value.filename }-${ new Date().getTime() }`;
                const aaa = await saveReport(context,filename, selectedValues);
                savedReport.filename = filename;
                const report = getSingleSavedReport(filename)
                if(report) {
                    savedReport.report = report[0];
                    await AskforSchedulerConfirmation(context);
                    state.currentStep = 12;
                } else {
                    await context.sendActivity(`Something went wrong! Would you please try again after some time?`)
                }
            } catch(error) {
                console.log(error)
            }
            break;
          }
          case 13: {
            let ans = null;

            try {
              if (userMessage === 'yes' || userMessage === 'no') {
                ans = userMessage;
              } else {
                const openaiResponse = await client.chat.completions.create({
                  messages: [
                    {
                      role: 'user',
                      content: `Select:
                                        yes
                                        no
                                        Input: ${userMessage}
                                        Return one word.`,
                    },
                  ],
                  model: 'gpt-4',
                  max_tokens: 2,
                });

                ans = openaiResponse.choices[0].message.content.trim();
              }
             
              if (ans === 'yes') {
                await schedulerForm(context);
                state.currentStep = 13;
              } else if (ans === 'no') {
               
                await context.sendActivity('Thank you!');
              } else {
                await context.sendActivity(
                  'Invalid selection. Please choose "yes" or "no".'
                );
              }
            } catch (error) {
              await context.sendActivity(
                'Sorry, We could not process with your answer.'
              );
            }
            break;
          }
          case 14: {
            let ans = null;
            const schedule = `${context.activity.value?.minute || '*'} ${
              context.activity.value?.hour || '*'
            } ${context.activity.value?.day || '*'} ${
              context.activity.value?.week || '*'
            } ${context.activity.value?.month || '*'} `;
            try {
              if (context.activity?.textFormat === 'plain') {
                const openaiResponse = await client.chat.completions.create({
                  messages: [
                    {
                      role: 'user',
                      content: `Given the user's input: ${userMessage}.
                                                generate a cron expression in the format 0 0 0 0 0. 
                                                Return output in single word.`,
                    },
                  ],
                  model: 'gpt-4',
                });

                ans = openaiResponse.choices[0].message.content.trim();
              } else {
                ans = schedule;
              }
              const filename = savedReport.filename
              if (ans) {
                await updateReport(filename, `scheduler="${ans}"`)
                await AskforEmailConfirmation(context);
                state.currentStep = 14;
              } else {
                await context.sendActivity(
                  `Apologies, I wasn't able to generate the cron job with the provided input. Please try submitting the form again`
                );
              }
            } catch (error) {
              await context.sendActivity(
                'Sorry, We could not process with your answer.'
              );
            }
            break;
          }
          case 15: {
            let ans = null;
            try {
              if (userMessage === 'yes' || userMessage === 'no') {
                ans = userMessage;
              } else {
                const openaiResponse = await client.chat.completions.create({
                  messages: [
                    {
                      role: 'user',
                      content: `Select:
                                        yes
                                        no
                                        Input: ${userMessage}
                                        Return one word.`,
                    },
                  ],
                  model: 'gpt-4',
                  max_tokens: 2,
                });

                ans = openaiResponse.choices[0].message.content.trim();
              }
              const filename = savedReport.filename;
              if (ans === 'yes') {
                await updateReport(filename, `isConfirm=1`)
                await AskforOtherEmailConfirmation(context);
                state.currentStep = 15;
              } else if (ans === 'no') {
                await updateReport(filename, `isConfirm=0`)
                await context.sendActivity('Thank you!');
              } else {
                await context.sendActivity(
                  'Invalid selection. Please choose "yes" or "no".'
                );
              }
            } catch (error) {
              await context.sendActivity(
                'Sorry, We could not process with your answer.'
              );
            }

            break;
          }
          case 16: {
            let ans = null;
            try {
              if (userMessage === 'yes' || userMessage === 'no') {
                ans = userMessage;
              } else {
                const openaiResponse = await client.chat.completions.create({
                  messages: [
                    {
                      role: 'user',
                      content: `Select:
                                        yes
                                        no
                                        Input: ${userMessage}
                                        Return one word.`,
                    },
                  ],
                  model: 'gpt-4',
                  max_tokens: 2,
                });

                ans = openaiResponse.choices[0].message.content.trim();
              }
              if (ans === 'yes') {
                await askForToEmail(context);
                state.currentStep = 16;
              } else if (ans === 'no') {
                await context.sendActivity(
                    `You will now receive the emails going forward. \n\n Have a great day!`
                  )
              } else {
                await context.sendActivity(
                  'Invalid selection. Please choose "yes" or "no".'
                );
              }
            } catch (error) {
              await context.sendActivity(
                'Sorry, We could not process with your answer.'
              );
            }

            break;
          }
          case 17: {
            let ans = null;
            try {
              if (context.activity?.textFormat === 'plain') {
                const openaiResponse = await client.chat.completions.create({
                  messages: [
                    {
                      role: 'user',
                      content: `Extract valid email from the user's input: ${userMessage}. Return output in single word.`,
                    },
                  ],
                  model: 'gpt-4',
                });

                ans = openaiResponse.choices[0].message.content.trim();
              } else {
                ans = context.activity.value.email;
              }
              const filename = savedReport.filename
              if (ans) {
                await updateReport(filename, `emailLists="${ans}"`)
                await context.sendActivity(
                    `You will now receive the emails going forward. \n\n Have a great day!`
                  )
                state.currentStep = 1;
              } else {
                await context.sendActivity(
                  `Apologies, I wasn't able to generate the cron job with the provided input. Please try submitting the form again`
                );
              }
            } catch (error) {
              await context.sendActivity(
                'Sorry, We could not process with your answer.'
              );
            }

            break;
          }
          case 21: {
            const selectedSavedReport = context?.activity?.value?.savedReport;
            savedReport.filename = selectedSavedReport;
            try {
              if (selectedSavedReport) {
                const singleData = await getSingleSavedReport(
                  selectedSavedReport
                );
                const reportData = singleData[0];
                const filteredValue = JSON.parse(reportData?.reportFilter);
                savedReport.report = reportData;

                (selectedValues.reportType = reportData.reportName),
                  (selectedValues.period = {
                    startDate: filteredValue.StartDate,
                    endDate: filteredValue.EndDate,
                  });
                selectedValues.Business = filteredValue.ClassOfBusiness;
                selectedValues.riskCode = filteredValue.ClassOfBusiness
                  ? { class_of_business: filteredValue.ClassOfBusiness }
                  : {
                      original_currency_code:
                        filteredValue.OriginalCurrencyCode,
                    };
                selectedValues.field = filteredValue.Field;

                await sendReportTypeOptions(context, reportData.reportName);
                if (filteredValue.StartDate && filteredValue.EndDate) {
                  const datePickerCard = await createDatePickerCard(
                    filteredValue
                  );
                  await context.sendActivity({ attachments: [datePickerCard] });
                }
                if (filteredValue.ClassOfBusiness) {
                  await specificClassesCard(context, 'business', filteredValue);
                }
                if (filteredValue.OriginalCurrencyCode) {
                  await specificClassesCard(context, 'currency', filteredValue);
                }
                if (filteredValue.Field) {
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
          case 22: {
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
                                        Input: ${userMessage}
                                        Return one word.`,
                    },
                  ],
                  model: 'gpt-4',
                  max_tokens: 2,
                });

                ans = openaiResponse.choices[0].message.content.trim();
              }
              if (ans === 'save') {
                await editReport(context, savedReport.filename, selectedValues);
              } else if (ans === 'cancel') {
                await context.sendActivity('Thank you!');
              } else {
                await context.sendActivity(
                  'Invalid selection. Please choose "save" or "cancel".'
                );
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
        await context.sendActivity("An error occurred. Let's start over.");
        await this.resetConversation(
          context,
          await this.conversationStateAccessor.get(context)
        );
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
