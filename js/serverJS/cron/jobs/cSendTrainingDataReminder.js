/**
 * This Job is responsible for sending the training data reminder to discord
 */
const {sendTrainingDataReminders} = require("../../discordBot");

class cSendTrainingDataReminder {

    /**
     * Main Logic of the cron job
     * @returns {Promise<void>}
     */
    async execute() {
        console.log("Sending training data reminders...");
        await sendTrainingDataReminders();
    }
}

module.exports = cSendTrainingDataReminder;




