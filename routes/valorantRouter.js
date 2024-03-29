const express = require('express');
const router = express.Router();
const riot = require('../js/serverJS/riot.js')
const {checkNotAuthenticated, permissionCheck} = require("../js/serverJS/sessionChecker");
const {pool} = require("../js/serverJS/database/dbConfig");
const {logMessage, LogLevel} = require('../js/serverJS/logger.js');
const {getAccountInfo, getSummonerInfo, getSummonerIcon} = require("../js/serverJS/riot");

/**
 * GET route for getting the match history
 *
 * It returns a nested array with the mode and heatmap object
 */
router.get('/getMatchHistory', checkNotAuthenticated, permissionCheck('home', 'canOpen'), async function (req, res) {
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
 * GET route to check if a riot id is valid
 */
router.get('/isRiotIdValid', permissionCheck('home', 'canOpen'), async (req, res) => {
    getAccountInfo(req.query.riotId).then((result) => {
        res.status(200).send(result);
    }).catch(() => {
        res.status(500).send({message: "There was an error checking the Riot ID"});
    });
});

async function checkIfRiotIdValid(riotId){
    return getAccountInfo(riotId)
}

async function getMatchHistory(riotName, riotTag, modes) {
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

module.exports = {router, getMatchHistory, checkIfRiotIdValid}


