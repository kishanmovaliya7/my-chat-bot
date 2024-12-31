const { query } = require('../services/db');
const { AzureOpenAI } = require('openai');

// async function getEmployees() {
//     try {
//         const rawDetails = await query('SELECT * FROM rawDataTable LIMIT 10');
//         return rawDetails;
//     } catch (error) {
//         console.error('Error:', error);
//     }
// }

// Azure OpenAI Configuration
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY; // Use API Key or Token Provider
const modelDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'depmodel';

async function getTableDataFromQuery(context, selectedValues) {
    const client = new AzureOpenAI({
        endpoint,
        apiKey,
        apiVersion: '2024-08-01-preview',
        deployment: modelDeployment
    });
    console.log('selectedValues-----------', selectedValues);

    const tableName = 'rawDataTable';
    const prompt = ``;
    // try {
    //     const openaiResponse = await client.chat.completions.create({
    //         messages: [{ role: 'user', content: prompt }],
    //         model: 'gpt-4'
    //     });

    //     const sqlQuery = openaiResponse.choices[0].message.content.trim();

    //     // Use regex to extract only the SQL query portion
    //     const sqlMatch = sqlQuery.match(/SELECT\s.*\sFROM\s.*(?:LIMIT\s\d+;?)/i);
    //     console.log('Extracted SQL Query:', sqlQuery);

    //     // const data = await query(sqliteQuery);

    //     // await context.sendActivity(`Here is your data: ${ JSON.stringify(data) }`);
    // } catch (error) {
    //     console.error('Error generating SQLite query:', error);
    //     await context.sendActivity('Sorry, I could not process your query.');
    // }

    await context.sendActivity('get data');
}

module.exports = { getTableDataFromQuery };
