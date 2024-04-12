//Array with all available pages
const pages = [
    {id: "calendar", url: "/dashboard/calendar"},
    {id: "fileshare", url: "/dashboard/fileshare"},
    {id: "usermanagement", url: "/dashboard/usermanagement"},
    {id: "teammanagement", url: "/dashboard/teammanagement"},
    {id: "rolemanagement", url: "/dashboard/rolemanagement"},
    {id: "championpool", url: "/dashboard/championpool"},
    {id: "apexstats", url: "/dashboard/apexstats"},
    {id: "changelog", url: "/dashboard/changelog"},
    {id: "trainingnotes", url: "/dashboard/trainingNotes"},
    {id: "home1", url: "/dashboard/home"},
    {id: "settings", url: "/dashboard/settings"},
    {id: "trainingnotes_display", url: "/dashboard/trainingNotesDisplay"},
    {id: "trainingnotes_edit", url: "/dashboard/trainingNotesEdit"},
    {id: "gameday", url: "/dashboard/gameday"},
    {id: "adminpanel", url: "/dashboard/adminpanel"},
    {id: "gamedayadmin", url: "/dashboard/gamedayadmin"},
    {id: "lolstats", url: "/dashboard/lolstats"},
    {id: "valorantstats", url: "/dashboard/valorantstats"},
    {id: "patchnotes", url: "/dashboard/patchnotes"},
    {id: "cronjob", url: "/dashboard/cronjob"},
];

/**
 * Load the page with the given id
 * @param id the page id
 * @returns {Promise<void>}
 */
async function loadPage(id) {
    $('#home-section').empty();
    const page = pages.find(p => p.id === id);
    if (!page) {
        return;
    }
    $.get(page.url, function (html) {
        $('#home-section').html(html);
    });

    $('#'+id).addClass('bg-grey-level3');
    $('#'+id+'-line').addClass('bg-almost-white').removeClass('bg-transparent');

    pages.forEach(p => {
        if (p.id !== id) {
            $('#'+p.id).removeClass('bg-grey-level3');
            $('#'+p.id+'-line').removeClass('bg-almost-white');

            if (!$('#'+p.id+'-line').hasClass('bg-transparent')) {
                $('#'+p.id+'-line').addClass('bg-transparent');
            }
        }
    });
}

/**
 * Checks if a user is still authenticated
 * @returns {Promise<*|boolean>}
 */
async function checkSessionStatus() {
    try {
        const response = await $.get('/session-status');
        return response.isAuthenticated;
    } catch (error) {
        console.error('Error checking session status:', error);
        return false;
    }
}

/**
 * Loads an Entry Field from the Server
 */
function fetchEntryField(type, name, id, width, value) {
    return $.get(`/renderEntryField?type=${type}&name=${name}&id=${id}&width=${width}&value=${value}`);
}

/**
 * Loads a button from the Server
 */
function fetchButton(type, id, text, width, icon, customClasses, iconPos, btnType, inputId) {
    return $.get(`/renderButton?type=${type}&icon=${icon}&id=${id}&customClasses=${customClasses}&iconPos=${iconPos}&btnType=${btnType}&inputId=${inputId}&text=${text}&width=${width}`);
}

/**
 * Loads a dropdown from the Server
 */
function fetchDropdown(id, width, options, defaultOption) {
    return $.get(`/renderDropdown?id=${id}&width=${width}&options=${options}&defaultOption=${defaultOption}`);
}

/**
 * Loads a textarea from the Server
 */
function fetchTextarea(id, width, value) {
    return $.get(`/renderTextarea?id=${id}&width=${width}&value=${value}`);
}

/**
 * This function is used to wait for an element to be loaded
 * @param selector
 * @param callback
 */
function waitForElement(selector, callback) {
    if ($(selector).length) {
        callback();
    } else {
        setTimeout(function() {
            waitForElement(selector, callback);
        }, 100);
    }
}
