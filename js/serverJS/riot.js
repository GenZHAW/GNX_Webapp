const axios = require('axios');
/**
 * Get the data from the dDragon API
 * @returns {Promise<*>}
 */
const getDDragonDataFromRiot = async () => {
    let latestVersion;

    // Get the latest version
    await fetch('https://ddragon.leagueoflegends.com/api/versions.json')
        .then(response => response.json())
        .then(data => {
            // Extracting the latest version
            latestVersion = data[0]; // Assuming the first element in the array is the latest version
            console.log('Latest DDragon version:', latestVersion);
        })
        .catch(error => {
            console.error('Error fetching DDragon version:', error);
        });

    let dDragonData;
    // Fetch champion data using the latest version
    await axios.get(`http://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`)
        .then(response => {
            dDragonData = response.data;
        })
        .catch(error => {
            console.error('Error:', error);
        });

    return dDragonData;
}

/**
 * Get the dDragon data from the project
 * @returns {Promise<*>}
 */
async function getDDragonDataFromProject(){
    return require('../../res/riot/dragonData.json');
}

/**
 * Get the account info from the riot API
 * @param riotId
 * @returns {Promise<{isValid: string}>}
 */
async function getAccountInfo(riotId) {
    const [ingameName, tagLine] = riotId.split('#');
    try {
        const response = await axios.get(`https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(ingameName)}/${encodeURIComponent(tagLine)}`, {
            headers: {
                "X-Riot-Token": process.env.RIOT_API_KEY
            }
        });
        return {isValid: 'true', data: response.data};
    } catch (error) {
        if (error.response) {
            if (error.response.status === 403 && error.response.data && error.response.data.status && error.response.data.status.message.includes('No results found for player with riot id')) {
                return {isValid: 'false', message: 'No results found for player with riot id'};
            } else {
                //console.error('Error message:', error.message);
                return {isValid: 'false', message: 'There was an error processing your request.'};
            }
        } else {
            console.error('Error message:', error.message);
            return {isValid: 'false', message: 'There was an error processing your request.'};
        }
    }
}

/**
 * Get the Summoner info
 * @param puuid
 * @returns {Promise<{isValid: string}>}
 */
async function getSummonerInfo(puuid) {
    try {
        const response = await axios.get(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`, {
            headers: {
                "X-Riot-Token": process.env.RIOT_API_KEY
            }
        });

        const response2 = await axios.get(`https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/${response.data.id}`, {
            headers: {
                "X-Riot-Token": process.env.RIOT_API_KEY
            }
        });
        return {isValid: 'true', summonerInfo: response.data, rankInfo: response2.data};
    } catch (error) {
        console.error('Error message:', error.message);
        return {isValid: 'false', message: 'There was an error processing your request.'};
    }
}

module.exports = {getDDragonData: getDDragonDataFromRiot, getDDragonDataFromProject,getAccountInfo,getSummonerInfo}