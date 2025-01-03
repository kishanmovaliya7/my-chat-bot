const { AzureOpenAI } = require('openai');
const { query } = require('../services/db');

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
    
let pool = null;

// Function to connect to the database
async function connectToDatabase() {
  try {
    pool = await sql.connect(dbConfig);
    console.log('Connected to database successfully.');
  } catch (error) {
    console.error('Error connecting to database:', error.message);
    throw new Error('Database connection failed.');
  }
}

// Function to fetch database schema
async function getDatabaseInfo() {
  try {
    // const tableResult = await query(`
    //   SELECT TABLE_NAME 
    //   FROM INFORMATION_SCHEMA.TABLES 
    //   WHERE TABLE_TYPE = 'BASE TABLE'
    // `);

    const tableResult = await query('SELECT * FROM sqlite_master WHERE type="table"')

    return tableResult;
  } catch (error) {
    console.error('Error fetching database info:', error.message);
    throw new Error('Failed to retrieve database schema.');
  }
}

// Function to format schema info
function formatDatabaseSchemaInfo(schemaDict) {
  return schemaDict
    .map(
      (table) =>
        `${table.sql}`
    )
    .join('\n');
}

// Function to execute queries on the database
async function askDatabase(sqlquery) {
  // console.log("Sql Query:", sqlquery)
  try {
    const result = await query(sqlquery);
    // console.log(result)
    return result;
  } catch (error) {
    return `Query failed with error: ${error.message}`;
  }
}

const generateSQl = async (userMessage) => {
  try {
 
    const schemaDict = await getDatabaseInfo();
    const schemaString = formatDatabaseSchemaInfo(schemaDict);
  
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
  } catch(error) {
    return null
  }
}

async function getTableDataFromQuery(context, selectedValues) {

    
try {
  const userMessage = context?.activity?.text;
  const sqlQuery = await generateSQl(userMessage)
  if(sqlQuery) {
    const result = await askDatabase(sqlQuery);
    const completionResponse = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: userMessage },
        { role: 'function', content: JSON.stringify(result),name: 'askDatabase'}
      ]
    });
    await context.sendActivity(completionResponse.choices[0].message.content);
  } else {
    await context.sendActivity(`Apologies, I couldn't find the information or match you were looking for. Please try rephrasing your query or provide more details, and I'll do my best to assist you!`);
  }
} catch(error) {
    console.log(error)
}
    // await askDatabase(schemaString, userMessage, context)
}



module.exports = { getTableDataFromQuery, generateSQl };
