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
    timeFrame = 0;
    minSoloQGames = 0;
    minFlexQGames = 0
    modes = ['RANKED_SOLO_5x5', 'RANKED_FLEX_SR'];
    msgDivider = "------------------------------------------------------------------------------------------------"

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

            discordBot.sendMessageToChannel(this.discordChannelId, message + this.msgDivider);

            let soloQMatchHistory = await this.fetchMatchHistory(riotId, this.modes[0]);
            let flexQMatchHistory = await this.fetchMatchHistory(riotId, this.modes[1]);

            if((soloQMatchHistory || flexQMatchHistory) === 'Invalid Riot ID'){
                message += `**__Riot ID not is not valid for ${user.username} with riot id: ${user.riotgames}__**\n`
                discordBot.sendMessageToChannel(this.discordChannelId, message + this.msgDivider);
                continue;
            }

            let totalSoloQGames = this.calculateTotalGames(soloQMatchHistory);
            let totalFlexQGames = this.calculateTotalGames(flexQMatchHistory);

            message += "TotalGames" + totalSoloQGames + " " + totalFlexQGames
            discordBot.sendMessageToChannel(this.discordChannelId, message + this.msgDivider);


            message += `**${riotId}:**\n`;
            message += `${modes[0]}: ${totalSoloQGames}\n`;
            message += `${modes[1]}: ${totalFlexQGames}\n`;

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

            discordBot.sendMessageToChannel(this.discordChannelId, message + this.msgDivider);

            this.sendEndMessage()
        }
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
     * @returns {number}
     * @param matchHistory
     */
    calculateTotalGames(matchHistory) {
        const currentDate = new Date();
        let totalGames = 0;

        matchHistory.matches.forEach(match => {
            const matchDate = new Date(match.metadata.timestamp);
            const timeDiff = currentDate - matchDate;
            const diffDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            if (diffDays <= this.timeFrame) {
                totalGames++;
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
     * Fetches the match history for a specific user
     * @param riotId
     * @param days
     * @param mode
     * @returns {Promise<unknown>}
     */
    fetchMatchHistory(riotId, mode){
        return new Promise((resolve, reject) => {
            leagueRouter.getAccountInfo(riotId).then(async response => {
                if (response.isValid === 'false') {
                    resolve('Invalid Riot ID');
                } else {
                    const result = await leagueRouter.getMatchHistory(riotId.split('#')[0], riotId.split('#')[1], this.timeFrame, mode)
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
     * Sets the time frame in which the goal has to be achieved
     * @param timeFrame
     */
    setTimeFrame(timeFrame){
        this.timeFrame = timeFrame;
    }

    /**
     * Sets the minimum amount of soloQ games that are required to achieve the goal
     * @param minSoloQGames
     */
    setMinSoloQGames(minSoloQGames){
        this.minSoloQGames = minSoloQGames;
    }

    /**
     * Sets the minimum amount of FlexQ games that are required to achieve the goal
     * @param minFlexQGames
     */
    setMinFlexQGames(minFlexQGames){
        this.minSoloQGames = minFlexQGames;
    }

}

module.exports = cSendLoLStatsInfo;