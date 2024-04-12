/**
 * This Job is responsible for sending the LoL Stats Info
 */
const leagueRouter = require('../../../../routes/leagueRouter');
const {pool} = require('../../../serverJS/database/dbConfig.js');
const {getMatchHistory, getGamesPlayed} = require("../../../../routes/leagueRouter");
const discordBot = require('../../discordBot');
const {checkIfRiotIdValid, getCondensedMatchHistory} = require("../../../../routes/valorantRouter");

class cSendLoLStatsInfo {
    discordChannelId = 0;
    teamId = 0;
    roleId = 0;
    modes = ['RANKED_SOLO_5x5', 'RANKED_FLEX_SR'];
    soloQGames = 0
    flexGames = 0
    amountOfDays = 7
    msgDivider = "------------------------------------------------------------------------------------------------"

    /**
     * Sets the discord channel id
     * @param discordChannelId
     */
     setDiscordChannelId(discordChannelId){
        this.discordChannelId = discordChannelId;
    }

    /**
     * Sets the team id
     * @param teamId
     */
    setTeamId(teamId){
        this.teamId = teamId;
    }

    /**
     * Sets the role id which gets pinged by the message
     * @param roleId
     */
    setRoleId(roleId){
        this.roleId = roleId;
    }

    /**
     * This function is responsible for running the job
     */
    async execute() {
        const users = await this.getUsers();
        const currentWeek = this.getCurrentWeek();

        this.sendStartMessage(currentWeek);

        for (const user of users.rows) {
            let message = ""; // Initialize message string
            const riotId = user.riotgames
            if (!riotId) {
                message += `**__Riot ID not found for ${user.username}__**\n`
                discordBot.sendMessageToChannel(this.discordChannelId, message + this.msgDivider);
                continue; // Skip this user if Riot ID is not found
            }

            const [name, tag] = riotId.split("#");
            let isRiotIdValid = (await checkIfRiotIdValid(riotId)).isValid;
            if (isRiotIdValid !== 'true'){
                message += `**__Riot ID not is not valid for ${user.username} with riot id: ${user.riotgames}__**\n`
                discordBot.sendMessageToChannel(this.discordChannelId, message + this.msgDivider);
                continue;
            }

            let modeAndJsonArray = await getGamesPlayed(name, tag, this.modes);
            if (modeAndJsonArray) {
                let modeStats = {}; // Object to store mode-wise stats for this player
                // Initialize mode-wise stats
                this.modes.forEach(mode => {
                    modeStats[mode] = { games: 0 }; // Initialize games to 0
                });

                // Calculate total games played for each mode
                modeAndJsonArray.forEach(modeAndJson => {
                    const mode = modeAndJson[0];
                    const jsonData = modeAndJson[1];
                    if (jsonData && jsonData.data && jsonData.data.heatmap) {
                        const heatmapData = jsonData.data.heatmap;
                        const totalGames = this.calculateTotalGames(heatmapData, this.amountOfDays); // Function to calculate total games
                        // Update mode-wise stats
                        modeStats[mode].games += totalGames;
                    }
                });

                // Output mode-wise stats for this player
                message += `**${riotId}:**\n`;
                Object.keys(modeStats).forEach(mode => {
                    message += `${mode}: ${modeStats[mode].games}\n`;
                });

                // Check requirements for this player
                const soloQTotal = modeStats[this.modes[0]].games;
                const flexTotal = modeStats[this.modes[1]].games;


                let requirementsMet = true;
                let unmetRequirements = [];

                if (soloQTotal < this.soloQGames) {
                    unmetRequirements.push(`**SoloQ :x: **`);
                    requirementsMet = false;
                }
                if (flexTotal < this.flexGames) {
                    unmetRequirements.push(`**FlexQ :x:**`);
                    requirementsMet = false;
                }

                if (requirementsMet) {
                    message += `**Congratulations! All requirements are met. Keep it up! :white_check_mark: :white_check_mark: **\n`;
                } else {
                    message += `*Not all requirements were met*:\n${unmetRequirements.join("\n")}\n`;
                }
            } else {
                message += `Match history data not found for ${riotId}\n`;
            }
            // Send message to the Discord channel
            discordBot.sendMessageToChannel(this.discordChannelId, message + this.msgDivider);
        }
        this.sendEndMessage()

    } catch (error) {
        console.error('Error initializing page:', error);
    }

    sendStartMessage(currentWeek){
        let message = `🔥 **Week ${currentWeek} League of Legends Stats Report** 🔥\n\n`;
        message += 'These are the requirements:\n'
        message += `*15 Games, either SoloQ, Scrims, or Flex as 4+*\n`
        discordBot.sendMessageToChannel(this.discordChannelId, message);
    }

    sendEndMessage(){
        let message = `\nKeep it up <@&${this.roleId}>! :muscle:`;
        discordBot.sendMessageToChannel(this.discordChannelId, message);
    }

    /**
     * Calculate the wins and loses for the set amount of days
     * @param heatmapData The match history data
     * @param amountOfDays The amount of days to track
     * @returns {{wins: number, losses: number}}
     */
    calculateTotalGames(heatmapData, amountOfDays) {
        const currentDate = new Date();
        let totalGames = 0;

        heatmapData.forEach(data => {
            const matchDate = new Date(data.date);
            const timeDiff = currentDate - matchDate;
            const diffDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            if (diffDays <= amountOfDays) {
                totalGames += data.values.matches;
            }
        });

        return totalGames;
    }

    /**
     * Prepares the message and sends it to the channel
     * @param data
     * @param currentWeek
     */
    sendMessageToChannel(data, currentWeek){
        let message = `🔥 **Week ${currentWeek} LoL Stats Report** 🔥\n\n`;
        data.forEach(user => {
            if(user.data === 'Invalid Riot ID'){
                message += `${user.user}: :exclamation: **${user.data}**\n`;
            }else{
                message += `${user.user}: ${user.data} games\n`;
            }
        });

        message += `\nKeep it up <@&${this.roleId}>! :muscle:`;

        discordBot.sendMessageToChannel(this.discordChannelId, message);
    }

    /**
     * Fetches the match history of a user
     * @param riotId
     */
    fetchMatchHistory(riotId){
        return new Promise((resolve, reject) => {
            leagueRouter.getAccountInfo(riotId).then(async response => {
                if (response.isValid === 'false') {
                    resolve('Invalid Riot ID');
                } else {
                    const result = await leagueRouter.getMatchHistory(riotId.split('#')[0], riotId.split('#')[1], 7)
                    resolve(result.length);
                }
            });
        });
    }

    /**
     * Returns the current week (KW)
     */
    getCurrentWeek(){
        const today = new Date();
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        const pastDaysOfYear = (today - firstDayOfYear) / 86400000;
        return  Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    /**
     * This function is responsible for getting all the users from a team
     * @returns {Promise<QueryResult<any>>}
     */
    getUsers(){
        return pool.query(`SELECT account.id, username, riotgames FROM account
                                            LEFT JOIN teammembership ON teammembership.account_fk = account.id
                                            WHERE teammembership.team_fk=$1 AND teammembership.coach=0 AND teammembership.active=1`, [this.teamId]   );
    }
}

module.exports = cSendLoLStatsInfo;