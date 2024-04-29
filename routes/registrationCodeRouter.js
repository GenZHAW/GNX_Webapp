/**
 * Router for manipulating team types
 */
const express = require('express');
const router = express.Router();
const {pool} = require('../js/serverJS/database/dbConfig.js');
const util = require("util");
const {checkNotAuthenticated, permissionCheck} = require("../js/serverJS/sessionChecker");
const {logMessage, LogLevel} = require('../js/serverJS/logger.js');

/**
 * POST route for generating a new registration code for a specific team
 */
router.post('/generateNewRegistrationCode/:teamId', checkNotAuthenticated, permissionCheck('usermanagement', 'canOpen'), function (req, res) {
    const teamId = req.params.teamId;
    generateNewRegistrationCode(teamId).then(()=>{
        logMessage(`New Registration Code generated for Team ${teamId}`, LogLevel.INFO, req.user.id)
        res.status(200).send({message: "New Registration Code generated successfully"});
    });
});

/**
 * GET route for getting all registration codes
 */
router.get('/getregistrationcodes', checkNotAuthenticated, permissionCheck('usermanagement', 'canOpen'), async (req, res) => {
    const registrationCodes = await getRegistrationCodes();
    res.send(registrationCodes);
});

/**
 * POST route for updating the state of a registration code

 */
router.post('/updateRegistrationCode/:code/:used', checkNotAuthenticated, permissionCheck('usermanagement', 'canOpen'), function (req, res) {
    const regCode = req.params.code;
    const used = req.params.used;
    updateRegistrationCode(regCode, used);
    logMessage(`Registration Code ${regCode} updated`, LogLevel.INFO, req.user.id)
    res.status(200).send("Registration Code updated successfully");
});

/**
 * Generates a new registration code for a specific team in the database
 * @param teamId
 * @returns {Promise<unknown>}
 */
function generateNewRegistrationCode(teamId) {
    //Generate Random Number as Code
    const min = 1000000;
    const max = 100000000;
    const randomNum = Math.floor(Math.random() * (max - min) + min);

    //Generate valid until date
    const now = new Date();
    const epochTomorrow = Math.floor(now.getTime() / 1000) + 24 * 60 * 60;


    return new Promise((resolve, reject) => {
        pool.query('INSERT INTO registrationcode (code, used, validuntil, team_fk) VALUES ($1, $2, $3, $4)', [randomNum, 0, epochTomorrow, teamId], (err, result) => {
            if (err) {
                reject(err);
                console.log(err);
            }
            resolve();
        });
    });
}

/**
 * Gets all registration codes from the database
 * @returns {Promise<*>}
 */
async function getRegistrationCodes() {
    //Get Epoch Timestamp from last week
    const now = new Date();
    const epochLastWeek = Math.floor(now.getTime() / 1000) - 7 * 24 * 60 * 60;

    const query = util.promisify(pool.query).bind(pool);
    const results = await query(`SELECT *, team.displayname FROM registrationcode LEFT JOIN team ON registrationcode.team_fk = team.id WHERE validuntil>$1 ORDER BY used, validuntil DESC`,[epochLastWeek]);

    return results.rows.map(result => {
        const {code, validuntil, used, displayname} = result;
        const now = new Date();

        const valid = (new Date(validuntil * 1000) > now) && !used;

        return {
            code,
            used: used ? 'Yes' : 'No',
            validuntil: new Date(validuntil * 1000).toLocaleString('de-CH', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            teamname: displayname,
            valid: valid
        };
    });
}

/**
 * Updates the status of registration code in the database
 * @param code
 * @param used
 */
function updateRegistrationCode(code, used) {
    //Get Epoch Timestamp from tomorrow
    const now = new Date();
    const epochTomorrow = Math.floor(now.getTime() / 1000) + 24 * 60 * 60;

    pool.query('UPDATE registrationcode SET used = $1, validuntil = $3 WHERE code = $2', [used, code, epochTomorrow], (err, result) => {
        if (err) {
            console.log(err);
        }
    });
}
module.exports = router;