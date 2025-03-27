const { AzureOpenAI } = require('openai');
const { SQLquery } = require('../services/dbConnect');

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


// Function to fetch database schema
async function getDatabaseInfo() {
  try {
    // const tableResult = await SQLquery(`
    //   SELECT TABLE_NAME 
    //   FROM INFORMATION_SCHEMA.TABLES 
    //   WHERE TABLE_TYPE = 'BASE TABLE'
    // `);
    const result = await SQLquery(`SELECT  TABLE_CATALOG, TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS where TABLE_NAME in ('dim_policy', 'fct_policy', 'fact_premium', 'dim_claims', 'fact_claims_dtl') and TABLE_SCHEMA='dwh'`);

    const data= result ?? [];

    const tables = data?.reduce((acc, cur) => {
      const tableName = `${cur.TABLE_SCHEMA}.${cur.TABLE_NAME}`
        if(acc?.[tableName]) {
            acc[tableName] = [...acc[tableName], `${cur.COLUMN_NAME} ${cur.DATA_TYPE}${cur.DATA_TYPE === 'varchar' ? "(MAX)" :""}`]
      } else {
            acc[tableName] = [ `${cur.COLUMN_NAME} ${cur.DATA_TYPE}${cur.DATA_TYPE === 'varchar' ? "(MAX)" :""}`]
      }
      return acc;
    }, {})

    const tableResult = Object.entries(tables)?.map(table => `create table ${table[0]} (${table[1].join(', ')})`);

    return tableResult;
  } catch (error) {
    console.error('Error fetching database info:', error.message);
    throw new Error('Failed to retrieve database schema.');
  }
}

// Function to format schema info
function formatDatabaseSchemaInfo(schemaDict) {
  return schemaDict.join('\n');
}

// Function to execute queries on the database
async function askDatabase(sqlquery) {
  try {
    const result = await SQLquery(sqlquery);
    return result;
  } catch (error) {
    return `Query failed with error: ${error.message}`;
  }
}

const generateSQl = async (userMessage) => {
  try {
    const schemaDict = await getDatabaseInfo();
    const schemaString = formatDatabaseSchemaInfo(schemaDict);
    //console.log("schemaString---*-***-", schemaString)

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: userMessage }],
      temperature: 1,
      max_tokens: 1024,
      top_p: 1,
      tools: [
        {
          type: 'function',
          function: {
            name: 'askDatabase',
            description: `Use this function to answer user questions. Output should be a fully formed SQL query.`,
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: `
                        SQL query extracting info to answer the user's question.
                        SQL should be written using this database schema:
                        ${schemaString}
                          The query should be returned in plain text, not in JSON
                        `,
                },
              },
              required: ['query'],
            },
          }
        },
      ],
      tool_choice: 'auto'
    })
    const queryCall = completion.choices[0]?.message?.tool_calls[0];
    if (queryCall) {
      const arguments = JSON.parse(queryCall.function.arguments);
      const sqlQuery = arguments.query

      return sqlQuery;
    }
    return null
  } catch (error) {
    return null
  }
}

async function getTableDataFromQuery(context, selectedValues) {


  try {
    const userMessage = context?.activity?.text;
    const sqlQuery = await generateSQl(userMessage)
    if (sqlQuery) {
      const result = await askDatabase(sqlQuery);
      const completionResponse = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: userMessage },
          { role: 'function', content: JSON.stringify(result), name: 'askDatabase' }
        ]
      });
      await context.sendActivity(completionResponse.choices[0].message.content);
    } else {
      await context.sendActivity(`Apologies, I couldn't find the information or match you were looking for. Please try rephrasing your query or provide more details, and I'll do my best to assist you!`);
    }
  } catch (error) {
    console.log(error)
  }
  // await askDatabase(schemaString, userMessage, context)
}



module.exports = { getTableDataFromQuery, generateSQl };
