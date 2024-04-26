let allTeams = [];
let allTeamTypes = [];
let currentPageTeams = 1;
let currentPageTypes = 1;
const elementsPerPage = 5;

/**
 * Initializes the page
 */
function initPage() {
    // Use Promise.all to handle both promises concurrently
    Promise.all([loadTeams(), loadTeamTypes()]).then(function(results) {
        // Assigning results to their respective global variables
        allTeams = results[0]; // results from loadTeams
        allTeamTypes = results[1]; // results from loadTeamTypes

        // Display data based on current page indices
        sliceTableForPage(currentPageTeams, allTeams);
        sliceTableForPage(currentPageTypes, allTeamTypes);

        // Setup popups
        setupCreateTeamPopup();
        setupCreateTeamTypePopup()
    }).catch(function(error) {
        console.error("Failed to initialize page data:", error);
    });

    // Pagination for teams
    $('#teamsNextPage').click(function() {
        let totalPages = Math.ceil(allTeams.length / elementsPerPage);
        if (currentPageTeams < totalPages) {
            currentPageTeams++;
            sliceTableForPage(currentPageTeams, allTeams);
        }
    });

    $('#teamsPrevPage').click(function() {
        if (currentPageTeams > 1) {
            currentPageTeams--;
            sliceTableForPage(currentPageTeams, allTeams);
        }
    });

    // Pagination for team types
    $('#typeNextPage').click(function() {
        let totalPages = Math.ceil(allTeamTypes.length / elementsPerPage);
        if (currentPageTypes < totalPages) {
            currentPageTypes++;
            sliceTableForPage(currentPageTypes, allTeamTypes);
        }
    });

    $('#typePrevPage').click(function() {
        if (currentPageTypes > 1) {
            currentPageTypes--;
            sliceTableForPage(currentPageTypes, allTeamTypes);
        }
    });
}

/**
 * Slices the teamTypes to display only the ones for the current page
 * @param page
 * @param data
 */
function sliceTableForPage(page, data){
    let startIndex = (page - 1) * elementsPerPage;
    let endIndex = startIndex + elementsPerPage;
    let dataToDisplay = data.slice(startIndex, endIndex);
    if(data === allTeams){
        buildTeamsTable(dataToDisplay)
        updatePaginationIndicator(page, Math.ceil(data.length / elementsPerPage), "teamPageIndicator");
    }
    else{
        buildTeamTypesTable(dataToDisplay)
        updatePaginationIndicator(page, Math.ceil(data.length / elementsPerPage), "typePageIndicator");
    }
}

/**
 * Builds the table of the teams
 */
function buildTeamsTable(teams){
    const tableBody = $('#teamsData');
    tableBody.empty();

    teams.forEach(async function(team){
        const tr = $("<tr></tr>");
        const tdName = $("<td></td>").text(team.displayname);
        const tdType = $("<td></td>").text(getTeamTypeDisplayName(team.teamtype_fk));
        const tdManager = $("<td></td>").text(await getUserName(team.account_fk));
        const tdNotificationDays = $("<td></td>").text(team.discordnotificationdays);
        const tdButton = $("<td class='flex gap-2'></td>");
        const editTeam = $("<a href='#' id='editTeam'><i class='ri-edit-line ri-lg text-turquoise'></i></a>")
            .click(function() {
                $('#teamEdit').removeClass('hidden');
                displayEditTeam(team);
            });

        tr.append(tdName).append(tdType).append(tdManager).append(tdNotificationDays).append(tdButton.append(editTeam));
        tableBody.append(tr);
    });
}


/**
 * Builds the table of the team types
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
 * @param currentPage The current page index
 * @param totalPages Total pages available
 * @param elementName The name of the element to update
 */
function updatePaginationIndicator(currentPage, totalPages, elementName) {
    $('#'+elementName).text(`Page ${currentPage} / ${totalPages}`);
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

/**
 * Sets up the createTeam popup
 */
function setupCreateTeamPopup() {
    const popupCreateTeam = new Popup("popup-containerCreateTeam");

    let renderedHtml = '';
    // Add a 'text' property to each item in the array so that the dropdown can display the name
    const optionsWithValues = allTeamTypes.map(teamType => {
        return {
            ...teamType,          // Spread to copy all existing properties
            text: teamType.name,   // Add new 'text' property, copying the value from 'name'
            value: teamType.id     // Add new 'value' property, copying the value from 'id'
        };
    });

    // Convert optionsWithValues to a JSON string to be used in the fetchDropdown function
    const optionsJson = JSON.stringify(optionsWithValues);

    $.when(
        fetchEntryField('text', 'teamname', 'teamName', 'w-52', ''),
        fetchDropdown('teamType', 'w-52',optionsJson , 'Select Team Type')
    ).then(function(field1, field2) {
        renderedHtml += `<label for="teamName" class="input-label">Name</label>`
        renderedHtml += field1[0];
        renderedHtml += `<label for="teamType" class="input-label">Description</label>`
        renderedHtml += field2[0];

        popupCreateTeam.displayInputPopupCustom("/res/others/plus.png", "Create Team", "Create", "btnCreateTeam", renderedHtml);

        $("#createTeam").click(function (e) {
            $("#teamName").val("");
            $("#teamType").val("");
            popupCreateTeam.open(e);
        });

        $(document).off('click', '#btnCreateTeam').on('click', '#btnCreateTeam', function() {
            popupCreateTeam.close();
            createTeam();
        });
    });
}

/**
 * Sets up the createTeamType popup
 */
function setupCreateTeamTypePopup() {
    const popupCreateTeamType = new Popup("popup-containerCreateTeamType");

    let renderedHtml = '';

    $.when(
        fetchEntryField('text', 'teamtypename', 'teamTypeName', 'w-52', ''),
        fetchEntryField('text', 'teamtypedisplayname', 'teamTypeDisplayName', 'w-52', ''),
    ).then(function(field1, field2) {
        renderedHtml += `<label for="teamTypeName" class="input-label">Name</label>`
        renderedHtml += field1[0];
        renderedHtml += `<label for="teamTypeDisplayName" class="input-label">Display name</label>`
        renderedHtml += field2[0];

        popupCreateTeamType.displayInputPopupCustom("/res/others/plus.png", "Create TeamType", "Create", "btnCreateTeamType", renderedHtml);

        $("#createTeamType").click(function (e) {
            $("#teamTypeName").val("");
            $("#teamTypeDisplayName").val("");
            popupCreateTeamType.open(e);
        });

        $(document).off('click', '#btnCreateTeamType').on('click', '#btnCreateTeamType', function() {
            popupCreateTeamType.close();
            createTeamType();
        });
    });
}

/**
 * Creates a new Team
 */
async function createTeam() {
    const teamName = $("#teamName").val();
    const teamType = $("#teamType").val();
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
                loadTeams().then(function(data) {
                    allTeams = data;
                    sliceTableForPage(currentPageTeams, allTeams);
                });
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
function createTeamType() {
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
                loadTeamTypes().then(function(data) {
                    allTeamTypes = data;
                    sliceTableForPage(currentPageTypes, allTeamTypes);
                });
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

/**
 * Returns the username of a user based on the id
 * If the id is null, it returns "No Manager"
 * @param id The ID of the user to find
 * @returns {Promise<unknown>} The username of the user or "No Manager" if the id is null
 */
function getUserName(id) {
    if(id != null){
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "/user/getUsername/" + id,
                type: "GET",
                dataType: "json",
                success: function (data) {
                    if(data.length === 0){
                        resolve("No Manager")
                    }
                    else{
                        resolve(data[0].username);
                    }
                },
                error: function (error) {
                    reject(error);
                }
            });
        });
    }
    else{
        return "No Manager"
    }
}

/**
 * Returns the teamType displayName name based on the id
 * @param id - The ID of the team type to find
 * @returns {string} The display name of the team type
 */
function getTeamTypeDisplayName(id) {
    for (let teamType of allTeamTypes) {
        if (teamType.id === id) {
            return teamType.displayname;
        }
    }
    return "Not Found"; // Return a default message if no match is found
}

/**
 * Displays the details of a gameday
 * @param team
 */
function displayEditTeam(team) {
    console.log(team)
    delete team.id;
    let teamEdit = $('#teamEdit');
    teamEdit.empty();

    const editTable = $('<table class="table-auto w-full bg-grey-level2 mt-4 overflow-x-auto"></table>');

    // Create table header with team title
    const thead = $('<thead></thead>');
    const trHead = $('<tr></tr>');
    const th = $('<th colspan="2" class="text-left pb-4 font-montserrat font-bold text-almost-white text-lg"></th>').text(`Edit ${team.displayname} Team`);
    trHead.append(th);
    thead.append(trHead);
    editTable.append(thead);

    const tbody = $('<tbody class="text-almost-white font-montserrat"></tbody>');

    let customClass;
    for (const [key, value] of Object.entries(team)) {
        const tr = $('<tr></tr>');
        const tdKey = $('<td class="font-bold w-48"></td>').text(key.charAt(0).toUpperCase() + key.slice(1));
        let displayValue = value;
        if (key === 'date' || (key === 'reportdate' && displayValue)) {
            displayValue = new Date(value).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
        }

        if(key === 'status'){
            displayValue = displayValue ? 'Completed' : 'Not completed';
            customClass = displayValue === 'Completed' ? 'text-success' : 'text-error';
        }

        if (!displayValue){
            displayValue = "-";
        }

        if(key === 'result' && displayValue === 'Not reported'){
            customClass = 'text-error';
        }

        const tdValue = $('<td class="break-all py-1"></td>').text(displayValue).addClass(customClass);
        customClass = '';


        tr.append(tdKey).append(tdValue);
        tbody.append(tr);

    }

    editTable.append(tbody);
    teamEdit.append(editTable);
}
