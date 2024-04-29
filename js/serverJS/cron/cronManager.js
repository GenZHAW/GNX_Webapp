/**
 * This Files is responsible for managing all cron jobs
 */
const cron = require('node-cron');
const {pool} = require("../database/dbConfig");

let availableCronJobs = [{name: 'cSendLoLStatsInfo', id: 1}, {name: 'cSendValorantStatsInfo', id: 3}];
let taskList = [];

/**
 * This function is responsible for registering all cron jobs
 */
async function registerCronJobs() {
    let cronJobs = await getExistingCronjobs()
    cronJobs = cronJobs.rows;

    cronJobs.forEach(cronJob => {
        let cronJobDefinition = availableCronJobs.find(availableCronJob => availableCronJob.id === cronJob.cronjobdefinition_fk);
        if (cronJobDefinition) {
            const TaskClass = require(`./jobs/${cronJobDefinition.name}`);
            let taskInstance = new TaskClass(cronJob);
            taskInstance = setTaskParams(taskInstance, cronJob, cronJobDefinition.name)

            const taskFunction = () => {
                taskInstance.execute();
                updateLastExecTime(cronJob.id);
            };

            const scheduledTask = cron.schedule(cronJob.executioninterval, taskFunction, {
                scheduled: true
            });

            taskList.push({id: cronJob.id, name: cronJobDefinition.name, task: scheduledTask, execute: taskFunction});
        }else{
            console.error(`Cronjob with id ${cronJob.cronjobdefinition_fk} does not exist!`)
        }
    });

    console.log('Successfully registered ' + taskList.length + ' cronjobs!');
}

/**
 * Updates the last execution time of a cron job in the database.
 * @param {number} cronJobId - The ID of the cron job.
 */
async function updateLastExecTime(cronJobId) {
    try {
        const result = await pool.query(
            'UPDATE cronjobs SET lastexectime = NOW() WHERE id = $1 RETURNING lastexectime;',
            [cronJobId]
        );
    } catch (error) {
        console.error('Error updating last execution time:', error);
    }
}

/**
 * Runs a cron job immediately based on its ID.
 * @param {number} jobId - The ID of the job to run.
 */
async function runCronJob(jobId) {
    const job = taskList.find(job => job.id == jobId);
    if (!job) {
        console.error(`Cronjob with ID ${jobId} does not exist in the task list.`);
        return;
    }

    try {
        await job.execute();
        console.log(`Cronjob ${job.name} with ID ${jobId} executed successfully.`);
        updateLastExecTime(jobId);
        return {message: 'Cronjob executed successfully.', code: 0};
    } catch (error) {
        console.error(`Error executing cronjob ${job.name} with ID ${jobId}:`, error);
        return {message: 'There was an error executing the cronjob', code: -1};
    }
}

/**
 * Removes an existing cronjob at runtime
 * @param {number} jobId - The ID of the job to be removed.
 */
function removeCronJob(jobId) {
    // Find the index of the job in the task list
    const jobIndex = taskList.findIndex(job => job.id == jobId);
    if (jobIndex === -1) {
        console.error(`Cronjob with ID ${jobId} does not exist in the task list.`);
        return;
    }

    // Get the cron job to be removed
    const job = taskList[jobIndex];

    // Stop the scheduled task
    job.task.stop();

    // Remove the job from the task list
    taskList.splice(jobIndex, 1);

    console.log(`Cronjob ${job.name} with ID ${jobId} has been removed and unscheduled.`);
}

/**
 * Adds a new cronjob at runtime
 * @param {object} newCronJob - The new cronjob data.
 */
async function addCronJob(newCronJob) {
    let cronJobDefinition = availableCronJobs.find(availableCronJob => availableCronJob.id === newCronJob.cronjobdefinition_fk);
    if (!cronJobDefinition) {
        console.error(`Cronjob with id ${newCronJob.cronjobdefinition_fk} does not exist!`);
        return;
    }

    const TaskClass = require(`./jobs/${cronJobDefinition.name}`);
    let taskInstance = new TaskClass(newCronJob);
    taskInstance = setTaskParams(taskInstance, newCronJob, cronJobDefinition.name);

    const scheduledTask = cron.schedule(newCronJob.executioninterval, () => {
        taskInstance.execute();
    }, {
        scheduled: true
    });

    taskList.push({
        id: taskList.length,  // Dynamically assigns the next available ID
        name: cronJobDefinition.name,
        task: scheduledTask
    });

    console.log(`Registered new cronjob: ${cronJobDefinition.name}`);
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
            break;
    }

    return taskClass;
}

/**
 * Returns all existing cronjobs
 * @returns {Promise<QueryResult<any>>}
 */
function getExistingCronjobs(){
    return pool.query('SELECT *, (SELECT displayname FROM cronjobdefinition WHERE cronjobdefinition.id = cronjobs.cronjobdefinition_fk) FROM cronjobs');
}

module.exports = {registerCronJobs, addCronJob, getExistingCronjobs, removeCronJob, runCronJob};