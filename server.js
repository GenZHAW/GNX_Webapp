const express = require('express');
const fs = require('fs');
const app = express();
const passport = require('passport');
const passportConfig = require('./js/serverJS/passportConfig.js');
const wooCommerceIntegration = require('./js/serverJS/wooCommerceIntegration.js');
const DiscordBot = require('discord.js');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cron = require('node-cron');
const {pool} = require('./js/serverJS/database/dbConfig.js');
const flash = require('express-flash');
const loginRouter = require('./routes/loginRouter.js');
const dashboardRouter = require('./routes/dashboardRouter.js');
const presenceRouter = require('./routes/presenceRouter.js');
const teamRouter = require('./routes/teamRouter.js');
const teamTypeRouter = require('./routes/teamTypeRouter.js');
const registrationCodeRouter = require('./routes/registrationCodeRouter.js');
const {router: userRouter} = require('./routes/userRouter.js');
const registerRouter = require('./routes/registerRouter.js');
const resetPasswordRouter = require('./routes/resetPasswordRouter.js');
const fileshareRouter = require('./routes/fileshareRouter.js');
const teammembershipRouter = require('./routes/teammembershipRouter.js');
const roleTypeRouter = require('./routes/roleTypeRouter.js');
const logRouter = require('./routes/logRouter.js');
const trainingRouter = require('./routes/trainingRouter.js');
const permissionRouter = require('./routes/permissionRouter.js');
const discordBotRouter = require('./routes/discordBotRouter.js');
const discordBot = require('./js/serverJS/discordBot.js');
const {checkAuthenticated} = require('./js/serverJS/sessionChecker.js');
const leagueRouter = require('./routes/leagueRouter.js');
const valorantRouter = require('./routes/valorantRouter.js');
const calendarRouter = require('./routes/calendarRouter.js');
const wooCommereceRouter = require('./routes/wooCommerceRouter.js');
const patchnotesRouter = require('./routes/patchnotesRouter.js');
const riot = require('./js/serverJS/riot.js');
const {logMessage, LogLevel} = require('./js/serverJS/logger.js');
const {sendTrainingDataReminders, sendGamedayReportReminder, sendWeeklyLoLReport} = require("./js/serverJS/discordBot");
const trainingNotesRouter = require("./routes/trainingNotesRouter");
const gamedayRouter = require("./routes/gamedayRouter");
const cronjobRouter = require("./routes/cronjobRouter");
const {updateSubscriptionTable} = require("./js/serverJS/wooCommerceIntegration");
const cronManager = require('./js/serverJS/cron/cronManager.js');

/**
 * MIDDLEWARE
 */
app.set('view engine', 'ejs');
console.log(__dirname);
app.use('/dist', express.static(__dirname + '/dist'));
app.use('/css', express.static(__dirname + '/css'));
app.use('/fonts', express.static(__dirname + '/fonts'));
app.use('/html', express.static(__dirname + '/html'));
app.use('/js/clientJS', express.static(__dirname + '/js/clientJS'));
app.use('/res', express.static(__dirname + '/res'));
app.use('/richtexteditor', express.static(__dirname + '/richtexteditor'));
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

/**
 * DISCORD BOT
 */
const guildId = "951559378354450483";
const client = new DiscordBot.Client({intents: 3276799});
client.login(process.env.DISCORD_TOKEN).then(() => {
    client.once('ready', () => {
        // This code will execute only once when the client is ready
        discordBot.setupDiscordBot(guildId, client);
        cronManager.registerCronJobs();
    });
});


/**
 * PASSPORT SETUP / SESSION HANDLING
 */
passportConfig.initialize(passport);
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 * 24 * 90 } // Session will last 90 Days
}));

app.use(flash());
app.use(passport.session());
app.use(passport.initialize());

/**
 * CLEAN UP JOB FOR EXPIRED SESSIONS
 */
cron.schedule('0 3 * * *', function() {
    pool.query('DELETE FROM "session" WHERE "expire" < NOW() OR "sess"::jsonb ->> \'passport\' IS NULL', (err) => {
        if (err) {
            console.log(err);
        } else {
            logMessage('Expired and user-less sessions cleaned up', LogLevel.INFO, null)
            console.log('Expired and user-less sessions cleaned up');
        }
    });
});

/**
 * WOO COMMERCE WEBHOOK
 */
//wooCommerceIntegration.addCreateOrderWebhook();
wooCommerceIntegration.updateSubscriptionTable();

/**
 * Get the newest DDragonData from the Riot API every morning at 3:00 AM
 */
cron.schedule('0 3 * * *', async function() {
    // Create the file path by combining the folder path and file name
    const filePath = "./res/riot/dragonData.json";
    let jsonData;

    try {
        // Get the JSON data asynchronously and wait until it is ready
        jsonData = await riot.getDDragonData();
    } catch (err) {
        console.error(`Error getting DDragon data: ${err}`);
        return; // Exit the function if an error occurs
    }

    try {
        // Check if the file exists
        if (fs.existsSync(filePath)) {
            // Delete the existing file
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
        }

        // Create a new file with the JSON data
        fs.writeFileSync(filePath, JSON.stringify(jsonData));
        logMessage(`Updated League of Legends Champion data`, LogLevel.INFO, null)
        console.log(`Created file: ${filePath}`);
    } catch (err) {
        console.error(`Error replacing JSON file: ${err}`);
    }
});

/**
 * Sends discord reminders for inserting training data every morning at 10:00 AM
 */
//*/3 * * * *
cron.schedule('0 10 * * *', function() {
    console.log("Sending training data reminders...");
    sendTrainingDataReminders();
    console.log("Sending Gamedayreport reminders...");
    sendGamedayReportReminder();
});

/**
 * Updates the Subscription Table every 30 minutes
 */
cron.schedule('*/30 * * * *', function() {
    updateSubscriptionTable();
});

/**
 * ROUTERS
 */
app.use('/login', loginRouter(passport));
app.use('/dashboard', dashboardRouter);
app.use('/presence', presenceRouter);
app.use('/user', userRouter);
app.use('/team', teamRouter);
app.use('/teamtype', teamTypeRouter);
app.use('/registrationcode', registrationCodeRouter);
app.use('/register', registerRouter);
app.use('/resetPassword', resetPasswordRouter);
app.use('/fileshare', fileshareRouter);
app.use('/roletype', roleTypeRouter);
app.use('/teammembership', teammembershipRouter);
app.use('/permission', permissionRouter);
app.use('/discordbot', discordBotRouter(client, guildId));
app.use('/valorant', valorantRouter.router);
app.use('/league', leagueRouter.router);
app.use('/logs', logRouter);
app.use('/training', trainingRouter);
app.use('/calendar', calendarRouter);
app.use('/wooCommerce', wooCommereceRouter);
app.use('/trainingNotes', trainingNotesRouter);
app.use('/patchnotes', patchnotesRouter);
app.use('/gameday', gamedayRouter);
app.use('/cronjob', cronjobRouter.router);

 /**
 * MAIN ROUTES
 */
 app.get('/', checkAuthenticated, (req, res) => {
     const originalQuery = req.originalUrl.split('?')[1];
     res.redirect(`/login${originalQuery ? '?' + originalQuery : ''}`);
 });

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/error', (req, res) => {
    res.render('error');
});

/**
 * GET route which returns the current session status
 */
app.get('/session-status', function (req, res) {
    if (req.isAuthenticated()) {
        res.json({ isAuthenticated: true });
    } else {
        res.json({ isAuthenticated: false });
    }
});

/**
 * GET routes for rendering a single Entry Field
 */
app.get('/renderEntryField', (req, res) => {
    let { type, name, id, width, value } = req.query;

    type = type === 'undefined' ? undefined : type;
    name = name === 'undefined' ? undefined : name;
    id = id === 'undefined' ? undefined : id;
    width = width === 'undefined' ? undefined : width;
    value = value === 'undefined' ? undefined : value;

    res.render('components/entryfield.ejs', {
        type, name, id, width, value
    });
});

/**
 * GET routes for rendering a single Button
 */
app.get('/renderButton', (req, res) => {
    let { type, id, width, text, icon, customClasses, iconPos, btnType, inputId } = req.query;

    type = type === 'undefined' ? undefined : type;
    id = id === 'undefined' ? undefined : id;
    width = width === 'undefined' ? undefined : width;
    text = text === 'undefined' ? undefined : text;
    icon = icon === 'undefined' ? undefined : icon;
    customClasses = customClasses === 'undefined' ? undefined : customClasses;
    iconPos = iconPos === 'undefined' ? undefined : iconPos;
    btnType = btnType === 'undefined' ? undefined : btnType;
    inputId = inputId === 'undefined' ? undefined : inputId;

    res.render('components/buttondefault.ejs', {
        type, id, width, text, icon, customClasses, iconPos, btnType, inputId
    });
});

/**
 * GET routes for rendering a single dropdown
 */
app.get('/renderDropdown', (req, res) => {
    let { id, width, options, defaultOption } = req.query;

    id = id === 'undefined' ? undefined : id;
    width = width === 'undefined' ? undefined : width;
    options = options === 'undefined' ? undefined : JSON.parse(options);
    defaultOption = defaultOption === 'undefined' ? undefined : defaultOption;

    res.render('components/dropdown.ejs', {
        id, width, options, defaultOption
    });
});

/**
 * GET routes for rendering a single textarea
 */
app.get('/renderTextarea', (req, res) => {
    let { id, width, value } = req.query;

    id = id === 'undefined' ? undefined : id;
    width = width === 'undefined' ? undefined : width;
    value = value === 'undefined' ? undefined : value;

    res.render('components/textarea.ejs', {
        id, width, value
    });
});

module.exports = app;