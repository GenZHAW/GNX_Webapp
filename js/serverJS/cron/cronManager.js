/**
 * This Files is responsible for managing all cron jobs
 */
const cronJobRouter = require("../../../routes/cronjobRouter");
const cron = require('node-cron');

let availableCronJobs = [{name: 'cSendLoLStatsInfo', id: 1}, {name: 'cSendValorantStatsInfo', id: 3}];
let taskList = [];

/**
 * This function is responsible for registering all cron jobs
 */
async function registerCronJobs() {
    let cronJobs = await cronJobRouter.getExistingCronjobs();
    cronJobs = cronJobs.rows;

    let id = 3;
    cronJobs.forEach(cronJob => {
        let cronJobDefinition = availableCronJobs.find(availableCronJob => availableCronJob.id === cronJob.cronjobdefinition_fk);
        if (cronJobDefinition) {
            const TaskClass = require(`./jobs/${cronJobDefinition.name}`);
            let taskInstance = new TaskClass(cronJob);
            taskInstance = setTaskParams(taskInstance, cronJob, cronJobDefinition.name)
            if(cronJobDefinition.name === 'cSendValorantStatsInfo'){
                taskInstance.execute();
            }
            /*const scheduledTask = cron.schedule(cronJob.executioninterval, () => {
                taskInstance.execute();
            }, {
                scheduled: true
            });*/

            //taskList.push({id: id, name: cronJobDefinition.name, task: scheduledTask});
            id++;
        }else{
            console.error(`Cronjob with id ${cronJob.cronjobdefinition_fk} does not exist!`)
        }
    });
}

/**
 * Sets all  required params into the task Class
 * @param taskClass
 * @param cronJob
 * @param cronJobName
 */
function setTaskParams(taskClass, cronJob, cronJobName){
    switch (cronJobName) {
        case 'cSendLoLStatsInfo':
            taskClass.setDiscordChannelId(cronJob.discordchannelid);
            taskClass.setTeamId(cronJob.team_fk);
            taskClass.setRoleId(cronJob.discordroleid);
            break;

        case 'cSendValorantStatsInfo':
            taskClass.setDiscordChannelId(cronJob.discordchannelid);
            taskClass.setTeamId(cronJob.team_fk);
            taskClass.setRoleId(cronJob.discordroleid);
            console.log(cronJob.discordroleid)
            break;
    }

    return taskClass;
}

module.exports = {registerCronJobs};