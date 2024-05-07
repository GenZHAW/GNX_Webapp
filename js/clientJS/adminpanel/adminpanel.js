/**
 * Initialize the page
 */
function initPage(){
    loadOpenGamedayReports()
    loadCurrentWebappVersion()
    loadCronjobCount()
    loadActiveRegistrationCodeCount()
    loadTeamCount()
    loadUserCount()
}

/**
 * Loads the count of open gameday reports
 */
function loadOpenGamedayReports(){
    $.ajax({
        type: 'GET',
        url: '/gameday/getOpenResultCount',
        success: function(response) {
            $('#openGamedayReports').text(response.count);
        },
        error: function(data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            displayError(data.responseJSON.message);
        }
    });
}

/**
 * Loads the count of running cronjobs
 */
function loadCronjobCount(){
    $.ajax({
        type: 'GET',
        url: '/cronjob/getCount',
        success: function(response) {
            $('#activeJobs').text(response.count);
        },
        error: function(data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            displayError(data.responseJSON.message);
        }
    });
}

/**
 * Loads the current webapp version
 */
function loadCurrentWebappVersion(){
    $.ajax({
        type: 'GET',
        url: '/patchnotes/getCurrentVersion',
        success: function(response) {
            $('#currentVersion').text(response[0].version);
        },
        error: function(data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            displayError(data.responseJSON.message);
        }
    });
}

/**
 * Loads the active registration code count
 */
function loadActiveRegistrationCodeCount(){
    $.ajax({
        url: '/registrationcode/getregistrationcodes',
        type: 'GET',
        success: function(response) {1
            $('#activeRegistrationcodes').text(response.length);
        },
        error: function(data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            displayError(data.responseJSON.message);
        }
    });
}

/**
 * Loads the team count
 */
function loadTeamCount(){
    $.ajax({
        url: '/team/getteams',
        type: 'GET',
        success: function(response) {1
            $('#teamCount').text(response.length);
        },
        error: function(data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            displayError(data.responseJSON.message);
        }
    });
}

function loadUserCount(){
    $.ajax({
        url: '/user/getusers',
        type: 'GET',
        success: function(response) {1
            $('#userCount').text(response.length);
        },
        error: function(data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            displayError(data.responseJSON.message);
        }
    });
}