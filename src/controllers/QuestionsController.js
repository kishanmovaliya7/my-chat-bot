const { AzureOpenAI } = require("openai");
const { query } = require("../services/db");

// Azure OpenAI Configuration
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY; // Use API Key or Token Provider
const modelDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || "depmodel";

const client = new AzureOpenAI({
  endpoint,
  apiKey,
  apiVersion: "2024-08-01-preview",
  deployment: modelDeployment,
});

// Function to fetch database schema
async function getDatabaseInfo() {
  try {
    const tableResult = await query(
      'SELECT * FROM sqlite_master WHERE type="table"'
    );

    return tableResult;
  } catch (error) {
    console.error("Error fetching database info:", error.message);
    throw new Error("Failed to retrieve database schema.");
  }
}

// Function to format schema info
function formatDatabaseSchemaInfo(schemaDict) {
  return schemaDict.map((table) => `${table.sql}`).join("\n");
}

// Function to execute queries on the database
async function askDatabase(sqlquery) {
  try {
    const result = await query(sqlquery);
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
      model: "gpt-4o",
      messages: [{ role: "user", content: userMessage }],
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
                        SQLite query extracting info to answer the user's question.
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
    const queryCall = completion.choices[0]?.message?.tool_calls[0];
    if (queryCall) {
      const arguments = JSON.parse(queryCall.function.arguments);
      const sqlQuery = arguments.query;

      return sqlQuery;
    }
    return null;
  } catch (error) {
    return null;
  }
};

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

const getQuestionsController = async (req, res) => {
  try {
    const userMessage = req.body.question;

    if (userMessage) {
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
      const ans = openaiResponse.choices[0].message.content.trim();

      if (ans.toLowerCase() === "no") {
        const sqlQuery = await generateSQl(userMessage);
        if (sqlQuery) {
          const result = await askDatabase(sqlQuery);
          const completionResponse = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "user", content: userMessage },
              {
                role: "function",
                content: JSON.stringify(result),
                name: "askDatabase",
              },
            ],
          });
          const ans = completionResponse.choices[0].message.content;

          res.status(200).json(ans);
        }
      } else {
        res
          .status(200)
          .json("Thank you for using Fusion Assistant 😊.\n\n Have a nice day!");
      }
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
};

module.exports = { getQuestionsController };
