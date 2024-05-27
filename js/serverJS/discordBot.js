const util = require("util");
const {pool} = require("./database/dbConfig");
const {logMessage, LogLevel} = require("./logger");

let guildId;
let client;

function setupDiscordBot(pGuildId, pClient) {
    guildId = pGuildId;
    client = pClient;

    registerFriendCommand();
}

/**
 * Registers the /setFriend command
 * This allows everybody with the role Community Member or higher to assign the friend role to a user
 */
function registerFriendCommand() {
    client.guilds.fetch(guildId).then(async (guild) => {
        await guild.commands.create({
            name: 'setfriend',
            description: 'Assign the friend role to a guest',
            options: [
                {
                    name: 'username',
                    type: 3,
                    description: 'The username of the guest to be set as a friend',
                    required: true,
                },
            ],
        });
        console.log('Setfriend command registered');
    });

    // Event listener for when a slash command is invoked
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isCommand()) return;

        const {commandName, options} = interaction;

        if (commandName === 'setfriend') {
            const username = options.getString('username');

            // Call your setFriendRole function here
            const result = await setFriendRole(username, interaction.member);

            if (result.success) {
                await interaction.reply(`Success: ${result.message}`);
            } else {
                await interaction.reply({content: `Error: ${result.message}`, ephemeral: true});
            }
        }
    });
}

/**
 * Sets a friend role to a user
 * @param username
 */
const setFriendRole = async (username, sender) => {
    let guild;
    let user;
    let friendRole;
    let minimumRole;

    guild = client.guilds.cache.get(guildId);
    if (!guild) {
        logMessage(`/setFriend: Invalid Guild ID or the bot is not a member of the guild.`, LogLevel.ERROR, null);
        return {
            success: false,
            message: `An unexpected error occurred. If the issue persists please contact Staff! Errorcode: db-01`
        };
    }

    const members = await guild.members.fetch();
    user = members.find(member => member.user.username === username);

    if (!user) {
        return {success: false, message: `Sorry no user with the username "${username}" was found on the server!`};
    }

    friendRole = guild.roles.cache.get('1055920519746158614'); //Friend Role ID
    minimumRole = guild.roles.cache.get('952109499668373524'); //Community Member ID

    if (!friendRole) {
        return {
            success: false,
            message: `An unexpected error occurred. If the issue persists please contact Staff! Errorcode: db-02`
        };
    }
    if (!minimumRole) {
        return {
            success: false,
            message: `An unexpected error occurred. If the issue persists please contact Staff! Errorcode: db-03`
        };
    }

    const hasMinRoleOrHigher = sender.roles.cache.some(role => role.position >= minimumRole.position);
    if (hasMinRoleOrHigher) {
        await user.roles.add(friendRole);
        logMessage(`/setFriend: ${sender.user.username} set ${username} as a friend.`, LogLevel.INFO, null);
        return {success: true, message: `Successfully set "${username}" as a friend.`};
    } else {
        return {success: false, message: `You do not have the permission to promote any members! If you think that's an error, please contact staff.`};
    }
};

/**
 * Method which returns the amount of discord members
 * @returns
 */
const getCurrentDiscordMembers = async () => {
    let guild = client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Invalid Guild ID or the bot is not a member of the guild.');

    let onlineMembers;
    await guild.members.fetch().then(members => {
        onlineMembers = members.filter((member) => !member.user?.bot && member.presence?.status.length > 2).map((member) => member).length;
    })

    return {
        onlineMembers: onlineMembers,
        totalMembers: guild.memberCount
    };
};

/**
 * Method which sends a direct message to a specific user
 * @param discordUsername
 * @param message
 * @returns
 */
const sendMessageToUser = async (discordUsername, message) => {
    let guild;
    let user;

    try {
        guild = client.guilds.cache.get(guildId);
        if (!guild) throw new Error('Invalid Guild ID or the bot is not a member of the guild.');

        const members = await guild.members.fetch();
        user = members.find(member => member.user.username === discordUsername);

        if (!user) throw new Error('User not found');

        await user.send(message);
    } catch (error) {
        console.error(error);
        logMessage(`Error sending message to user ${discordUsername}. Error Message: ${error}`, LogLevel.ERROR, null)
    }
};

/**
 * This function sends a message to all users who don't have inserted their training data
 * It triggers if the user has the notification setting enabled and no training data is found for the next 3 days
 */
async function sendTrainingDataReminders() {
    const query = util.promisify(pool.query).bind(pool);
    const result = await query(`WITH prep AS (SELECT discord, username, count(presence.id) AS presenceCount
                                              FROM account
                                                       LEFT JOIN presence ON presence.account_fk = account.id
                                                       LEFT JOIN teammembership ON teammembership.account_fk = account.id
                                                       LEFT JOIN team ON team.id = teammembership.team_fk
                                              WHERE (presence.date IS NULL)
                                                 OR (to_timestamp(presence.date) > NOW() AND
                                                     to_timestamp(presence.date) <
                                                     NOW() + INTERVAL '1 day' * team.discordnotificationdays) AND
                                                    trainingdatareminder = 1 AND teammembership.active = 1
                                              GROUP BY discord, username)

                                SELECT prep.discord, prep.username, team.discordnotificationdays
                                FROM prep
                                         LEFT JOIN account ON account.username = prep.username
                                         LEFT JOIN teammembership ON teammembership.account_fk = account.id
                                         LEFT JOIN team ON team.id = teammembership.team_fk
                                WHERE (presencecount + 1) < team.discordnotificationdays
                                  AND prep.discord IS NOT NULL
                                  AND account.trainingdatareminder = 1 AND teammembership.active = 1`);

    if (result.rows.length > 0) {
        result.rows.forEach((row) => {
            console.log(`Sending training data reminder to ${row.username}...`);
            sendMessageToUser(row.discord, `Hey there, ${row.username} 👋
            
We noticed that your training data for the next ${row.discordnotificationdays} days hasn't been logged yet! 📝

:point_right: Please visit https://webapp.teamgenetix.ch and insert your training data

:point_right: If you don't want to receive these messages anymore, you can disable them via Settings > Manage Notifications

Thank you and keep up the great work with your training! 💪

Your Team Genetix Bot 🤖
            `)
        });

        let userString = "";
        result.rows.forEach((row) => {
            userString += row.username + ", "
        });

        logMessage(`Sent training data reminders to the following users: ${userString}`, LogLevel.INFO, null)
    } else {
        logMessage(`No users found for training data reminder`, LogLevel.INFO, null)
    }
}

/**
 * This function sends a message to all users who did not report the gameday result after 24hrs
 */
async function sendGamedayReportReminder() {
    const query = util.promisify(pool.query).bind(pool);
    const result = await query(`SELECT gameday.id, title, account.discord, account.username FROM gameday
                                LEFT JOIN account ON account.id = gameday.creator_fk
                                WHERE NOT EXISTS (SELECT * FROM gamedayreport WHERE gamedayreport.gameday_fk = gameday.id) AND date + INTERVAL '24 hours' <= NOW() `);

    if (result.rows.length > 0) {
        result.rows.forEach((row) => {
            console.log(`Sending training data reminder to ${row.username}...`);
            sendMessageToUser(row.discord, `Hey there, ${row.username} 👋
            
❗ We noticed that you have not logged any results for the Gameday «${row.title}» ❗

:point_right: Please visit https://webapp.teamgenetix.ch and insert the result as soon as possible.

Your Team Genetix Bot 🤖
            `)
        });

        let userString = "";
        result.rows.forEach((row) => {
            userString += row.username + ", "
        });

        logMessage(`Sent gameday result reporting reminder to the following users: ${userString}`, LogLevel.INFO, null)
    } else {
        logMessage(`No users found for gameday result reporting reminder`, LogLevel.INFO, null)
    }
}

/**
 * This function sends a welcome message to a new user
 */
function sendWelcomeMessage(discordUsername) {
    sendMessageToUser(discordUsername, `Hey there, ${discordUsername} 👋

You have successfully linked your Discord account with your Team Genetix Webapp account! 🎉

Your Team Genetix Bot 🤖`)
}

/**
 * Method which sends a message to a specific channel by its name
 * @param channelId
 * @param message
 * @returns
 */
const sendMessageToChannel = async (channelId, message) => {
    let guild;
    let channel;

    try {
        guild = client.guilds.cache.get(guildId);
        if (!guild) {
            logMessage(`Invalid Guild ID or the bot is not a member of the guild.`, LogLevel.ERROR, null);
            console.error('Invalid Guild ID or the bot is not a member of the guild.');
        }

        if (guild.channels.cache.size === 0) {
            await guild.channels.fetch()
        }

        channel = guild.channels.cache.find(ch => ch.id === channelId);

        if (!channel) {
            logMessage(`Channel ${channelId} not found`, LogLevel.ERROR, null);
            console.error(`Channel ${channelId} not found`);
        }

        await channel.send(message);
    } catch (error) {
        console.error(error);
        logMessage(`Error sending message to channel ${channelId}. Error Message: ${error}`, LogLevel.ERROR, null)
    }
};

/**
 * Checks if a given Discord username exists in the guild
 * @param discordUsername
 * @returns {Promise<boolean>}
 */
const doesUserExist = async (discordUsername) => {
    // Function to wait until guilds cache is available
    let counter = 0;

    const waitForGuildsCache = () => {
        return new Promise((resolve) => {
            const checkGuildsCache = () => {
                if (client.guilds || counter >= 20) {
                    clearInterval(interval);
                    resolve();
                }
                counter++;
            };

            const interval = setInterval(checkGuildsCache, 500); // Check every 1/2 second
            checkGuildsCache(); // Check immediately
        });
    };

    // Wait until guilds cache is available
    await waitForGuildsCache();

    // Now that guilds cache is available, proceed with the rest of the code
    let guild = client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Invalid Guild ID or the bot is not a member of the guild.');

    const members = await guild.members.fetch();
    return members.some(member => member.user.username === discordUsername);
};


module.exports = {
    getCurrentDiscordMembers,
    sendMessageToUser,
    sendTrainingDataReminders,
    setupDiscordBot,
    sendWelcomeMessage,
    sendMessageToChannel,
    doesUserExist,
    sendGamedayReportReminder
};

