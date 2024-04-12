const express = require('express');
const router = express.Router();
const riot = require('../js/serverJS/riot.js')
const {checkNotAuthenticated, permissionCheck} = require("../js/serverJS/sessionChecker");
const {pool} = require("../js/serverJS/database/dbConfig");
const {logMessage, LogLevel} = require('../js/serverJS/logger.js');
const {getAccountInfo, getSummonerInfo, getSummonerIcon} = require("../js/serverJS/riot");

/**
 * GET route for getting the condensed match history
 *
 * It returns a nested array with the mode and heatmap object
 */
router.get('/getCondensedMatchHistory', checkNotAuthenticated, permissionCheck('valorantstatspage', 'canOpen'), async function (req, res) {
    const riotName = req.query.name;
    const riotTag = req.query.tag;
    const modes = req.query.modes;

    try {
        const modeAndJsonArray = await getCondensedMatchHistory(riotName, riotTag, modes);
        res.status(200).send(modeAndJsonArray);
    } catch (error) {
        console.error('An error occurred:', error);
        res.status(500).send({ error: 'An error occurred while fetching match history' });
    }
});
/**
 * GET route for getting the match history
 *
 * It returns a nested array with the mode and heatmap object
 */
router.get('/getMatchHistory', checkNotAuthenticated, permissionCheck('valorantstatspage', 'canOpen'), async function (req, res) {
    const riotName = req.query.name;
    const riotTag = req.query.tag;
    const modes = req.query.modes;

    try {
        const modeAndJsonArray = await getMatchHistory(riotName, riotTag, modes);
        res.status(200).send(modeAndJsonArray);
    } catch (error) {
        console.error('An error occurred:', error);
        res.status(500).send({ error: 'An error occurred while fetching match history' });
    }
});

/**
 * GET route for getting the valorantstats page definition of a user
 */
router.get('/getValorantstatsDefinition',  checkNotAuthenticated, permissionCheck('valorantstatspage', 'canOpen'), function (req, res) {
    getValorantStatsConfig(req.user).then((result) => {
        res.status(200).send(result.rows[0]);
    }).catch((err) => {
        console.log(err);
        res.status(500).send({message: "There was an error getting the valorantstats config."});
    });
});

/**
 * GET route to check if a riot id is valid
 */
router.get('/isRiotIdValid', permissionCheck('valorantstatspage', 'canOpen'), async (req, res) => {
    getAccountInfo(req.query.riotId).then((result) => {
        res.status(200).send(result);
    }).catch(() => {
        res.status(500).send({message: "There was an error checking the Riot ID"});
    });
});

async function checkIfRiotIdValid(riotId){
    return getAccountInfo(riotId)
}
async function getMatchHistory(riotName, riotTag, days, modes) {
    const modeAndJsonArray = [];
    const latestDate = new Date();
    const oldestDate = new Date(latestDate);
    oldestDate.setDate(oldestDate.getDate() - days);

    for (const mode of modes) {
        let paginationCount = 0;
        let jsonArray = [];

        try {
            let currentDateInJson = latestDate;

            do {
                let url = `https://api.tracker.gg/api/v2/valorant/standard/matches/riot/${riotName}%23${riotTag}?type=competitive&season=&agent=all&map=all&next=${paginationCount}`;
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status} for ${riotName}`);
                }

                const text = await response.text();

                // Check if the response is not empty
                if (text.trim() === '') {
                    throw new Error('Empty response received from the API');
                }


                const jsonData = JSON.parse(text);

                if (!jsonData.data || !jsonData.data.matches || jsonData.data.matches.length === 0) {
                    // No more matches available
                    break;
                }

                jsonArray.push(jsonData.data.matches);

                // Fetch matches until oldestDate is reached or beyond the specified days limit
                if (jsonData.data.matches.length > 0) {
                    const lastMatch = jsonData.data.matches[jsonData.data.matches.length - 1];
                    currentDateInJson = new Date(lastMatch.metadata.timestamp);
                }

                // Calculate the next set of matches to fetch
                paginationCount += 1;
            } while (currentDateInJson > oldestDate);

            modeAndJsonArray.push([mode, jsonArray.flat()]);
        } catch (error) {
            console.error(`Error occurred while fetching match history for mode '${mode}':`, error);
            // Push null for this mode if an error occurs
            modeAndJsonArray.push([mode, null]);
        }
    }
    return modeAndJsonArray;
}

async function getCondensedMatchHistory(riotName, riotTag, modes) {
    const modeAndJsonArray = [];

    for (const mode of modes) {
        const url = `https://api.tracker.gg/api/v1/valorant/matches/riot/${riotName}%23${riotTag}/aggregated?localOffset=-60&playlist=${mode}&seasonId=`;
        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const text = await response.text();

            // Check if the response is not empty
            if (text.trim() === '') {
                throw new Error('Empty response received from the API');
            }

            const jsonData = JSON.parse(text);
            modeAndJsonArray.push([mode, jsonData]);
        } catch (error) {
            console.error(`Error occurred while fetching match history for mode '${mode}':`, error);
            // If an error occurs, push an array with mode and null to indicate failure
            modeAndJsonArray.push([mode, null]);
        }
    }

    return modeAndJsonArray;
}
/**
 * Returns the lolstats config of a user
 * If there is no config, it will insert a new one
 * @param user
 */
function getValorantStatsConfig(user) {
    return pool.query(`SELECT * FROM valorantstatsdefinition WHERE account_fk=$1`,[user.id])
        .then(result => {
            if (result.rows.length === 0) {
                let pagesetup = '[{"order": 1, "riotid": "[MYSELF]"}]';
                return pool.query(`INSERT INTO valorantstatsdefinition (account_fk, pagesetup) VALUES ($1, $2) RETURNING *`, [user.id, pagesetup]);
            }
            return result;
        });
}


module.exports = {router, getCondensedMatchHistory, checkIfRiotIdValid}


