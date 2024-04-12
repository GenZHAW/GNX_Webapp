/**
 * Router for manipulating teams
 */
const express = require('express');
const router = express.Router();
const {pool} = require('../js/serverJS/database/dbConfig.js');
const {checkNotAuthenticated, permissionCheck} = require("../js/serverJS/sessionChecker");
const {logMessage, LogLevel} = require('../js/serverJS/logger.js');

/**
 * GET route for getting all teams
 */
router.get('/getteams',  checkNotAuthenticated, permissionCheck([{location: 'teammanagement', permission: 'canOpen'},{location: 'adminpanel', permission: 'canOpen'}]), function (req, res) {
    getTeams().then((result) => {
        res.status(200).send(result.rows);
    }).catch(() => {
        res.status(500).send({message: "There was an error getting the team list! Please try again later."});
    });
});

/**
 * GET route for getting all teams that can be assigned to a specific role
 */
router.get('/getteamstoassignrole', permissionCheck('rolemanagement', 'canOpen'), checkNotAuthenticated, function (req, res) {
    getTeamsToAssignRoleTo(req.query.roleId).then((result) => {
        res.status(200).send(result.rows);
    }).catch(() => {
        res.status(500).send({message: "There was an error getting the team list! Please try again later."});
    });
});

/**
 * GET route for getting the id of the teammanager
 */
router.get('/getTeamManager', permissionCheck('calendar', 'canOpen'), checkNotAuthenticated, function (req, res) {
    getTeamManager(req.query.teamId).then((result) => {
        res.status(200).send(result.rows);
    }).catch(() => {
        res.status(500).send({message: "There was an error getting the team manager! Please try again later."});
    });
});

/**
 * POST route for inserting a new team
 */
router.post('/insertteam', checkNotAuthenticated, permissionCheck('teammanagement', 'canOpen'), function (req, res) {
    const formData = req.body;

    insertTeam(formData).then((result) => {
        if (result.rowCount === 0) {
            res.status(500).send({message: "There was an error inserting the team! Please try again later."});
        }else {
            logMessage(`User ${req.user.username} inserted the team ${formData.name}`,LogLevel.INFO,req.user.id)
            res.status(200).send({message: "Team inserted successfully"});
        }
    }).catch(() => {
        res.status(500).send({message: "There was an error inserting the team! Please try again later."});
    });
});

/**
 * POST route for deleting a team
 */
router.post('/deleteteam', checkNotAuthenticated, permissionCheck('teammanagement', 'canOpen'), function (req, res) {
    const formData = req.body.id;

    deleteTeam(formData).then((result) => {
        if (result.rowCount === 0) {
            res.status(500).send({message: "There was an error deleting the team! Please try again later."});
        }else {
            logMessage(`User ${req.user.username} deleted the team ${formData.name}`,LogLevel.INFO,req.user.id)
            res.status(200).send({message: "Team deleted successfully"});
        }
    }).catch(() => {
        res.status(500).send({message: "There was an error deleting the team! Please try again later."});
    });
});

/**
 * POST route for updating a team
 */
router.post('/updateteam', checkNotAuthenticated, permissionCheck('teammanagement', 'canOpen'), function (req, res) {
    const formData = req.body;

    updateTeam(formData).then((result) => {
        if (result.rowCount === 0) {
            res.status(500).send({message: "There was an error updating the team! Please try again later."});
        }else {
            logMessage(`User ${req.user.username} updated the team ${formData.name}`,LogLevel.INFO,req.user.id)
            res.status(200).send({message: "Team updated successfully"});
        }
    }).catch(() => {
        res.status(500).send({message: "There was an error updating the team! Please try again later."});
    });
});

/**
 * Get all teams
 * @returns {Promise<*>} a Promise that resolves to an array of teams
 */
function getTeams() {
    return pool.query(`SELECT * FROM team ORDER BY displayname`);
}

/**
 * Insert a new team
 * @param data the data of the team
 * @returns {Promise<number>} a Promise that resolves to the id of the new team
 */
function insertTeam(data) {
    return pool.query(`INSERT INTO team (displayname, teamtype_fk, weight) VALUES ($1,$2,$3) RETURNING id`,[data.teamName, data.teamType, data.teamWeight]);
}

/**
 * Delete a team
 * @param id the id of the team to delete
 * @returns {Promise<number>} a Promise that resolves to the id of the new team
 */
function deleteTeam(id) {
    return pool.query(`DELETE FROM team WHERE id = $1`,[id]);
}

/**
 * Update a team
 * @param data the data of the team
 * @returns {number} the id of the updated team
 */
function updateTeam(data) {
    return pool.query(`UPDATE team SET displayname = $1, teamtype_fk = $2, weight = $3, account_fk = $4, discordnotificationdays = $5 WHERE id = $6`,[data.teamName, data.teamType, data.teamWeight, data.teamManager, data.discordnotificationdays, data.id]);
}

/**
 * Get all teams that are not assigned to that specific role
 * @param roleId
 * @returns {Promise<QueryResult<any>>}
 */
function getTeamsToAssignRoleTo(roleId) {
    return pool.query(`SELECT * FROM team WHERE id NOT IN (SELECT team_fk FROM role WHERE roletype_fk = $1) ORDER BY displayname`,[roleId]);
}

/**
 * Get the id of the teammanager
 * @param id
 * @returns {Promise<QueryResult<any>>}
 */
function getTeamManager(id){
    return pool.query(`SELECT account_fk FROM team WHERE id = $1`,[id]);
}

module.exports = router;