const express = require('express');
const router = express.Router();
const { checkNotAuthenticated } = require('../js/serverJS/sessionChecker.js');
const {permissionCheck} = require("../js/serverJS/sessionChecker");

/**
 * GET dashboard page
 */
router.get('/', checkNotAuthenticated, (req, res) => {
    res.render('dashboard', { user: req.user });
});

/**
 * GET home page
 */
router.get('/home', checkNotAuthenticated, permissionCheck('home', 'canOpen'), (req, res) => {
            res.render('dashboard/home.ejs', { user: req.user });
});

/**
 * GET settings page
 */
router.get('/settings', checkNotAuthenticated, permissionCheck('settings', 'canOpen'), (req, res) => {
            res.render('dashboard/settings.ejs', { user: req.user });
});

/**
 * GET calendar page
 */
router.get('/calendar', checkNotAuthenticated, permissionCheck('calendar', 'canOpen'), (req, res) => {
            res.render('dashboard/calendar.ejs', { user: req.user });
});

/**
 * GET dashboard page
 */
router.get('/fileshare', checkNotAuthenticated, permissionCheck('fileshare', 'canOpen'), (req, res) => {
            res.render('dashboard/fileshare.ejs', { user: req.user });
});

/**
 * GET user-management page
 */
router.get('/usermanagement', checkNotAuthenticated, permissionCheck('usermanagement', 'canOpen'), (req, res) => {
            res.render('dashboard/usermanagement.ejs', { user: req.user });
});

/**
 * GET team-management page
 */
router.get('/teammanagement', checkNotAuthenticated, permissionCheck('teammanagement', 'canOpen'), (req, res) => {
            res.render('dashboard/teammanagement.ejs', { user: req.user });
});

/**
 * GET championpool page
 */
router.get('/championpool', checkNotAuthenticated, permissionCheck('championpool', 'canOpen'), (req, res) => {
    res.render('dashboard/championpool.ejs', { user: req.user });
});

/**
 * GET role-management page
 */
router.get('/rolemanagement', checkNotAuthenticated, permissionCheck('rolemanagement', 'canOpen'), (req, res) => {
            res.render('dashboard/rolemanagement.ejs', { user: req.user });
});

/**
 * GET apexstats page
 */
router.get('/apexstats', checkNotAuthenticated, permissionCheck('apexstats', 'canOpen'), (req, res) => {
    res.render('dashboard/apexstats.ejs', { user: req.user });
});

/**
 * GET changelog page
 */
router.get('/changelog', checkNotAuthenticated, permissionCheck('changelog', 'canOpen'), (req, res) => {
    res.render('dashboard/changelog.ejs', { user: req.user });
});

/**
 * GET event Calendar page
 */
router.get('/eventCalendar', checkNotAuthenticated, permissionCheck('eventcalendar', 'canOpen'), (req, res) => {
    res.render('dashboard/eventcalendar.ejs', { user: req.user });
});

/**
 * GET training notes page
 */
router.get('/trainingNotes', checkNotAuthenticated, permissionCheck('trainingnotes', 'canOpen'), (req, res) => {
    res.render('dashboard/trainingnotes.ejs', { user: req.user });
});

/**
 * GET training notes display page
 */
router.get('/trainingNotesDisplay', checkNotAuthenticated, permissionCheck('trainingnotes', 'canOpen'), (req, res) => {
    res.render('dashboard/trainingnotes_display.ejs', { user: req.user });
});

/**
 * GET training notes edit page
 */
router.get('/trainingNotesEdit', checkNotAuthenticated, permissionCheck('trainingnotes', 'canOpen'), (req, res) => {
    res.render('dashboard/trainingnotes_edit.ejs', { user: req.user });
});

/**
 * GET game day page
 */
router.get('/gameday', checkNotAuthenticated, permissionCheck('gameday', 'canOpen'), (req, res) => {
    res.render('dashboard/gameday.ejs', { user: req.user });
});

/**
 * GET admin panel page
 */
router.get('/adminpanel', checkNotAuthenticated, permissionCheck('adminpanel', 'canOpen'), (req, res) => {
    res.render('dashboard/adminpanel/adminpanel.ejs', { user: req.user });
});

/**
 * GET gameday admin page
 */
router.get('/gamedayadmin', checkNotAuthenticated, permissionCheck('adminpanel', 'canOpen'), (req, res) => {
    res.render('dashboard/adminpanel/gamedayadmin.ejs', { user: req.user });
});

/**
 * GET lol stats page
 */
router.get('/lolstats', checkNotAuthenticated, permissionCheck('lolstatspage', 'canOpen'), (req, res) => {
    res.render('dashboard/lolstats.ejs', { user: req.user });
});
/**
 * GET valorant stats page
 */
router.get('/valorantstats', checkNotAuthenticated, permissionCheck('home', 'canOpen'), (req, res) => {
    res.render('dashboard/valorantstats.ejs', { user: req.user });
});




/**
 * GET patchnotes page
 */
router.get('/patchnotes', checkNotAuthenticated, permissionCheck('adminpanel', 'canOpen'), (req, res) => {
    res.render('dashboard/adminpanel/patchnotes.ejs', { user: req.user });
});

/**
 * GET cronjob page
 */
router.get('/cronjob', checkNotAuthenticated, permissionCheck('adminpanel', 'canOpen'), (req, res) => {
    res.render('dashboard/adminpanel/cronjob.ejs', { user: req.user });
});

module.exports = router;
