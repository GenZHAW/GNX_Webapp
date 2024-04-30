/**
 * This Job is responsible for sending the gameday report reminder to discord
 */
const {sendGamedayReportReminder} = require("../../discordBot");

class cSendGamedayReportReminder {

    /**
     * Main Logic of the cron job
     * @returns {Promise<void>}
     */
    async execute() {
        console.log("Sending gameday report reminders...");
        await sendGamedayReportReminder();
    }
}

module.exports = cSendGamedayReportReminder;




