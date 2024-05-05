const express = require('express');
const router = express.Router();
const riot = require('../js/serverJS/riot.js')
const {checkNotAuthenticated, permissionCheck} = require("../js/serverJS/sessionChecker");
const {pool} = require("../js/serverJS/database/dbConfig");
const {logMessage, LogLevel} = require('../js/serverJS/logger.js');
const {getAccountInfo, getSummonerInfo, getSummonerIcon} = require("../js/serverJS/riot");
const puppeteer = require('puppeteer');

/**
 * GET DDragon Data from project
 */
router.get('/getDDragonData', permissionCheck('championpool', 'canOpen'), async (req, res) => {
    const championData = await riot.getDDragonDataFromProject();
    res.send(championData);
});

/**
 * GET lol player icon
 */
router.get('/getPlayerIcon', permissionCheck('lolstatspage', 'canOpen'), async (req, res) => {
    getAccountInfo(req.query.riotId).then((accountInfo) => {
        getSummonerInfo(accountInfo.data.puuid).then((summonerInfo) => {
           res.status(200).send({icon: `https://ddragon.leagueoflegends.com/cdn/14.6.1/img/profileicon/${summonerInfo.summonerInfo.profileIconId}.png`});
        });
    }).catch((error) => {
        console.log(error);
        res.status(500).send({message: "There was an error fetching the player icon"});
    });
});

/**
 * GET Request to get the summoner name, playerid, puuid etc
 */
router.get('/getSummonerInfo', permissionCheck('lolstatspage', 'canOpen'), async (req, res) => {
    getAccountInfo(req.query.riotId).then((accountInfo) => {
        getSummonerInfo(accountInfo.data.puuid).then((summonerInfo) => {
            res.status(200).send({summonerInfo: summonerInfo});
        });
    }).catch((error) => {
        console.log(error);
        res.status(500).send({message: "There was an error fetching the player name"});
    });
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

/**
 * GET route for getting the match history
 */
router.get('/getMatchHistory', checkNotAuthenticated, permissionCheck('lolstatspage', 'canOpen'), async function (req, res) {
    const riotName = req.query.name
    const riotTag = req.query.tag
    const days = req.query.days
    const mode = req.query.mode

    const result = await getMatchHistory(riotName, riotTag, days, mode);

    res.status(200).send(result);
});

/**
 * GET route for getting the championpool data
 */
router.get('/getChampionpool/:teamId',  checkNotAuthenticated, permissionCheck('championpool', 'canOpen'), function (req, res) {
    getChampionpool(req.params.teamId).then((result) => {
        res.status(200).send(result.rows);
    }).catch(() => {
        res.status(500).send({message: "There was an error getting the championpool data."});
    });
});

/**
 * GET route for getting the lolstats page definition of a user
 */
router.get('/getLolstatsDefinition',  checkNotAuthenticated, permissionCheck('lolstatspage', 'canOpen'), function (req, res) {
    getLolStatsConfig(req.user).then((result) => {
        res.status(200).send(result.rows[0]);
    }).catch((err) => {
        console.log(err);
        res.status(500).send({message: "There was an error getting the lolstats config."});
    });
});

/**
 * POST route for adding a new user to the lolstats definition
 */
router.post('/addPlayerToLolstatsDefinition',  checkNotAuthenticated, permissionCheck('lolstatspage', 'canOpen'), function (req, res) {
    const riotId = req.body.riotId;
    const order = req.body.order;

    appendUserToLolstatsDefinition(req.user.id, riotId, order).then((result) => {
        logMessage(`User ${req.user.username} added an Account to his Lolstats Page definition`,LogLevel.INFO,req.user.id);
        res.status(200).send({message: "User added successfully"});
    }).catch((err) => {
        console.log(err);
        res.status(500).send({message: "There was an error updating the lolstats config."});
    });
});

/**
 * POST route for removing a user from the lolstats defintion
 */
router.post('/removePlayerFromLolstatsDefinition',  checkNotAuthenticated, permissionCheck('lolstatspage', 'canOpen'), function (req, res) {
    const riotId = req.body.riotId;
    const order = req.body.order;

    removeUserFromLolstatsDefinition(req.user.id, riotId, order).then((result) => {
        logMessage(`User ${req.user.username} removed an Account to his Lolstats Page definition`,LogLevel.INFO,req.user.id);
        res.status(200).send({message: "User removed successfully"});
    }).catch((err) => {
        console.log(err);
        res.status(500).send({message: "There was an error updating the lolstats config."});
    });
});

/**
 * POST route for changing the champion order
 */
router.post('/changeChampionOrder/:id/:direction', checkNotAuthenticated, permissionCheck('championpool', 'canOpen'), function (req, res) {
    const championpoolId = req.params.id;
    const direction = req.params.direction;

    changeChampionOrder(championpoolId, req.user.team.id,direction).then((result) => {
        res.status(200).send({message: "Order updated successfully"});
        logMessage(`User ${req.user.username} changed the order of the championpool`,LogLevel.INFO,req.user.id);
    }).catch(() => {
        res.status(500).send({message: "There was an error updating the order! Please try again later."});
    });
});

/**
 * POST route for deleting a champion from the championpool
 */
router.post('/deleteChampion/:id', checkNotAuthenticated, permissionCheck('championpool', 'canOpen'), function (req, res) {
    const championpoolId = req.params.id;

    deleteChampion(championpoolId).then((result) => {
        res.status(200).send({message: "Champion deleted successfully"});
        logMessage(`User ${req.user.username} deleted a champion from the championpool`,LogLevel.INFO,req.user.id);
    }).catch(() => {
        res.status(500).send({message: "There was an error deleting the champion! Please try again later."});
    })
});

/**
 * POST route adding a champion to the championpool
 */
router.post('/addChampion', checkNotAuthenticated, permissionCheck('championpool', 'canOpen'), function (req, res) {
    const champion = req.body.champion;
    const lane = req.body.lane;
    const type = req.body.type;

    addChampion(champion, lane, req.user.id, req.user.team.id, type).then((result) => {
        res.status(200).send({message: "Champion added successfully"});
        logMessage(`User ${req.user.username} added the champion ${champion} to the championpool`,LogLevel.INFO,req.user.id);
    }).catch(() => {
        res.status(500).send({message: "There was an error adding the champion! Please try again later."});
    })
});

async function getGamesPlayed(riotName, riotTag, modes) {
    const modeAndJsonArray = [];

    for (const mode of modes) {
        const url = `https://api.tracker.gg/api/v1/lol/matches/riot/${riotName}%23${riotTag}/aggregated?region=EUW&localOffset=-120&season=2024-01-10T01%3A00%3A00%2B00%3A00&playlist=${mode}`
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
 * Fetches the match history of a user from the tracker.gg API for a specific mode and a specific amount of days.
 * @param riotName - The riot name of the user
 * @param riotTag - The riot tag of the user
 * @param days - The amount of days to fetch the match history for
 * @param mode - The mode to fetch the match history for
 * @returns {Promise<void>}
 */
async function getMatchHistory(riotName, riotTag, days, mode) {
    const latestDate = new Date();
    const oldestDate = new Date(latestDate);
    oldestDate.setDate(oldestDate.getDate() - days);
    let nextMatches = 0;
    let currentDateInJson = latestDate;
    let dataJson = [];
    let loadedAllMatches = false;

    // Fetch matches until oldestDate is reached or beyond the specified days limit
    while(!loadedAllMatches){
        try{
            let url = `https://api.tracker.gg/api/v2/lol/standard/matches/riot/${riotName}%23${riotTag}?region=EUW&type=&season=2024-01-10T01%3A00%3A00%2B00%3A00&playlist=${mode}&next=${nextMatches}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status} for ${riotName}`);
            }

            const text = await response.text();

            if (text.trim() === '') {
                throw new Error('Empty response received from the API');
            }

            let data = JSON.parse(text);

            //Get the data object we need
            data = data.data;

            // If it's the first time we get data, we just push it into the array else we add the matches to the existing array
            if(dataJson.length === 0){
                dataJson.push(data)
            }
            else{
                dataJson[0].matches = [...dataJson[0].matches, ...data.matches];
            }

            const lastMatch = data.matches[data.matches.length - 1];
            currentDateInJson = new Date(lastMatch.metadata.timestamp);

            if(currentDateInJson < oldestDate){
                loadedAllMatches = true;
            }
            else{
                nextMatches += 25;
            }
        }
        catch (error) {
            console.error(`Error occurred while fetching match history for mode '${mode}':`, error);
        }
    }

    // Filter matches to retain only those within the specified timeframe
    if (dataJson.length > 0) {
        dataJson[0].matches = dataJson[0].matches.filter(match => {
            const matchDate = new Date(match.metadata.timestamp);
            return matchDate >= oldestDate && matchDate <= latestDate;
        });
    }
    return dataJson;
}


/**
 * Inserts a champion into the championpool
 * @param champion
 * @param lane
 * @param userId
 * @param teamId
 * @returns {Promise<QueryResult<any>>}
 */
function addChampion(champion, lane, userId, teamId, type) {
    return pool.query(`INSERT INTO championpool (champion, lane, team_fk, "order", account_fk2, type) VALUES ($1, $2, $3, (SELECT COUNT(*) FROM championpool WHERE lane=$2 AND team_fk=$3 AND type=$5)+1, $4, $5)`, [champion, lane, teamId, userId, type]);
}

/**
 * Returns the lolstats config of a user
 * If there is no config, it will insert a new one
 * @param user
 */
function getLolStatsConfig(user) {
    return pool.query(`SELECT * FROM lolstatsdefinition WHERE account_fk=$1`,[user.id])
        .then(result => {
            if (result.rows.length === 0) {
                let pagesetup = '[{"order": 1, "riotid": "[MYSELF]"}]';
                return pool.query(`INSERT INTO lolstatsdefinition (account_fk, pagesetup) VALUES ($1, $2) RETURNING *`, [user.id, pagesetup]);
            }
            return result;
        });
}

/**
 * This function appends a new account to the lol stats definition
 * @param userId
 * @param riotId
 * @param order
 * @returns {Promise<QueryResult<any>>}
 */
async function appendUserToLolstatsDefinition(userId, riotId, order) {
    const result = await pool.query(`SELECT pagesetup FROM lolstatsdefinition WHERE account_fk=$1`, [userId]);
    let pagesetupArray = result.rows[0].pagesetup;
    pagesetupArray.push({ order, riotid: riotId });
    pagesetupArray.sort((a, b) => a.order - b.order); // Ensure the array is sorted by order
    return await pool.query(`UPDATE lolstatsdefinition SET pagesetup=$1 WHERE account_fk=$2`, [JSON.stringify(pagesetupArray), userId]);
}

/**
 * This function removes a user from the lol stats definition
 * @param userId
 * @param riotId
 * @param order
 * @returns {Promise<QueryResult<any>>}
 */
async function removeUserFromLolstatsDefinition(userId, riotId, order) {
    const result = await pool.query(`SELECT pagesetup FROM lolstatsdefinition WHERE account_fk=$1`, [userId]);
    let pagesetupArray = result.rows[0].pagesetup;

    // Filter out the item
    pagesetupArray = pagesetupArray.filter(item => !(item.riotid == riotId && item.order == order));

    // Reassign the order starting from 1 to n
    pagesetupArray = pagesetupArray.map((item, index) => ({
        ...item,
        order: index + 1 // This assumes the rest of the item object should remain unchanged
    }));

    return pool.query(`UPDATE lolstatsdefinition SET pagesetup=$1 WHERE account_fk=$2`, [JSON.stringify(pagesetupArray), userId]);
}

/**
 * Returns all championpool data from the database of one team
 * @param teamId
 * @returns {Promise<QueryResult<any>>}
 */
function getChampionpool(teamId) {
    return pool.query(`SELECT * FROM championpool WHERE team_fk=$1 ORDER BY id`,[teamId]);
}

/**
 * Changes the order of the championpool
 * @param championpoolId
 * @param teamId
 * @param direction 0=up 1=down
 * @returns {Promise<QueryResult<any>>}
 */
function changeChampionOrder(championpoolId, teamId, direction) {

    let updateOrderQuery;
    if (direction === "0") {
         updateOrderQuery = `
            WITH updated AS (
                UPDATE championpool
                    SET "order" = "order" - 1
                    WHERE id = $1
                    RETURNING "lane", "type", "order")
            UPDATE championpool
            SET "order" = "order" + 1
            WHERE "lane" = (SELECT "lane" FROM updated)
              AND "type" = (SELECT "type" FROM updated)
              AND "team_fk" = $2
              AND "order" = (SELECT "order" FROM updated)
              AND id != $1;
        `;
    } else {
        updateOrderQuery = `
            WITH updated AS (
                UPDATE championpool
                    SET "order" = "order" + 1
                    WHERE id = $1
                    RETURNING "lane", "type", "order")
            UPDATE championpool
            SET "order" = "order" - 1
            WHERE "lane" = (SELECT "lane" FROM updated)
              AND "type" = (SELECT "type" FROM updated)
              AND "team_fk" = $2
              AND "order" = (SELECT "order" FROM updated)
              AND id != $1;
        `;
    }
    return pool.query(updateOrderQuery, [championpoolId, teamId]);
}

/**
 * Deletes a champion from the championpool and orders the rest of them again
 * @param championpoolId
 * @returns {Promise<QueryResult<any>>}
 */
function deleteChampion(championpoolId) {
    return pool.query(`
        WITH deleted AS (
            DELETE FROM championpool WHERE id = $1 RETURNING "lane", "type", "team_fk", "order"
        )
        UPDATE championpool
        SET "order" = "order" - 1
        WHERE "lane" = (SELECT "lane" FROM deleted)
          AND "type" = (SELECT "type" FROM deleted)
          AND "team_fk" = (SELECT "team_fk" FROM deleted)
          AND "order" > (SELECT "order" FROM deleted);
    `, [championpoolId]);
}

module.exports = {router, getMatchHistory, getAccountInfo};