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
const { importDataFromXlsx, runAllCronJobs, addEntryToSaveReport } = require('./src/services/db');
const { router } = require('./src/routes');

// Create HTTP server
// const server = restify.createServer();
// server.use(restify.plugins.bodyParser());
app.use(express.json());
app.use(cors({ origin: true }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', router);

// import excel file data in sqlite database
const xlsxFilePath = path.join(__dirname, 'RawData.xlsx');
const tableName = 'rawDataTable';

importDataFromXlsx(xlsxFilePath, tableName)
    .then(() => console.log('Import finished successfully.'))
    .catch(err => console.log('Error importing data:', err));

// addEntryToSaveReport();
runAllCronJobs();
// dropTable()

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

app.get('/public/:filename', (req, res, next) => {
    const fileName = req.params.filename;
    const filePath = path.join(__dirname, 'public', fileName);

    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('File not found');
        return next();
    }

    // Set headers for file download
    res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=${ fileName }`
    });

    // Stream the file
    const fileStream = fs.createReadStream(filePath);

    fileStream.on('error', (error) => {
        console.error('Stream error:', error);
        res.writeHead(500);
        res.end('Error streaming file');
        return next(error);
    });

    fileStream.pipe(res);
    res.on('finish', () => {
        return next();
    });
});

app.on('upgrade', async (req, socket, head) => {
    const streamingAdapter = new CloudAdapter(botFrameworkAuthentication);

    streamingAdapter.onTurnError = onTurnErrorHandler;

    await streamingAdapter.process(req, socket, head, (context) => myBot.run(context));
});
app.listen(process.env.port || process.env.PORT || 3978, async () => {
    // const aa = await query('select * from savedReports;');
    // console.log(aa)
    console.log(`\n${ app.name } listening to ${ app.url }`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});
