/**
 * Router for manipulating team types
 */
const express = require('express');
const router = express.Router();
const {pool} = require('../js/serverJS/database/dbConfig.js');
const util = require("util");
const {checkNotAuthenticated} = require("../js/serverJS/sessionChecker");

/**
 * GET route for getting all team types
 */
router.get('/getteamtypes', checkNotAuthenticated, function (req, res) {
    getTeamTypes().then((result) => {
        res.status(200).send(result.rows);
    }).catch(() => {
        res.status(500).send({message: "There was an error getting the team type list! Please try again later."});
    });
});

/**
 * POST route for inserting a new team type
 */
router.post('/insertteamtype', checkNotAuthenticated, function (req, res) {
    const formData = req.body;

    insertTeamType(formData).then((result) => {
        if (result.rowCount === 0) {
            res.status(500).send({message: "There was an error inserting the team type! Please try again later."});
        }else {
            res.status(200).send({message: "Team type inserted successfully"});
        }
    }).catch(() => {
        res.status(500).send({message: "There was an error inserting the team type! Please try again later."});
    });
});

/**
 * POST route for updating a team type
 */
router.post('/updateteamtype', checkNotAuthenticated, function (req, res) {
    const formData = req.body;

    updateTeamType(formData).then((result) => {
        if (result.rowCount === 0) {
            res.status(500).send({message: "There was an error updating the team type! Please try again later."});
        }else {
            res.status(200).send({message: "Team type updated successfully"});
        }
    }).catch(() => {
        res.status(500).send({message: "There was an error updating the team type! Please try again later."});
    });
});

router.get('/getteamtypeOptions', checkNotAuthenticated, async (req, res) => {
    const teamtypeOptions = await getTeamTypeOptions();
    res.send(teamtypeOptions);
});

/**
 * Get all team types
 * @returns {Promise<*>} a Promise that resolves to an array of team types
 */
function getTeamTypes() {
    return pool.query(`SELECT * FROM teamtype ORDER BY displayname`);
}

/**
 * Insert a new team type
 * @param data the data of the team type
 * @returns {Promise<number>} a Promise that resolves to the id of the new team type
 */
function insertTeamType(data) {
    return pool.query(`INSERT INTO teamtype (name, displayname) VALUES ($1,$2) RETURNING id`,[data.internalName, data.displayName]);
}

/**
 * Update a team type
 * @param data the data of the team type
 * @returns {Promise<number>} a Promise that resolves to the id of the new team type
 */
function updateTeamType(data) {
    return pool.query(`UPDATE teamtype SET displayname = $1, name = $3 WHERE id = $2`,[data.displayName, data.id, data.internalName]);
}

async function getTeamTypeOptions() {
    const query = util.promisify(pool.query).bind(pool);
    const results = await query(`SELECT *
                                 FROM teamtype`);

    const options = results.rows.map((result) => {
        return {
            value: result.name,
            label: result.displayname
        };
    });

    return options;
}

module.exports = router;