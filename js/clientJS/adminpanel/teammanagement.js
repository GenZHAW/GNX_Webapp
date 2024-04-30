let allTeams = [];
let allTeamTypes = [];
let currentPageTeams = 1;
let currentPageTypes = 1;
const elementsPerPage = 5;
let users = [];

/**
 * Initializes the page
 */
function initPage() {
    // Use Promise.all to handle both promises concurrently
    Promise.all([loadTeams(), loadTeamTypes()]).then(function(results) {
        // Assigning results to their respective global variables
        allTeams = results[0]; // results from loadTeams
        allTeamTypes = results[1]; // results from loadTeamTypes
        getUsers().then(function(data) {
            // Display data based on current page indices
            sliceTableForPage(currentPageTeams, allTeams);
            sliceTableForPage(currentPageTypes, allTeamTypes);

            // Setup popups
            setupCreateTeamPopup();
            setupCreateTeamTypePopup()
        });
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
        const tdManager = $("<td></td>").text(getManagerName(team.account_fk));
        const tdNotificationDays = $("<td></td>").text(team.discordnotificationdays);
        const tdButton = $("<td class='flex gap-2'></td>");
        const editTeam = $("<a href='#' id='editTeam'><i class='ri-edit-line ri-lg text-turquoise'></i></a>")
            .click(function() {
                $('#teamEdit').removeClass('hidden');
                const rowElement = $(this).closest('tr');
                displayEditTeam(team, team.id, rowElement);
            });
        const btnDeleteTeam = $("<a href='#' id='btnDeleteTeam'><i class='ri-delete-bin-line ri-lg text-turquoise'></i></a>")
            .click(function(e) {
                deleteTeam(e, team.id);
            });

        tr.append(tdName).append(tdType).append(tdManager).append(tdNotificationDays).append(tdButton.append(editTeam).append(btnDeleteTeam));
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
                $('#teamTypeEdit').removeClass('hidden');
                const rowElement = $(this).closest('tr');
                displayEditTeamType(teamType, teamType.id, rowElement);
            });
        const btnDeleteTeamType = $("<a href='#' id='btnDeleteTeamType'><i class='ri-delete-bin-line ri-lg text-turquoise'></i></a>")
            .click(function(e) {
                deleteTeamType(e, teamType.id);
            });

        tr.append(tdName).append(tdDpName).append(tdButton.append(editTeamType).append(btnDeleteTeamType));
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
function getManagerName(id) {
    user = users.find(user => user.id === id)
    return user ? user.username : 'No Manager';

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
 * @param triggeringElement
 */
function displayEditTeam(team, teamId, triggeringElement) {
    const teamBeforeUpdate = { ...team }; // Creating a copy to send the original values when not updating all values
    delete team.id;
    // Creating a new table row to hold the editing form
    if($('#teamEdit').length > 0) {
        $('#teamEdit').remove();
    }
    const teamEdit = $('<tr id="teamEdit"></tr>');
    const editTable = $('<td colspan="5"></td>');
    const tbody = $('<div class="flex flex-wrap text-almost-white font-montserrat gap-2"></div>');

    for (const [key, value] of Object.entries(team)) {
        fieldName = "edit"+key
        const tr = $('<div></div>');

        // Default input value
        let inputValue = value;

        // Check if the input value is empty and replace it with a placeholder
        if (!inputValue) {
            inputValue = "";
        }

        // Create a table cell and append the input element to it
        const tdValue = $('<div></div>')
        let tdKey;

        if(key === 'teamtype_fk'){
            // Create a table cell for the key with a bold font and a specific width
            tdKey = $('<label class="font-montnserrat text-base text-almost-white"></label>').text("Team Type");

            const teamTypeDropDown = allTeamTypes.map(teamType => ({ text: teamType.name, value: teamType.id }));

            const defaultOption = teamTypeDropDown.find(teamType => teamType.value === inputValue);

            fetchDropdown(fieldName, 'w-52',JSON.stringify(teamTypeDropDown), defaultOption.text).then(function(field) {
                tdValue.append(field);
            });
        }
        else if(key === 'account_fk'){
            tdKey = $('<label class="font-montnserrat text-base text-almost-white"></label>').text("Team Manager");

            // Map users to new objects with text and value properties, adding a default option
            const userDropDown = users.map(user => ({ text: user.username, value: user.id })).concat({ text: "No Manager", value: 0 });

            // Find the default option matching the input value or use "No Manager" as default
            const defaultOption = userDropDown.find(user => user.value === inputValue) || { text: "No Manager", value: 0 };

            // Fetch and append the dropdown to tdValue
            fetchDropdown(fieldName, 'w-52', JSON.stringify(userDropDown), defaultOption.text).then(field => {
                tdValue.append(field);
            });
        }
        else{
            // Create a table cell for the key with a bold font and a specific width
            tdKey = $('<label class="font-montnserrat text-base text-almost-white"></label>').text(key.charAt(0).toUpperCase() + key.slice(1));

            fetchEntryField('text', team.displayname + "_" +key.charAt(0).toUpperCase() + key.slice(1), fieldName, 'w-64',inputValue ).then(function(field) {
                tdValue.append(field);
            });
        }

        // Append both cells to the table row
        tr.append(tdKey).append(tdValue);

        // Append the row to the tbody
        tbody.append(tr);

    }
    const btnContainer = $('<div class="flex float-right gap-4 mt-4"></div>');

// Fetch the first button and append it to the container.
    fetchButton('button', 'btnCloseEditTeam', 'Close', 'w-32', 'ri-close-circle-line').then(function(btnCloseEdit) {
        btnContainer.append(btnCloseEdit);

        // Only after the first button is appended, fetch the second button.
        return fetchButton('button', 'btnUpdateEditTeam', 'Update', 'w-32', 'ri-save-line', '', '', 'Success');
    }).then(function(btnUpdateEdit) {
        btnContainer.append(btnUpdateEdit);
        editTable.append(btnContainer);
    }).then(function() {
        // Set up event handlers after all buttons have been added to the DOM.
        $('#btnUpdateEditTeam').click(function() {
            updateTeam(teamId, teamBeforeUpdate);
        });
        $('#btnCloseEditTeam').click(function() {
            $('#teamEdit').remove();
        });
    });


    editTable.append(tbody);
    teamEdit.append(editTable);
    $(triggeringElement).after(teamEdit);
}

/**
 * Displays the details of a gameday
 * @param teamType
 * @param id
 * @param triggeringElement
 */
function displayEditTeamType(teamType, id, triggeringElement) {
    delete teamType.id;
    // Creating a new table row to hold the editing form
    if($('#teamTypeEdit').length > 0) {
        $('#teamTypeEdit').remove();
    }
    const teamTypeEdit = $('<tr id="teamTypeEdit"></tr>');
    const editTable = $('<td colspan="5"></td>');
    const tbody = $('<div class="flex flex-wrap text-almost-white font-montserrat gap-2"></div>');

    for (const [key, value] of Object.entries(teamType)) {
        fieldName = "edit"+key
        const tr = $('<div></div>');

        // Default input value
        let inputValue = value;

        // Check if the input value is empty and replace it with a placeholder
        if (!inputValue) {
            inputValue = "";
        }

        // Create a table cell and append the input element to it
        const tdValue = $('<div></div>')
        let tdKey;

        // Create a table cell for the key with a bold font and a specific width
        tdKey = $('<label class="font-montnserrat text-base text-almost-white"></label>').text(key.charAt(0).toUpperCase() + key.slice(1));

        fetchEntryField('text', teamType.displayname + "_" +key.charAt(0).toUpperCase() + key.slice(1), fieldName, 'w-64',inputValue ).then(function(field) {
            tdValue.append(field);
        });


        // Append both cells to the table row
        tr.append(tdKey).append(tdValue);

        // Append the row to the tbody
        tbody.append(tr);

    }
    const btnContainer = $('<div class="flex float-right gap-4 mt-4"></div>');

// Fetch the first button and append it to the container.
    fetchButton('button', 'btnCloseEditTeamType', 'Close', 'w-32', 'ri-close-circle-line').then(function(btnCloseEdit) {
        btnContainer.append(btnCloseEdit);

        // Only after the first button is appended, fetch the second button.
        return fetchButton('button', 'btnUpdateEditTeamType', 'Update', 'w-32', 'ri-save-line', '', '', 'Success');
    }).then(function(btnUpdateEdit) {
        btnContainer.append(btnUpdateEdit);
        editTable.append(btnContainer);
    }).then(function() {
        // Set up event handlers after all buttons have been added to the DOM.
        $('#btnUpdateEditTeamType').click(function() {
            updateTeamType(id);
        });
        $('#btnCloseEditTeamType').click(function() {
            $('#teamTypeEdit').remove();
        });
    });


    editTable.append(tbody);
    teamTypeEdit.append(editTable);
    $(triggeringElement).after(teamTypeEdit);
}

function getUsers(){
    return $.ajax({
        url: '/user/getusers',
        type: 'GET',
        success: function (data) {
            users = data;
        },

        error: function(data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            console.log("Error fetching users:", data.responseJSON);
        }
    })
}

/**
 * Updates the data of a Team
 */
function updateTeam(teamId, teamBeforeUpdate){
    const id = teamId
    const teamName = $("#editdisplayname").val() || teamBeforeUpdate.displayname;
    const teamType = $("#editteamtype_fk").val() || teamBeforeUpdate.teamtype_fk;
    const teamWeight = $("#editweight").val() || teamBeforeUpdate.weight;
    let teamManager = $("#editaccount_fk").val() || teamBeforeUpdate.account_fk;
    if(teamManager === null || teamManager === "No Manager"){
        teamManager = 0;
    }
    const discordnotificationdays = $("#editdiscordnotificationdays").val() || teamBeforeUpdate.discordnotificationdays;
    const salePercentage = $("#editsalepercentage").val() || teamBeforeUpdate.salepercentage;


    $.ajax({
        url: "/team/updateteam",
        type: "POST",
        dataType: "json",
        data: {
            id: id,
            teamName: teamName,
            teamType: teamType,
            teamWeight: teamWeight,
            teamManager: teamManager,
            discordnotificationdays: discordnotificationdays,
            salePercentage: salePercentage
        },
        success: function () {
            displaySuccess("Updated team!");
            loadTeams().then(function(data) {
                allTeams = data;
                sliceTableForPage(currentPageTeams, allTeams);
            });
        },
        error: function (data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            console.log("Error updating team:", data.responseJSON);
            displayError("Error updating Team! Try reloading the page.")
        }
    });
}

/**
 * Updates the data of a TeamType
 */
function updateTeamType(teamTypeId){
    const id = teamTypeId;
    const internalName = $("#editname").val() || teamTypeBeforeUpdate.name;
    const displayName = $("#editdisplayname").val() || teamTypeBeforeUpdate.displayname;
    $.ajax({
        url: "/teamtype/updateteamtype",
        type: "POST",
        dataType: "json",
        data: {
            id: id,
            internalName: internalName,
            displayName: displayName
        },
        success: function () {
            displaySuccess("Updated team type!");
            loadTeamTypes().then(function(data) {
                allTeamTypes = data;
                sliceTableForPage(currentPageTeams, allTeamTypes);
            });

        },
        error: function (data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            console.log("Error updating team type:", data.responseJSON);
            displayError("Error updating Team type! Try reloading the page.")
        }
    });
}

/**
 * Deletes a Team
 */
function deleteTeam(e, id) {
    const popup = new Popup("popup-containerTeamDel");
    popup.displayYesNoPopup("/res/others/alert.png", "Warning", "Are you sure you want to delete this team?", "Yes", "No", "btnTeamDelYes", "btnTeamDelNo");
    popup.open(e);
    $(document).off('click', '#btnTeamDelYes').on('click', '#btnTeamDelYes', function(e) {
        $.ajax({
            url: "/team/deleteteam",
            type: "POST",
            dataType: "json",
            data: {
                id: id
            },
            success: function () {
                displaySuccess("Deleted team!");
                loadTeams().then(function(data) {
                    allTeams = data;
                    sliceTableForPage(currentPageTeams, allTeams);
                });
                popup.close(e);
            },
            error: function (data) {
                if (data.responseJSON && data.responseJSON.redirect) {
                    window.location.href = data.responseJSON.redirect;
                }
                console.log("Error deleting team:", data.responseJSON);
                displayError("Error deleting Team! Try reloading the page.")
            }
        });
    });
    $(document).off('click', '#btnTeamDelNo').on('click', '#btnTeamDelNo', function(e) {
        popup.close(e);
    });
}

/**
 * Deletes a Team
 */
function deleteTeamType(e, id) {
    const popup = new Popup("popup-containerTeamTypeDel");
    popup.displayYesNoPopup("/res/others/alert.png", "Warning", "Are you sure you want to delete this team type?", "Yes", "No", "btnTeamTypeDelYes", "btnTeamTypeDelNo");
    popup.open(e);
    $(document).off('click', '#btnTeamTypeDelYes').on('click', '#btnTeamTypeDelYes', function(e) {
        $.ajax({
            url: "/teamtype/deleteteamtype",
            type: "POST",
            dataType: "json",
            data: {
                id: id
            },
            success: function () {
                displaySuccess("Deleted team type!");
                loadTeamTypes().then(function(data) {
                    allTeamTypes = data;
                    sliceTableForPage(currentPageTeams, allTeamTypes);
                });
                popup.close(e);
            },
            error: function (data) {
                if (data.responseJSON && data.responseJSON.redirect) {
                    window.location.href = data.responseJSON.redirect;
                }
                console.log("Error deleting team type:", data.responseJSON);
                displayError("Error deleting Team type! Try reloading the page.")
            }
        });
    });
    $(document).off('click', '#btnTeamTypeDelNo').on('click', '#btnTeamTypeDelNo', function(e) {
        popup.close(e);
    });
}