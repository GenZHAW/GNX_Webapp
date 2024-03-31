/**
 * This Job is responsible for sending the Valorant Stats Info
 */
const valorantRouter = require('../../../../routes/valorantRouter');
const {pool} = require('../../../serverJS/database/dbConfig.js');
const {getMatchHistory, checkIfRiotIdValid} = require("../../../../routes/valorantRouter");
const discordBot = require('../../discordBot');
const {sendMessageToChannel} = require("../../discordBot");

class cSendValorantStatsInfo {
    discordChannelId = 0;
    teamId = 0;
    roleId = 0;
    modes = ['competitive', 'premier', 'team-deathmatch', 'deathmatch'];
    DmTdmGames = 30
    CompPremierGames = 20
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
     * This function calculates the wins and losses of each player in each mode for a specific amount of days.
     * It also checks if the requirements are met.
     *
     * @param riotIds
     * @param modes
     * @param amountOfDays
     * @returns {Promise<void>}
     */
    async execute(){
        try {
            const users = await this.getUsers();
            const currentWeek = this.getCurrentWeek();

            this.sendStartMessage(currentWeek);
            // Get match history and calculate stats for each player
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
                let modeAndJsonArray = await getMatchHistory(name, tag, this.modes);
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
                    const teamDeathmatchTotal = modeStats['team-deathmatch'].games;
                    const deathmatchTotal = modeStats['deathmatch'].games;
                    const competitiveTotal = modeStats['competitive'].games;
                    const premierTotal = modeStats['premier'].games;

                    let requirementsMet = true;
                    let unmetRequirements = [];

                    if (teamDeathmatchTotal + deathmatchTotal < this.DmTdmGames) {
                        unmetRequirements.push(`**TDM + DM :x: **`);
                        requirementsMet = false;
                    }
                    if (competitiveTotal + premierTotal < this.CompPremierGames) {
                        unmetRequirements.push(`**Competitive + Premier :x:**`);
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
    }
    sendStartMessage(currentWeek){
        let message = `🔥 **Week ${currentWeek} Valorant Stats Report** 🔥\n\n`;
        message += 'These are the requirements:\n'
        message += `*Both Team Competitive and Premiere must have at least ${this.CompPremierGames} games played*\n`
        message += `*Both Team Deathmatch and Deathmatch must have at least ${this.DmTdmGames} games played*`
        discordBot.sendMessageToChannel(this.discordChannelId, message);
    }

    sendEndMessage(){
        let message = `\nKeep it up <@&${this.roleId}>! :muscle:`;
        discordBot.sendMessageToChannel(this.discordChannelId, message);
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

}

module.exports = cSendValorantStatsInfo;




