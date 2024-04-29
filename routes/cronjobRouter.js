/**
 * Router for manipulating cronjobs
 */
const express = require('express');
const router = express.Router();
const {pool} = require('../js/serverJS/database/dbConfig.js');
const {checkNotAuthenticated, permissionCheck} = require("../js/serverJS/sessionChecker");
const {logMessage, LogLevel} = require('../js/serverJS/logger.js');
const {getExistingCronjobs, addCronJob, removeCronJob, runCronJob} = require("../js/serverJS/cron/cronManager");

/**
 * GET route for getting the count of the running cronjobs
 */
router.get('/getCount', checkNotAuthenticated, permissionCheck('adminpanel', 'canOpen'), function (req, res) {
    getCount().then(function (result) {
        res.status(200).send(result.rows[0]);
    }).catch(function (error) {
        console.error(error);
        res.status(500).send({message: "There was an error getting the count of the cronjobs! Please try again later."});
    });
});

/**
 * GET route for getting all the cronjob definitions
 */
router.get('/getDefinitions', checkNotAuthenticated, permissionCheck('adminpanel', 'canOpen'), function (req, res) {
    getDefinitions().then(function (result) {
        res.status(200).send(result.rows);
    }).catch(function (error) {
        console.error(error);
        res.status(500).send({message: "There was an error getting the cronjob definitions! Please try again later."});
    });
});

/**
 * GET route for getting all existing cronjobs
 */
router.get('/getCronjobs', checkNotAuthenticated, permissionCheck('adminpanel', 'canOpen'), function (req, res) {
    getExistingCronjobs().then(function (result) {
        res.status(200).send(result.rows);
    }).catch(function (error) {
        console.error(error);
        res.status(500).send({message: "There was an error getting the cronjobs! Please try again later."});
    });
});

/**
 * GET route for running a cronjob immediately
 */
router.get('/runCronjob/:id', checkNotAuthenticated, permissionCheck('adminpanel', 'canOpen'), function (req, res) {
    runCronJob(req.params.id).then(function (result) {
        if (result.code === 0) {
            res.status(200).send({message: result.message});
        }else{
            res.status(500).send({message: result.message});
        }

    }).catch(function (error) {
        console.error(error);
        res.status(500).send({message: "There was an error running the cronjob! Please try again later."});
    });
});

/**
 * POST route for adding a new Cronjob
 */
router.post('/saveNewCronjob', checkNotAuthenticated, permissionCheck('adminpanel', 'canOpen'), function (req, res) {
    insertCronjob(req.body.jobId, req.body.config).then(function (result) {
        addCronJob(result)
        logMessage('New cronjob added to the database', LogLevel.INFO, req.user);
        res.status(200).send({message: 'Cronjob added successfully'});
    }).catch(function (error) {
        console.error(error);
        res.status(500).send({message: "There was an error adding the cronjob! Please try again later."});
    });
});

/**
 * DELETE route for removing a cronjob
 */
router.delete('/deleteJob/:id', checkNotAuthenticated, permissionCheck('adminpanel', 'canOpen'), function (req, res) {
    deleteCronJob(req.params.id).then(function (result) {
        removeCronJob(req.params.id)
        logMessage('Cronjob deleted from the database with the id ' + req.query.jobId, LogLevel.INFO, req.user)
        res.status(200).send({message: 'Cronjob deleted successfully'});
    }).catch(function (error) {
        console.error(error);
        res.status(500).send({message: "There was an error deleting the cronjob! Please try again later."});
    });
});

/**
 * Deletes a cronjob from the database
 * @param jobId
 * @returns {Promise<QueryResult<any>>}
 */
function deleteCronJob(jobId){
    return pool.query('DELETE FROM cronjobs WHERE id = $1', [jobId]);
}

/**
 * Adds a new cronjob to the database
 * @param jobId
 * @param config
 */
async function insertCronjob(jobId, config) {
    const columns = [];
    const placeholders = [];
    const values = [];

    // Add jobId to the list as a static part of the insertion
    columns.push('cronjobdefinition_fk');
    placeholders.push('$1');
    values.push(jobId);

    // Process the config object
    let placeholderIndex = values.length + 1;
    for (const [key, value] of Object.entries(config)) {

        if (value !== "" && value !== null && value !== 0) {
            columns.push(key);
            placeholders.push(`$${placeholderIndex++}`);
            values.push(value);
        }
    }

    if (columns.length === 0) {
        throw new Error("No valid data provided for insertion.");
    }

    const query = `
        INSERT INTO cronjobs (${columns.join(', ')})
        VALUES (${placeholders.join(', ')}) RETURNING  *;`;

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error('Error executing query: ' + err.message);
    }
}

/**
 * Returns the count of the cronjobs
 * @returns {Promise<QueryResult<any>>}
 */
function getCount(){
    return pool.query('SELECT COUNT(*) FROM cronjobs');
}

/**
 * Returns all the cronjob definitions
 * @returns {Promise<QueryResult<any>>}
 */
function getDefinitions(){
    return pool.query('SELECT * FROM cronjobdefinition');
}

module.exports = {router};