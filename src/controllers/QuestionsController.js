// const { AzureOpenAI } = require("openai");
// const { query } = require("../services/db");

// // Azure OpenAI Configuration
// const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
// const apiKey = process.env.AZURE_OPENAI_API_KEY; // Use API Key or Token Provider
// const modelDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || "depmodel";

// const client = new AzureOpenAI({
//   endpoint,
//   apiKey,
//   apiVersion: "2024-08-01-preview",
//   deployment: modelDeployment,
// });

// // Function to fetch database schema
// async function getDatabaseInfo() {
//   try {
//     const tableResult = await query(
//       'SELECT * FROM sqlite_master WHERE type="table"'
//     );

//     return tableResult;
//   } catch (error) {
//     console.error("Error fetching database info:", error.message);
//     throw new Error("Failed to retrieve database schema.");
//   }
// }

// // Function to format schema info
// function formatDatabaseSchemaInfo(schemaDict) {
//   return schemaDict.map((table) => `${table.sql}`).join("\n");
// }

// // Function to execute queries on the database
// async function askDatabase(sqlquery) {
//   try {
//     const result = await query(sqlquery);
//     return result;
//   } catch (error) {
//     return `Query failed with error: ${error.message}`;
//   }
// }

// const generateSQl = async (userMessage) => {
//   try {
//     const schemaDict = await getDatabaseInfo();
//     const schemaString = formatDatabaseSchemaInfo(schemaDict);

//     const completion = await client.chat.completions.create({
//       model: "gpt-4o",
//       messages: [{ role: "user", content: userMessage }],
//       temperature: 1,
//       max_tokens: 1024,
//       top_p: 1,
//       tools: [
//         {
//           type: "function",
//           function: {
//             name: "askDatabase",
//             description: `Use this function to answer user questions. Output should be a fully formed SQL query.`,
//             parameters: {
//               type: "object",
//               properties: {
//                 query: {
//                   type: "string",
//                   description: `
//                         SQLite query extracting info to answer the user's question.
//                         SQL should be written using this database schema:
//                         ${schemaString}
//                           The query should be returned in plain text, not in JSON
//                         `,
//                 },
//               },
//               required: ["query"],
//             },
//           },
//         },
//       ],
//       tool_choice: "auto",
//     });
//     const queryCall = completion.choices[0]?.message?.tool_calls[0];
//     if (queryCall) {
//       const arguments = JSON.parse(queryCall.function.arguments);
//       const sqlQuery = arguments.query;

//       return sqlQuery;
//     }
//     return null;
//   } catch (error) {
//     return null;
//   }
// };

// // Function to execute queries on the database
// async function askDatabase(sqlquery) {
//    console.log("Sql Query:", sqlquery)
//   try {
//     const result = await query(sqlquery);
//     // console.log(result)
//     return result;
//   } catch (error) {
//     return `Query failed with error: ${error.message}`;
//   }
// }

// const getQuestionsController = async (req, res) => {
//   try {
//     const userMessage = req.body.question;

//     if (userMessage) {
//       const openaiResponse = await client.chat.completions.create({
//         messages: [
//           {
//             role: "user",
//             content: `Does the following message indicate that the user wants to end the conversation? Please respond with 'yes' if the user's message expresses gratitude or signals an intention to end the conversation, such as 'thanks,' 'thank you,' or similar phrases. Otherwise, respond with 'no'. The message is: "${userMessage}"`,
//           },
//         ],
//         model: "gpt-4",
//         max_tokens: 2,
//       });
//       const ans = openaiResponse.choices[0].message.content.trim();

//       if (ans.toLowerCase() === "no") {
//         const sqlQuery = await generateSQl(userMessage);
//         console.log("sqlQuery----",sqlQuery);
        
//         if (sqlQuery) {
//           const result = await askDatabase(sqlQuery);
//           const completionResponse = await client.chat.completions.create({
//             model: "gpt-4o",
//             messages: [
//               { role: "user", content: userMessage },
//               {
//                 role: "function",
//                 content: JSON.stringify(result),
//                 name: "askDatabase",
//               },
//             ],
//           });
//           const ans = completionResponse.choices[0].message.content;

//           res.status(200).json(ans);
//         }
//       } else {
//         res
//           .status(200)
//           .json("Thank you for using Fusion Assistant 😊.\n\n Have a nice day!");
//       }
//     }
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// };

// module.exports = { getQuestionsController };


const { AzureOpenAI } = require("openai");
const { SQLquery } = require("../services/dbConnect");

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY; // Use API Key or Token Provider
const modelDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || "depmodel";

const client = new AzureOpenAI({
  endpoint,
  apiKey,
  apiVersion: "2024-08-01-preview",
  deployment: modelDeployment,
});

// Temporary in-memory storage for conversations
const conversationHistory = new Map();

// Function to fetch database schema
async function getDatabaseInfo() {
  try {
    // const tableResult = await SQLquery(`
    //   SELECT TABLE_NAME 
    //   FROM INFORMATION_SCHEMA.TABLES 
    //   WHERE TABLE_TYPE = 'BASE TABLE'
    // `);
    const result = await SQLquery(`SELECT  TABLE_CATALOG, TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS where TABLE_NAME in ('dim_policy', 'fact_premium', 'dim_claims') and TABLE_SCHEMA='dwh'`);
    
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

// Generate SQL query using GPT with conversation history
const generateSQL = async (conversation) => {
  try {
    const schemaDict = await getDatabaseInfo();
    const schemaString = formatDatabaseSchemaInfo(schemaDict);

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: conversation,
      temperature: 1,
      max_tokens: 1024,
      top_p: 1,
      tools: [
        {
          type: "function",
          function: {
            name: "askDatabase",
            description: `Use this function to answer user questions. Output should be a fully formed SQL query.`,
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: `
                        SQL query extracting info to answer the user's question.
                        SQL should be written using this database schema:
                        ${schemaString}
                          The query should be returned in plain text, not in JSON
                        `,
                },
              },
              required: ["query"],
            },
          },
        },
      ],
      tool_choice: "auto",
    });

    const queryCall = completion.choices[0]?.message?.tool_calls?.[0];
    if (queryCall) {
      const arguments = JSON.parse(queryCall.function.arguments);
      const sqlQuery = arguments.query;
      return sqlQuery;
    }
    return null;
  } catch (error) {
    console.error("Error generating SQL:", error.message);
    return null;
  }
};

// Main API Controller with conversation tracking
const getQuestionsController = async (req, res) => {
  try {
    const userMessage = req.body.question;
    const userId = req.body.userId || "default_user";

    if (!userMessage) {
      return res.status(400).json("Invalid request. Please provide a question.");
    }

    // Initialize user conversation history if not exists
    if (!conversationHistory.has(userId)) {
      conversationHistory.set(userId, []);
    }

    // Retrieve user's conversation history
    const userConversation = conversationHistory.get(userId);

    // Add the latest user message to conversation history
    userConversation.push({ role: "user", content: userMessage });

    // Step 1: Detect if user wants to end the conversation
    const openaiResponse = await client.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Does the following message indicate that the user wants to end the conversation? Please respond with 'yes' if the user's message expresses gratitude or signals an intention to end the conversation, such as 'thanks,' 'thank you,' or similar phrases. Otherwise, respond with 'no'. The message is: "${userMessage}"`,
        },
      ],
      model: "gpt-4",
      max_tokens: 2,
    });

    const ans = openaiResponse.choices[0]?.message?.content?.trim().toLowerCase();
    if (ans === "yes") {
      conversationHistory.delete(userId); // End conversation
      return res.status(200).json("Thank you for using Fusion Assistant 😊.\n\n Have a nice day!");
    }

    // Step 2: Generate SQL query
    const sqlQuery = await generateSQL(userConversation);
    console.log("Final SQL Query:", sqlQuery);

    if (!sqlQuery) {
      return res.status(200).json("I'm unable to generate a SQL query for your request.");
    }

    // Step 3: Execute SQL query
    const result = await askDatabase(sqlQuery);
    if (!result || result.length === 0) {
      return res.status(200).json("No records found.");
    }

    // Step 4: Format the response using GPT
    const completionResponse = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        ...userConversation,
        {
          role: "function",
          content: JSON.stringify(result),
          name: "askDatabase",
        },
      ],
    });

    const finalAnswer = completionResponse.choices[0]?.message?.content;

    // Add assistant response to conversation history
    userConversation.push({ role: "assistant", content: finalAnswer });

    return res.status(200).json(finalAnswer);

  } catch (error) {
    return res.status(500).send(error.message);
  }
};

module.exports = { getQuestionsController };
