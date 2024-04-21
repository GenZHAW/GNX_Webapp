let allTeams = [];
let allTeamTypes = [];
let currentPageTeams = 1;
let currentPageTypes = 1;
const elementsPerPage = 5;

/**
 * Initializes the page
 */
function initPage(){
    loadTeams().then(function(teams){
        allTeams = teams;
        displayTeamsForPage(currentPageTeams);
    });

    loadTeamTypes().then(function(teamTypes){
        allTeamTypes = teamTypes;
        displayTeamTypesForPage(currentPageTypes);
        console.log(JSON.stringify(allTeamTypes.map(teamtype => teamtype.displayname)))
        setupCreateTeamPopup()
    });

    $('#teamsNextPage').click(function() {
        let totalPages = Math.ceil(allTeams.length / elementsPerPage);
        if (currentPageTeams < totalPages) {
            currentPageTeams++;
            displayTeamsForPage(currentPageTeams);
        }
    });

    $('#teamsPrevPage').click(function() {
        if (currentPageTeams > 1) {
            currentPageTeams--;
            displayTeamsForPage(currentPageTeams);
        }
    });

    $('#typeNextPage').click(function() {
        let totalPages = Math.ceil(allTeams.length / elementsPerPage);
        if (currentPageTypes < totalPages) {
            currentPageTypes++;
            displayTeamTypesForPage(currentPageTypes);
        }
    });

    $('#typePrevPage').click(function() {
        if (currentPageTypes > 1) {
            currentPageTypes--;
            displayTeamTypesForPage(currentPageTypes);
        }
    });
}

/**
 * Slices the notes to display only the ones for the current page
 * @param page
 */
function displayTeamsForPage(page) {
    let startIndex = (page - 1) * elementsPerPage;
    let endIndex = startIndex + elementsPerPage;
    let teamsToDisplay = allTeams.slice(startIndex, endIndex);
    buildTeamsTable(teamsToDisplay);
    updateTeamsPaginationIndicator(page, Math.ceil(allTeams.length / elementsPerPage));
}
/**
 * Slices the notes to display only the ones for the current page
 * @param page
 */
function displayTeamTypesForPage(page) {
    let startIndex = (page - 1) * elementsPerPage;
    let endIndex = startIndex + elementsPerPage;
    let teamTypesToDisplay = allTeamTypes.slice(startIndex, endIndex);
    buildTeamTypesTable(teamTypesToDisplay);
    updateTypesPaginationIndicator(page, Math.ceil(allTeams.length / elementsPerPage));
}



/**
 * Builds the table of the existing notes
 */
function buildTeamsTable(teams){
    const tableBody = $('#teamsData');
    tableBody.empty();

    teams.forEach(function(team){
        const tr = $("<tr></tr>");
        const tdName = $("<td></td>").text(team.displayname)
        const tdType = $("<td></td>").text(team.teamtype_fk);
        const tdManager = $("<td></td>").text(team.account_fk);
        const tdNotificationDays = $("<td></td>").text(team.discordnotificationdays)
        const tdButton = $("<td class='flex gap-2' ></td>");
        const editTeam = $("<a href='#' id='editTeam'><i class='ri-edit-line ri-lg text-turquoise'></i></a>")
            .click(function() {
            });

        tr.append(tdName).append(tdType).append(tdManager).append(tdNotificationDays).append(tdButton.append(editTeam));
        tableBody.append(tr);
    });
}

/**
 * Builds the table of the existing notes
 */
function buildTeamTypesTable(teamTypes){
    const tableBody = $('#teamTypesData');
    tableBody.empty();

    teamTypes.forEach(function(teamType){
        const tr = $("<tr></tr>");
        const tdName = $("<td></td>").text(teamType.name)
        const tdDpName = $("<td></td>").text(teamType.displayname);
        const tdButton = $("<td class='flex gap-2' ></td>");
        const editTeamType = $("<a href='#' id='editTeamType'><i class='ri-edit-line ri-lg text-turquoise'></i></a>")
            .click(function() {
            });

        tr.append(tdName).append(tdDpName).append(tdButton.append(editTeamType));
        tableBody.append(tr);
    });
}

/**
 * Updates the pagination indicator
 * @param currentPage
 * @param totalPages
 */
function updateTeamsPaginationIndicator(currentPage, totalPages) {
    $('#teamsPageIndicator').text(`Page ${currentPage} / ${totalPages}`);
}

/**
 * Updates the pagination indicator
 * @param currentPage
 * @param totalPages
 */
function updateTypesPaginationIndicator(currentPage, totalPages) {
    $('#typePageIndicator').text(`Page ${currentPage} / ${totalPages}`);
}

/**
 * Loads the teams from the database
 */
function loadTeams(){
    return $.ajax({
        url: '/team/getteams',
        type: 'GET',
        error: function(data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            console.log("Error fetching teams:", data.responseJSON);
        }
    })
}

/**
 * Loads the team types from the database
 */
function loadTeamTypes(){
    return $.ajax({
        url: '/teamtype/getteamtypes',
        type: 'GET',
        error: function(data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            console.log("Error fetching teams:", data.responseJSON);
        }
    })
}

function setupCreateTeamPopup() {
    const popupCreateRole = new Popup("popup-containerCreateTeam");

    let renderedHtml = '';
    // Add a 'text' property to each item in the array so that the dropdown can display the name
    const options = allTeamTypes.map(teamType => {
        return {
            ...teamType,          // Spread to copy all existing properties
            text: teamType.name   // Add new 'text' property, copying the value from 'name'
        };
    });
    $.when(
        fetchEntryField('text', 'teamname', 'teamName', 'w-52', ''),
        fetchDropdown('teamType', 'w-52',JSON.stringify(options) , 'Select Team Type')
    ).then(function(field1, field2) {
        renderedHtml += `<label for="teamName" class="input-label">Name</label>`
        renderedHtml += field1[0];
        renderedHtml += `<label for="teamType" class="input-label">Description</label>`
        renderedHtml += field2[0];

        popupCreateRole.displayInputPopupCustom("/res/others/plus.png", "Create Team", "Create", "btnCreateTeam", renderedHtml);

        $("#createTeam").click(function (e) {
            $("#teamName").val("");
            $("#teamType").val("");
            popupCreateRole.open(e);
        });

        $(document).on('click', '#btnCreateTeam', function() {
            createTeam(e, popupCreateRole)
            console.log("Create Team");
            popupCreateRole.close()
        });
    });
}

function setupCreateTeamTypePopup() {
    const popupCreateRole = new Popup("popup-containerCreateTeamType");

    let renderedHtml = '';
    // Add a 'text' property to each item in the array so that the dropdown can display the name
    const options = allTeamTypes.map(teamType => {
        return {
            ...teamType,          // Spread to copy all existing properties
            text: teamType.name   // Add new 'text' property, copying the value from 'name'
        };
    });
    $.when(
        fetchEntryField('text', 'teamtypedisplayname', 'teamTypeName', 'w-52', ''),
        fetchEntryField('text', 'teamtypedisplayname', 'teamTypeDisplayName', 'w-52', ''),
    ).then(function(field1, field2) {
        renderedHtml += `<label for="teamTypeName" class="input-label">Name</label>`
        renderedHtml += field1[0];
        renderedHtml += `<label for="teamTypeDisplayName" class="input-label">Description</label>`
        renderedHtml += field2[0];

        popupCreateRole.displayInputPopupCustom("/res/others/plus.png", "Create Team", "Create", "btnCreateTeam", renderedHtml);

        $("#createTeamType").click(function (e) {
            $("#teamTypeName").val("");
            $("#teamTypeDisplayName").val("");
            popupCreateRole.open(e);
        });

        $(document).on('click', '#btnCreateTeam', function() {
            createTeamType(e, popupCreateRole)
            popupCreateRole.close()
        });
    });
}


/**
 * Creates a new Team
 */
async function createTeam(e, popupTeam) {
    const teamName = $("#teamName").val();
    const teamType = $("#teamType").val();
    console.log(teamType)
    const teamWeight = 100

    if (teamName && teamType && teamWeight) {
        $.ajax({
            url: "/team/insertteam",
            type: "POST",
            dataType: "json",
            data: {
                teamName: teamName,
                teamType: teamType,
                teamWeight: teamWeight
            },
            success: function () {
                displaySuccess("Inserted new team!");
                popupTeam.close(e);
                buildTeamTable()
            },
            error: function (data) {
                if (data.responseJSON && data.responseJSON.redirect) {
                    window.location.href = data.responseJSON.redirect;
                }
                console.log("Error inserting team:", data.responseJSON);
                displayError("Error inserting Team! Try reloading the page.")
            }
        });
    } else {
        displayError("Please fill in all fields!")
    }
}

/**
 * Creates a new TeamType
 */
function createTeamType(e, popupTeamType) {
    const internalName = $("#teamTypeName").val();
    const displayName = $("#teamTypeDisplayName").val();

    if (internalName && displayName) {
        $.ajax({
            url: "/teamtype/insertteamtype",
            type: "POST",
            dataType: "json",
            data: {
                internalName: internalName,
                displayName: displayName
            },
            success: function () {
                displaySuccess("Inserted new team type!");
                popupTeamType.close(e);
                buildTeamTypeTable()
            },
            error: function (data) {
                if (data.responseJSON && data.responseJSON.redirect) {
                    window.location.href = data.responseJSON.redirect;
                }
                console.log("Error inserting team type:", data.responseJSON);
                displayError("Error inserting Team Type! Try reloading the page.")
            }
        });
    } else {
        displayError("Please fill in all fields!")
    }
}


