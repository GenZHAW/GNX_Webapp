const {pool} = require("./database/dbConfig");
const { logMessage, LogLevel } = require("./logger.js");
const util = require("util");

/**
 * Checks if the user is authenticated
 * If yes, redirects to the dashboard
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect("/dashboard");
    }
    next();
}

/**
 * Checks if the user is not authenticated
 * If he has no session, redirects to the index page
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        // Respond with 401 for AJAX request
        return res.status(401).json({ redirect: "/?type=error&message=Session expired, please login again" });
    } else {
        // Redirect to the index page for non-AJAX request
        return res.redirect("/?type=error&message=Session expired, please login again");
    }
}

/**
 * Checks if the user has the permission to access the given location
 * @param location
 * @param permission
 * @returns {(function(*, *, *): void)|*}
 */
function permissionCheck(location, permission) {
    return function(req, res, next) {
        // If location is an array, assume permissions have been passed as an array of objects
        // Otherwise, create a single-element array with the location and permission
        const permissions = Array.isArray(location) ? location : [{ location, permission }];

        hasUserPermission(req.user, permissions).then(hasPermission => {
            if (hasPermission) {
                next();
            } else {
                if (req.headers.accept.includes('application/json')) {
                    // For API requests, send a 403 status code with a JSON response
                    logMessage(`User ${req.user.username} tried to access ${location} but has no permission`, LogLevel.WARNING, req.user.id)
                    res.status(403).send({ error: 'Forbidden' });
                } else {
                    // For non-API requests, redirect to the /error page
                    logMessage(`User ${req.user.username} tried to access ${location} but has no permission`, LogLevel.WARNING, req.user.id)
                    console.log(`User ${req.user.username} tried to access ${location} but has no permission`)
                    res.redirect('/error');
                }
            }
        }).catch(err => {
            console.error(err);
            if (req.headers.accept.includes('application/json')) {
                // For API requests, send a 500 status code with a JSON response
                res.status(500).send({ error: 'Internal Server Error' });
            } else {
                // For non-API requests, redirect to the /error page
                res.redirect('/error');
            }
        });
    }
}

/**
 * Checks if a user has permission to perform an action
 * @param user
 * @param permissions
 */
function hasUserPermission(user, permissions) {
    return new Promise((resolve, reject) => {
        // Create an array of promises, one for each permission check
        const permissionChecks = permissions.map(permission => {
            return new Promise((resolve, reject) => {
                pool.query(`SELECT permissiontype.location, permissiontype.permission FROM role
                            LEFT JOIN roletype ON roletype.id = role.roletype_fk
                            LEFT JOIN permission ON "permission".roletype_fk = roletype.id
                            LEFT JOIN permissiontype ON permissiontype.id = "permission".permissiontype_fk
                            WHERE roletype.id IS NOT NULL AND (role.team_fk = $4 OR role.account_fk = $3)
                            AND permissiontype.location = $1 AND permissiontype.permission = $2
                            GROUP BY permissiontype.location, permissiontype.permission`, [permission.location, permission.permission, user.id, user.team.id], (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results.rowCount > 0);
                    }
                });
            });
        });

        // Wait for all permission checks to complete, then if any permission check passed, resolve with true
        Promise.all(permissionChecks)
            .then(results => resolve(results.some(result => result === true)))
            .catch(err => reject(err));
    });
}

/**
 * Checks if a user has write access to a calendar
 */
function hasUserWriteAccessToCalendar() {
    return function(req, res, next) {
        pool.query(`SELECT calendardefinition.id FROM calendardefinition
                                LEFT JOIN teammembership AS tm ON tm.team_fk = calendardefinition.team_fk
                                WHERE (tm.account_fk = $1 OR 1 = (SELECT COUNT(*) FROM accountpermission_view WHERE id = $1 AND location = 'eventcalendar' AND permission = 'isAdmin')) AND calendardefinition.id = $2
                                GROUP BY calendardefinition.id`, [req.user.id, req.body.calendarId]).then(result => {
            if (result.rowCount > 0) {
                next();
            }else{
                logMessage(`User ${req.user.username} tried to edit calendar ${req.body.calendarId} but has no permission`, LogLevel.WARNING, req.user.id)
                res.status(403).send({ error: 'Forbidden' });
            }
        });
    }
}

/**
 * Checks if a user is really the team manager of a team
 * @returns {(function(*, *, *): void)|*}
 */
async function isUserTeamManager(req, res, next) {
    // Extract team ID from request query parameter
    let teamId = req.query.teamId;
    if (!teamId) {
        teamId = req.body.teamId;
    }
    if (!teamId) {
        teamId = req.user.team.id
    }

    try {
        const result = await pool.query('SELECT account_fk FROM team WHERE id = $1', [teamId]);
        if (result.rows.length === 0 || result.rows[0].account_fk !== req.user.id) {
            logMessage(`User ${req.user.username} tried to perform a team manager action in team ${teamId} but is not the team manager.`, LogLevel.WARNING, req.user.id)
            return res.status(403).send({ message: 'You are not authorized to perform this action.' });
        }
        next();
    } catch (err) {
        console.error('Err: ' + err);
        res.status(500).send({ message: 'Internal Server Error' });
    }
}

/**
 * Checks if a user is allowed to edit user data
 * Either the user is the user itself or the has the permission 'isAdmin' for the location 'usermanagement'
 * @returns {(function(*, *, *): void)|*}
 */
async function isUserAllowedToEditOtherUser(req, res, next) {
    if (req.params.id == -1){
        next();
        return;
    }

    try {
        const result = await pool.query(`
            SELECT * FROM account
            WHERE username = $2 AND (id = $1 OR 1 = (SELECT COUNT(*) FROM accountpermission_view WHERE id = $1 AND location = 'usermanagement' 
            AND permission = 'canEditOthers'))`, [req.user.id, req.body.username]);

        if (result.rows.length === 0) {
            logMessage(`User ${req.user.username} tried to edit user ${req.body.username} but is not allowed to`, LogLevel.WARNING, req.user.id)
            return res.status(403).send({ message: 'You are not authorized to perform this action.' });
        }
        next();
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Internal Server Error' });
    }
}

module.exports = {
    checkAuthenticated,
    checkNotAuthenticated,
    permissionCheck,
    hasUserWriteAccessToCalendar,
    isUserTeamManager,
    isUserAllowedToEditOtherUser
}