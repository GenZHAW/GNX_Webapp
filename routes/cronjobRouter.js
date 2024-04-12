/**
 * Router for manipulating cronjobs
 */
const express = require('express');
const router = express.Router();
const {pool} = require('../js/serverJS/database/dbConfig.js');
const {checkNotAuthenticated, permissionCheck} = require("../js/serverJS/sessionChecker");
const {logMessage, LogLevel} = require('../js/serverJS/logger.js');

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

/**
 * Returns all existing cronjobs
 * @returns {Promise<QueryResult<any>>}
 */
function getExistingCronjobs(){
    return pool.query('SELECT *, (SELECT displayname FROM cronjobdefinition WHERE cronjobdefinition.id = cronjobs.cronjobdefinition_fk) FROM cronjobs');
}

module.exports = {router, getExistingCronjobs};