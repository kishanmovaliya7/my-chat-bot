async function saveReport(context, userMessage) {
    await context.sendActivity(userMessage);
};

module.exports = { saveReport };
