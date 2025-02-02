/**
 * Router for manipulating cronjobs
 */
const express = require('express');
const router = express.Router();
const {pool} = require('../js/serverJS/database/dbConfig.js');
const {checkNotAuthenticated, permissionCheck} = require("../js/serverJS/sessionChecker");
const {logMessage, LogLevel} = require('../js/serverJS/logger.js');
const {getExistingCronjobs, addCronJob, removeCronJob, runCronJob, rescheduleCronJob} = require("../js/serverJS/cron/cronManager");
let fieldTypes = {};

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
 * POST route for updating an existing cronjob.
 */
router.post('/updateCronjob/:id', checkNotAuthenticated, permissionCheck('adminpanel', 'canOpen'), async function (req, res) {
    const jobId = req.params.id;
    const config = req.body.config;

    // Call the function to update the cronjob in the database
    updateCronjob(jobId, config).then(result => {
        let status = rescheduleCronJob(jobId, result.rows[0]);
        if (status.code !== 0) {
            logMessage('Cronjob updated successfully', LogLevel.INFO, req.user);
            res.status(200).send({ message: `Cronjob with id ${jobId} updated successfully. WARNING: Failed to reschedule the cronjob. Please check the configuration and try again.`});
        }else{
            logMessage('Cronjob updated successfully', LogLevel.INFO, req.user);
            res.status(200).send({ message: `Cronjob with id ${jobId} updated and rescheduled successfully`});
        }
    }).catch(error => {
        console.error('Error updating cronjob:', error);
        res.status(500).send({ message: 'Failed to update cronjob. Please try again later.' });
    });
});

/**
 * Function to update a cronjob in the database
 * @param jobId - the ID of the cronjob to update
 * @param config - the configuration data for the cronjob
 * @returns {Promise<any>} - the promise resolving to the update operation result
 */
async function updateCronjob(jobId, config) {
    if (Object.keys(fieldTypes).length === 0) {
        await fetchFieldTypes(); // Load field types if not already loaded
    }

    const updates = [];
    const values = [];
    let valueIndex = 1;

    for (const [key, value] of Object.entries(config)) {
        if (value !== undefined && value !== null) {
            let actualValue = value;
            if (value == "" && isIntegerField(key)) {
                actualValue = 0;  // Convert empty string to zero for integer fields
            }
            updates.push(`${key} = $${valueIndex}`);
            values.push(actualValue);
            valueIndex++;
        }
    }

    if (updates.length === 0) {
        throw new Error("No valid data provided for updating.");
    }

    values.push(jobId);
    const query = `UPDATE cronjobs SET ${updates.join(', ')} WHERE id = $${valueIndex} RETURNING *`;
    return pool.query(query, values);
}

/**
 * Fetches the field types for the cronjobs table
 * @returns {Promise<void>}
 */
async function fetchFieldTypes() {
    const query = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'cronjobs';
    `;
    const result = await pool.query(query);
    fieldTypes = result.rows.reduce((acc, row) => {
        acc[row.column_name] = row.data_type;
        return acc;
    }, {});
}

/**
 * Checks if the given field name is an integer field
 * @param fieldName
 * @returns {boolean}
 */
function isIntegerField(fieldName) {
    return ['integer', 'bigint', 'smallint'].includes(fieldTypes[fieldName]);
}

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
    return pool.query('SELECT * FROM cronjobdefinition ORDER BY id');
}

module.exports = {router};