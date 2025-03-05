const path = require('path');
const express = require('express');
const cors = require('cors');

const dotenv = require('dotenv');
const ENV_FILE = path.join(__dirname, '.env');
const fs = require('fs');
dotenv.config({ path: ENV_FILE });

// const restify = require('restify');
const app = express();

const {
    CloudAdapter,
    ConfigurationServiceClientCredentialFactory,
    createBotFrameworkAuthenticationFromConfiguration
} = require('botbuilder');

const { EchoBot } = require('./bot');
const { router } = require('./src/routes');
const { poolPromise, runAllCronJobs, createBotReportTable } = require('./src/services/dbConnect');

// Create HTTP server
// const server = restify.createServer();
// server.use(restify.plugins.bodyParser());

const dbConnection = async () => {
    const connection = await poolPromise;
    // const request = connection.request();

    // const result = await request.query(`SELECT  TABLE_CATALOG, TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS where TABLE_NAME in ('fact_policy_dtl', 'fact_premium', 'fact_claims_dtl') and TABLE_SCHEMA='dwh'`);
    
    // const data= result.recordset;
    // const tables = data.reduce((acc, cur) => {
    //     const tableName = `${cur.TABLE_SCHEMA}.${cur.TABLE_NAME}`
    //     if(acc?.[tableName]) {
    //         acc[tableName] = [...acc[tableName], `${cur.COLUMN_NAME} ${cur.DATA_TYPE}${cur.DATA_TYPE === 'varchar' ? "(MAX)" :""}`]
    //     } else {
    //         acc[tableName] = [ `${cur.COLUMN_NAME} ${cur.DATA_TYPE}${cur.DATA_TYPE === 'varchar' ? "(MAX)" :""}`]
    //     }
    //     return acc;
    // }, {})
    
    // const dbSchema = Object.entries(tables)?.map(table => `create table ${table[0]} (${table[1].join(', ')})`);
    // // console.log(dbSchema.join('\n'))
}

dbConnection()
createBotReportTable()

app.use(express.json());
app.use(cors({ origin: true }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', router);


const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: process.env.MicrosoftAppId,
    MicrosoftAppPassword: process.env.MicrosoftAppPassword,
    MicrosoftAppType: process.env.MicrosoftAppType,
    MicrosoftAppTenantId: process.env.MicrosoftAppTenantId
});

const botFrameworkAuthentication = createBotFrameworkAuthenticationFromConfiguration(null, credentialsFactory);

const adapter = new CloudAdapter(botFrameworkAuthentication);

// Catch-all for errors.
const onTurnErrorHandler = async (context, error) => {
    console.error(`\n [onTurnError] unhandled error: ${ error }`);

    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

adapter.onTurnError = onTurnErrorHandler;

// Create the main dialog.
const myBot = new EchoBot();

app.post('/api/messages', async (req, res) => {
    await adapter.process(req, res, (context) => myBot.run(context));
});

app.on('upgrade', async (req, socket, head) => {
    const streamingAdapter = new CloudAdapter(botFrameworkAuthentication);

    streamingAdapter.onTurnError = onTurnErrorHandler;

    await streamingAdapter.process(req, socket, head, (context) => myBot.run(context));
});

app.listen(process.env.port || process.env.PORT || 3978, async () => {
    console.log(`\n${ app.name } listening to ${ app.url }`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

runAllCronJobs();
