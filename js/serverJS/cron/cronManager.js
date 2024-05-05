/**
 * This Files is responsible for managing all cron jobs
 */
const cron = require('node-cron');
const {pool} = require("../database/dbConfig");
const {logMessage} = require("../logger");

let availableCronJobs = [{name: 'cSendLoLStatsInfo', id: 1}, {name: 'cSendValorantStatsInfo', id: 3},
                                                    {name: 'cSendTrainingDataReminder', id: 4}, {name: 'cSendGamedayReportReminder', id: 5}];
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

            try{
                const scheduledTask = cron.schedule(cronJob.executioninterval, taskFunction, {
                    scheduled: true
                });
                taskList.push({id: cronJob.id, name: cronJobDefinition.name, task: scheduledTask, execute: taskFunction});
            }catch (e){
                console.error(`Error while scheduling cronjob with id ${cronJob.id}: ${e}`);
                logMessage(`Error while scheduling cronjob with id ${cronJob.id}: ${e}`, 'ERROR')
            }
        }else{
            console.error(`Cronjob with id ${cronJob.cronjobdefinition_fk} does not exist!`)
        }
    });

    console.log('Successfully registered ' + taskList.length + ' cronjobs!');
}

/**
 * Reschedules an existing cron job at runtime based on its ID.
 * @param {number} jobId - The ID of the job to reschedule.
 * @param {object} cronJob - The cron job object with updated properties.
 */
function rescheduleCronJob(jobId, cronJob) {
    const jobIndex = taskList.findIndex(job => job.id == jobId);
    if (jobIndex === -1) {
        console.error(`Cronjob with ID ${jobId} does not exist in the task list.`);
        return { message: 'Cronjob not found.', code: -1 };
    }

    // Stop the current cron job before making updates
    const job = taskList[jobIndex];
    job.task.stop();

    // Rebuild the task with potentially updated parameters
    const cronJobDefinition = availableCronJobs.find(availableCronJob => availableCronJob.id === cronJob.cronjobdefinition_fk);
    if (!cronJobDefinition) {
        console.error(`Cronjob definition with ID ${cronJob.cronjobdefinition_fk} does not exist.`);
        return { message: 'Cronjob definition not found.', code: -1 };
    }

    const TaskClass = require(`./jobs/${cronJobDefinition.name}`);
    let taskInstance = new TaskClass(cronJob);
    taskInstance = setTaskParams(taskInstance, cronJob, cronJobDefinition.name);

    const taskFunction = () => {
        taskInstance.execute();
        updateLastExecTime(jobId);
    };

    // Schedule the updated task
    job.task = cron.schedule(cronJob.executioninterval, taskFunction, {
        scheduled: true
    });

    // Update the task list entry
    taskList[jobIndex] = {
        ...job,
        task: job.task,
        execute: taskFunction,
        name: cronJobDefinition.name
    };

    console.log(`Cronjob ${cronJobDefinition.name} with ID ${jobId} has been rescheduled to new interval: ${cronJob.executioninterval}.`);
    return { message: 'Cronjob rescheduled successfully.', code: 0 };
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
    const taskFunction = () => {
        taskInstance.execute();
        updateLastExecTime(newCronJob.id);
    };

    const scheduledTask = cron.schedule(newCronJob.executioninterval, () => {
        taskFunction()
    }, {
        scheduled: true
    });

    taskList.push({
        id: newCronJob.id,
        name: cronJobDefinition.name,
        task: scheduledTask,
        execute: taskFunction
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
            taskClass.setTimeFrame(dcronJob.timeframe);
            taskClass.setMinSoloQGames(cronJob.minsoloqgames);
            taskClass.setMinFlexQGames(cronJob.minflexqgames);
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
    return pool.query('SELECT *, (SELECT displayname FROM cronjobdefinition WHERE cronjobdefinition.id = cronjobs.cronjobdefinition_fk) FROM cronjobs ORDER BY id');
}

module.exports = {registerCronJobs, addCronJob, getExistingCronjobs, removeCronJob, runCronJob, rescheduleCronJob};