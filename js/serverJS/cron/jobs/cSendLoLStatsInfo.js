/**
 * This Job is responsible for sending the LoL Stats Info
 */
const leagueRouter = require('../../../../routes/leagueRouter');
const {pool} = require('../../../serverJS/database/dbConfig.js');
const {getLoLMatchIds} = require("../../../serverJS/riot");
const discordBot = require('../../discordBot');

class cSendLoLStatsInfo {
    discordChannelId = 0;
    teamId = 0;
    roleId = 0;
    timeFrame = 0;
    minSoloQGames = 0;
    minFlexQGames = 0
    modes = ['Ranked_Solo', 'Ranked_Flex'];
    msgDivider = "------------------------------------------------------------------------------------------------"

    async execute() {
        const users = await this.getUsers();
        const currentWeek = this.getCurrentWeek();

        await this.sendStartMessage(currentWeek);

        for (const user of users.rows) {
            let message = ""; // Initialize message string
            const riotId = user.riotgames;
            if (!riotId) {
                message += `**__Riot ID not found for ${user.username}__**\n`;
                await discordBot.sendMessageToChannel(this.discordChannelId, message + this.msgDivider);
                continue; // Skip this user if Riot ID is not found
            }

            try {
                let soloQMatchHistory = await this.fetchMatchIds(riotId, 420)
                let flexQMatchHistory = await this.fetchMatchIds(riotId, 440)

                // Check if match history fetch was successful or not before proceeding
                if (!soloQMatchHistory || !flexQMatchHistory) {
                    message += `**__Error fetching match history for ${user.username}__**\n`;
                    await discordBot.sendMessageToChannel(this.discordChannelId, message + this.msgDivider);
                    continue;
                }

                let totalSoloQGames = soloQMatchHistory.matchList.length
                let totalFlexQGames = flexQMatchHistory.matchList.length

                message += `**${riotId}:**\n`;
                message += `${this.modes[0]}: ${totalSoloQGames}\n`;
                message += `${this.modes[1]}: ${totalFlexQGames}\n`;

                let requirementsMet = true;
                let unmetRequirements = [];

                if (totalSoloQGames < this.minSoloQGames) {
                    unmetRequirements.push(`**SoloQ :x: **`);
                    requirementsMet = false;
                }
                if (totalFlexQGames < this.minFlexQGames) {
                    unmetRequirements.push(`**FlexQ :x:**`);
                    requirementsMet = false;
                }

                if (requirementsMet) {
                    message += `**Congratulations! All requirements are met. Keep it up! :white_check_mark: :white_check_mark: **\n`;
                } else {
                    message += `*Not all requirements were met*:\n${unmetRequirements.join("\n")}\n`;
                }

                // Send final constructed message
                await discordBot.sendMessageToChannel(this.discordChannelId, message + this.msgDivider);

            } catch (error) {
                console.error(`Error processing ${user.username}:`, error);
                await discordBot.sendMessageToChannel(this.discordChannelId, `**__Error processing ${user.username}__**\n` + this.msgDivider);
            }
        }

        await this.sendEndMessage();
    }

    async sendStartMessage(currentWeek) {
        let message = `🔥 **Week ${currentWeek} League of Legends Stats Report** 🔥\n\n`;
        message += 'These are the requirements:\n'
        message += `*15 Games, either SoloQ, Scrims, or Flex as 4+*\n`
        await discordBot.sendMessageToChannel(this.discordChannelId, message);
    }

    async sendEndMessage() {
        let message = `\nKeep it up <@&${this.roleId}>! :muscle:`;
        await discordBot.sendMessageToChannel(this.discordChannelId, message);
    }

    /**
     * Fetches a List with match ID's that the user played in the specific timeFrame
     * @param riotId The RiotId of the user
     * @param mode The queue (Ranked = 420, Flex = 440)
     * @returns {Promise<unknown>} A List with all Match ID's of the timeFrame
     */
    fetchMatchIds(riotId, mode){
        return new Promise((resolve, reject) => {
            leagueRouter.getAccountInfo(riotId).then(async response => {
                if (response.isValid === 'false') {
                    resolve('Invalid Riot ID');
                } else {
                    let endTime = Math.floor(new Date().getTime() / 1000)
                    let startTime = endTime - (this.timeFrame * 86400)
                    const result = await getLoLMatchIds(response.data.puuid, startTime, endTime, mode)
                    resolve(result);
                }
            });
        });
    }

    /**
     * Returns the current week (KW)
     */
    getCurrentWeek() {
        const today = new Date();
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        const pastDaysOfYear = (today - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7) - 1;
    }

    /**
     * This function is responsible for getting all the users from a team
     * @returns {Promise<QueryResult<any>>}
     */
    getUsers() {
        return pool.query(`SELECT account.id, username, riotgames
                           FROM account
                                    LEFT JOIN teammembership ON teammembership.account_fk = account.id
                           WHERE teammembership.team_fk = $1
                             AND teammembership.coach = 0
                             AND teammembership.active = 1`, [this.teamId]);
    }

    /**
     * Sets the discord channel id
     * @param discordChannelId
     */
    setDiscordChannelId(discordChannelId) {
        this.discordChannelId = discordChannelId;
    }

    /**
     * Sets the team id
     * @param teamId
     */
    setTeamId(teamId) {
        this.teamId = teamId;
    }

    /**
     * Sets the role id which gets pinged by the message
     * @param roleId
     */
    setRoleId(roleId) {
        this.roleId = roleId;
    }

    /**
     * Sets the time frame in which the goal has to be achieved
     * @param timeFrame in days
     */
    setTimeFrame(timeFrame) {
        this.timeFrame = timeFrame;
    }

    /**
     * Sets the minimum amount of soloQ games that are required to achieve the goal
     * @param minSoloQGames
     */
    setMinSoloQGames(minSoloQGames) {
        this.minSoloQGames = minSoloQGames;
    }

    /**
     * Sets the minimum amount of FlexQ games that are required to achieve the goal
     * @param minFlexQGames
     */
    setMinFlexQGames(minFlexQGames) {
        this.minFlexQGames = minFlexQGames;
    }
}

module.exports = cSendLoLStatsInfo;