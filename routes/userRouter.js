/**
 * Router for manipulating users
 */
const express = require('express');
const router = express.Router();
const {pool} = require('../js/serverJS/database/dbConfig.js');
const bcrypt = require("bcrypt");
const util = require("util");
const {checkNotAuthenticated, permissionCheck, isUserAllowedToEditOtherUser} = require("../js/serverJS/sessionChecker");
const {logMessage, LogLevel} = require('../js/serverJS/logger.js');
const {sendWelcomeMessage} = require("../js/serverJS/discordBot");
const thumbnailCreator = require("../js/serverJS/thumbnailCreator.js");
const {query} = require("express");

/**
 * POST route for updating the profile picture of a user
 */
//TODO only allow users to update their own profile picture
router.post('/updatePicture/:id', checkNotAuthenticated, function (req, res) {
    const userId = req.params.id;
    const base64 = req.body;

    updateUserPicture(base64, userId).then(() => {
        logMessage(`User ${req.user.username} updated the profile picture of user ${userId}`,LogLevel.INFO,req.user.id)
        res.status(200).send({picture: base64, message: "Profile picture updated successfully"});
    }).catch(() => {
        res.status(500).send("There was an error updating the profile picture! Please try again later.");
    });
});

/**
 * POST route for updating the password of a user
 */
//TODO only allow users to update their own password
router.post('/updatePassword', checkNotAuthenticated, function (req, res) {
    const userId = req.user.id;
    const password = req.body.password;

    updateUserPassword(password, userId).then(() => {
        logMessage(`User ${req.user.username} updated their password`,LogLevel.INFO,req.user.id)
        res.status(200).send({message: "Password updated successfully"});
    }).catch(() => {
        res.status(500).send({message: "There was an error updating the password! Please try again later."});
    });
});

/**
 * POST route for resetting the password of a user using a token as verification
 */
router.post('/updatePassword/:token',  async function (req, res) {
    const token = req.params.token;
    const password = req.body.password;

    const user = await getUserByToken(token);
    if (user) {
        updateUserPassword(password, user.id).then(() => {
            const formData = {
                resetpasswordtoken: '',
                resetpasswordexpires: 0
            }

            //Delete the tokens
            updateUser(formData, user.id).then(() => {
                logMessage(`User ${user.username} reset their password`,LogLevel.INFO,user.id)
                res.status(200).send();
            }).catch(() => {
                res.status(500).send({message: "There was an error updating the password! Please try again later."});
            });
        }).catch(() => {
            res.status(500).send({message: "There was an error updating the password! Please try again later."});
        });
    }else{
        res.status(500).send({message: "Invalid Token!"});
    }
});

/**
 * POST route for updating the information of a user
 */
//TODO only allow users to update their own information
router.post('/updateUser/:id', checkNotAuthenticated, isUserAllowedToEditOtherUser, function (req, res) {
    let userId = req.params.id;
    if (userId === "-1") {
        userId = req.user.id;
    }

    const formData = req.body;
    let register = 0;

    if (formData.firstname) {
        formData.fullName = formData.firstname + " " + formData.lastname;
        register = 1;

        delete formData.firstname;
        delete formData.lastname;
    }

    if (formData.zipR){
        formData.zip = formData.zipR;
        delete formData.zipR;
        register = 2;
    }

    if (formData.steam||formData.origin||formData.riotgames||formData.battlenet) {
        register = 3;
    }

    if (formData.discord  !== undefined){
        register = 0;
    }

    updateUser(formData, userId).then(() => {
        if (register === 1) {
            res.redirect('/register/address')
        }else if (register === 2){
            res.redirect('/register/gameaccounts')
        }else if (register === 3){
            res.redirect('/register/success')
        }
        else {
            logMessage(`User ${req.user.username} updated their information`,LogLevel.INFO,req.user.id)
            res.status(200).send({message: "Information updated successfully"});
        }
    }).catch(() => {
        res.status(500).send({message: "There was an error updating the information! Please try again later."});
    });
});

/**
 * GET route for getting the user list of active members of a team
 */
router.get('/getUserList/:teamId',checkNotAuthenticated, permissionCheck('calendar', 'canOpen'), function (req, res) {
    const teamId = req.params.teamId;

    getUsersFromTeam(teamId).then((result) => {
        res.status(200).send(result.rows);
    }).catch(() => {
        res.status(500).send({message: "There was an error getting the user list! Please try again later."});
    });
});

/**
 * GET route for getting all users
 */
router.get('/getusers',checkNotAuthenticated, permissionCheck([{location: 'rolemanagement', permission: 'canOpen'},{location: 'usermanagement', permission: 'canOpen'}]) , async (req, res) => {
    let users;
    if (req.query.minimalData) {
        users = await getUsersMinimal();
    }else {
        users = await getUsers();
    }
    res.send(users);
});

/**
 * POST route for deleting a user
 */
router.post('/deleteUser/:username',checkNotAuthenticated, permissionCheck('usermanagement', 'canOpen'), function (req, res) {
    const username = req.params.username;
    deleteUser(username).then(() => {
        logMessage(`User ${req.user.username} deleted the user ${username}`,LogLevel.INFO,req.user.id)
        res.status(200).send({message: "User deleted successfully"});
    }).catch(() => {
        res.status(500).send({message: "There was an error deleting the user! Please try again later."});
    });
});

/**
 * GET route for getting the users which can be assigned to a role
 */
router.get('/getuserstoassignrole', checkNotAuthenticated, permissionCheck('rolemanagement', 'canOpen'), async (req, res) => {
    getUsersToAssignRoleTo(req.query.roleId).then((result) => {
        res.status(200).send(result.rows);
    }).catch(() => {
        res.status(500).send({message: "There was an error getting the user list! Please try again later."});
    });
});

/**
 * GET route for Webapp member count
 */
router.get('/getWebappMemberCount', checkNotAuthenticated, permissionCheck('home', 'canOpen'), async (req, res) => {
    const query = util.promisify(pool.query).bind(pool);
    const registeredUsers = await query('SELECT COUNT(*) FROM account');
    const onlineUsers = await query('WITH tmpdata AS (SELECT (sess->\'passport\'->>\'user\')::integer as user_id FROM "session") SELECT COUNT(DISTINCT user_id) FROM tmpdata WHERE user_id > 0')

    res.send({onlineMembers: onlineUsers.rows[0].count, totalMembers: registeredUsers.rows[0].count})
});

/**
 * GET route for user permissions
 */
router.get('/getUserPermissions', checkNotAuthenticated, async (req, res) => {
    getUserPermissions(req.user.id, req.user.team.id).then((result) => {
        res.status(200).send(result.rows);
    }).catch(() => {
        res.status(500).send({message: "There was an error getting the permission List! Please try again later."});
    });
});

/**
 * GET route for checking if a user has multiple teams
 */
router.get('/hasMultipleTeams', checkNotAuthenticated, async (req, res) => {
    hasUserMultipleTeams(req.user.id).then((result) => {
        if (result.rows.length > 1) {
            res.status(200).send({response: true, teams: result.rows});
        }else{
            res.status(200).send({response: false, teams: ''});
        }
    }).catch((err) => {
        console.log(err);
        res.status(500).send({message: "There was an error getting the information if a user has multiple teams! Please try again later."});
    });
});

/**
 * GET route for the full quality user picture
 */
router.get('/getUserPicture', checkNotAuthenticated, async (req, res) => {
    getUserPicture(req.user.id).then((result) => {
        res.status(200).send(result.rows);
    }).catch(() => {
        res.status(500).send({message: "There was an error getting the permission List! Please try again later."});
    });
});

/**
 * POST route for setting the discordTag
 */
router.post('/setDiscordTag', checkNotAuthenticated, permissionCheck('home', 'canOpen'), async (req, res) => {
    setDiscordTag(req.user.id, req.body.discord).then((result) => {
        logMessage(`User ${req.user.username} set their discord tag to ${req.body.discord}`,LogLevel.INFO,req.user.id)
        sendWelcomeMessage(req.body.discord)
        res.status(200).send(result.rows);
    }).catch(() => {
        res.status(500).send({message: "There was an error getting the permission List! Please try again later."});
    });
});

/**
 * GET route for the username of a user
 */
router.get('/getUsername/:id', checkNotAuthenticated, async (req, res) => {
    getUserName(req.params.id).then((result) => {
        res.status(200).send(result.rows);
    }).catch(() => {
        res.status(500).send({message: "There was an error getting the Username! Please try again later."});
    });
});

/**
 * POST route for blocking or unblocking a user
 */
router.post('/blockOrUnblockUser/', checkNotAuthenticated, async (req, res) => {
    const formData = req.body;

    blockOrUnblockUser(formData).then((result) => {
        if (result.rowCount === 0) {
            res.status(500).send({message: "There was an error updating the user! Please try again later."});
        }else {
            logMessage(`User ${req.user.username} updated the user ${formData.username} to status Blocked = ${formData.blocked}`,LogLevel.INFO,req.user.id)
            res.status(200).send({message: "User updated successfully"});
        }
    }).catch(() => {
        res.status(500).send({message: "There was an error updating the user! Please try again later."});
    });
});

/**
 * Checks if a user has multiple teams
 * @param userId
 * @returns {Promise<QueryResult<any>>}
 */
function hasUserMultipleTeams(userId){
    return pool.query(`SELECT DISTINCT team_fk, team.displayname FROM teammembership LEFT JOIN team ON team.id = teammembership.team_fk WHERE teammembership.account_fk = $1`, [userId]);
}

/** Updates the information of a user in the database
 * This method is generic and can be used to update any field of the user
 * @param formData the data of the user
 * @param userId the id of the user
 * @returns {Promise<*>}
 */
async function updateUser(formData, userId) {
    const fields = ['fullName', 'email', 'phone', 'username', 'street', 'city', 'zip', 'steam', 'origin', 'riotgames', 'battlenet', 'resetpasswordtoken','resetpasswordexpires', 'blocked', 'discord','trainingdatareminder','wpuserid','wptoken','wprefreshtoken'];
    const updates = [];
    delete formData.password;

    fields.forEach(field => {
        if (formData[field] !== undefined) {
            if (formData['zip'] === '' || formData['zip'] === '-' ){
                formData['zip'] = null;
            }
            updates.push(`${field} = $${updates.length + 1}`);
        }
    });

    if (updates.length) {
        const query = `UPDATE account
                       SET ${updates.join(', ')}
                       WHERE id = $${updates.length + 1}`;
        const values = Object.values(formData).filter(val => val !== undefined);
        pool.query(query, [...values, parseInt(userId)], (err, result) => {
            if (err) {
                console.log(err);
                return -1;
            }
        });
    }

    return 0;
}

/**
 * Fetches the full user picture out of the DB
 * @param userId
 * @returns {Promise<QueryResult<any>>}
 */
function getUserPicture(userId) {
    return pool.query('SELECT picture FROM account WHERE id = $1', [userId]);
}

/**
 * Updates the password of a user in the database
 * @param password the new password
 * @param userId the id of the user
 * @returns {Promise<unknown>} a Promise that resolves if the password was updated successfully
 */
async function updateUserPassword(password, userId) {
    const hash = await bcrypt.hashSync(password, 10);

    return new Promise((resolve, reject) => {
        pool.query('UPDATE account SET password = $1 WHERE id = $2', [hash, parseInt(userId)], (err) => {
            if (err) {
                reject();
            } else {
                resolve();
            }
        });
    });
}

/**
 * Gets all users from a team
 * @param teamId the team id of the team
 * @returns {Promise<*>} a Promise that resolves to an array of users
 */
function getUsersFromTeam(teamId){
    return  pool.query(`SELECT username, account.id AS userid, team.id, thumbnail, tm.calendarorder FROM account 
                            LEFT JOIN teammembership AS tm ON tm.account_fk = account.id 
                            LEFT JOIN team ON team.id = tm.team_fk 
                            WHERE team.id = $1 AND (tm.active = 1 OR tm.coach = 1)
                            ORDER BY tm.calendarorder DESC, username ASC`,[teamId]);
}

/**
 * Gets a user by his token and checks if the token is still valid
 * @param token the token of the user
 * @returns {Promise<*>} Promise that resolves to the user
 */
async function getUserByToken(token) {
    const accountFields = await getUserFields();
    const query = util.promisify(pool.query).bind(pool);
    const result = await query(`SELECT ${accountFields} FROM account WHERE resetpasswordtoken = $1`, [token]);

    if (result.rows.length > 0) {
        const user = result.rows[0];
        const currentTime = Math.floor(Date.now() / 1000);

        if (user.resetpasswordexpires >= currentTime) {
            return user;
        }
    }
}

/**
 * Gets a user by his email
 * @param email the email of the user
 * @returns {*} Promise that resolves to the user
 */
async function getUserByEmail(email) {
    const query = util.promisify(pool.query).bind(pool);
    const accountFields = await getUserFields();
    return query(`SELECT ${accountFields} FROM account WHERE email = $1`, [email]);
}

/**
 * Returns a string with all account DB fields except the picture
 * @returns string
 */
async function getUserFields() {
    // Get a list of columns in the account table
    const columnsResult = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'account' AND column_name != 'picture'");
    return columnsResult.rows.map(row => `account.${row.column_name}`).join(", ");
}

async function getUsers() {
    const accountFields = await getUserFields();

    // Build the query string dynamically
    const queryString = `
    SELECT DISTINCT ${accountFields}, team.displayname AS team_display, team.teamtype_fk AS team_teamtype_fk, team.weight AS team_weight
    FROM account
    LEFT JOIN team ON team.id = (
        SELECT t2.id
        FROM teammembership
        LEFT JOIN team AS t2 ON t2.id = team_fk
        WHERE teammembership.account_fk = account.id
        ORDER BY weight DESC
        LIMIT 1
    ) ORDER BY account.username, account.id
  `;

    // Execute the query
    const query = util.promisify(pool.query).bind(pool);
    const results = await query(queryString);

    return results.rows.map(row => replaceNullWithHyphen(row));
}

function replaceNullWithHyphen(obj) {
    for (const [key, value] of Object.entries(obj)) {
        if (value === null) {
            obj[key] = '-';
        } else if (typeof value === 'object') {
            replaceNullWithHyphen(value);
        }
    }
    return obj;
}

function deleteUser(username){
    return pool.query(`DELETE
                 FROM account
                 WHERE username = $1`, [username]);
}

/**
 * Gets all users that are not assigned to a specific role
 * @param roleId
 * @returns {Promise<QueryResult<any>>}
 */
function getUsersToAssignRoleTo(roleId){
    return pool.query("SELECT id, username FROM account WHERE id NOT IN (SELECT COALESCE(account_fk,0) FROM role WHERE roletype_fk=$1)", [roleId]);
}

/**
 * Gets all users that are not assigned to a specific role
 * @returns {Promise<QueryResult<any>>}
 */
function getUserName(userId){
    return pool.query(`SELECT username FROM account WHERE id = $1`, [userId]);
}

/**
 * Returns the permissions of a user
 * @param userId
 */
function getUserPermissions(userId, teamId){
    return pool.query(`SELECT permissiontype.location, permissiontype.permission FROM role
                                            LEFT JOIN roletype ON roletype.id = role.roletype_fk
                                            LEFT JOIN permission ON "permission".roletype_fk = roletype.id
                                            LEFT JOIN permissiontype ON permissiontype.id = "permission".permissiontype_fk
                                            WHERE roletype.id IS NOT NULL AND (role.team_fk = $2 OR role.account_fk = $1)
                                            GROUP BY permissiontype.location, permissiontype.permission`, [userId, teamId]);
}

/**
 * Gets all  users with minimal information
 * @returns {Promise<QueryResult<any>>}
 */
async function getUsersMinimal() {
    const query = util.promisify(pool.query).bind(pool);
    const results = await query(`SELECT id, username
                                 FROM account ORDER BY username ASC`);

    return results.rows;
}

/**
 * Updates the discord tag of a user
 * @param userId
 * @param discordTag
 * @returns {Promise<QueryResult<any>>}
 */
function setDiscordTag(userId, discordTag){
    return pool.query(`UPDATE account SET discord = $1 WHERE id = $2`, [discordTag, userId]);
}

/**
 * Creates a thumbnail of a user picture
 * @param userId
 */
function createThumbnailOfUser(userId, base64) {
    return new Promise((resolve, reject) => {
        let picture = base64.replace(/^data:image\/\w+;base64,/, "");
        thumbnailCreator.createThumbnailFromBase64(picture, 75, 75).then(r => {
            r.data = 'data:image/' + r.fileType + ';base64, ' + r.data;
            pool.query(`UPDATE account SET thumbnail = $1 WHERE id = $2`, [r.data, userId], (err) => {
                if(err) {
                    console.error(err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        })
            .catch(err => {
                console.error(err);
                reject(err); // Handle errors from thumbnail creation
            });
    });
}

/**
 * Updates the picture of a user in the database
 * @param base64 the base64 string of the picture
 * @param userId the id of the user
 * @returns result -1 for an error, 0 for success
 */
function updateUserPicture(base64, userId) {
    return createThumbnailOfUser(userId, Object.values(base64)[0])
        .then(() => {
            return new Promise((resolve, reject) => {
                pool.query('UPDATE account SET picture = $1 WHERE id = $2', [Object.values(base64)[0], parseInt(userId)], (err) => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        })
        .catch(err => {
            console.error("An error occurred:", err);
        });
}

function blockOrUnblockUser(data){
    return pool.query(`UPDATE account SET blocked = $1 WHERE id = $2`, [data.blocked, data.id]);

}

module.exports = {
    router,
    getUserByToken,
    getUserByEmail,
    getUserFields,
    updateUser
};
