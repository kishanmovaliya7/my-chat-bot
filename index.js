const path = require('path');

const dotenv = require('dotenv');
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });

const restify = require('restify');

const {
    CloudAdapter,
    ConfigurationServiceClientCredentialFactory,
    createBotFrameworkAuthenticationFromConfiguration
} = require('botbuilder');

const { EchoBot } = require('./bot');
const { importDataFromXlsx } = require('./src/services/db');

// Create HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

// import excel file data in sqlite database
const xlsxFilePath = path.join(__dirname, 'RawData.xlsx');
const tableName = 'rawDataTable';

importDataFromXlsx(xlsxFilePath, tableName)
    .then(() => console.log('Import finished successfully.'))
    .catch(err => console.log('Error importing data:', err));

server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${ server.name } listening to ${ server.url }`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

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

server.post('/api/messages', async (req, res) => {
    await adapter.process(req, res, (context) => myBot.run(context));
});

server.on('upgrade', async (req, socket, head) => {
    const streamingAdapter = new CloudAdapter(botFrameworkAuthentication);

    streamingAdapter.onTurnError = onTurnErrorHandler;

    await streamingAdapter.process(req, socket, head, (context) => myBot.run(context));
});