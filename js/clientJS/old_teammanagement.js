dataAccessors = {
    team: [],
    teamType: [],
    get teamData(){
        return this.team
    },

    get teamTypeData(){
        return this.teamType
    },

    set teamData(data){
        this.team = data
    },
    set teamTypeData(data){
        this.teamType = data
    }
}

let teamPager;
let teamTypePager;

/**
 * This method sets up the pagination for the team table and teamType table
 */
function setupPagination() {
    teamPager = $("#teamPager").anyPaginator({
        itemsPerPage: 5,
        mode: 1,
        hideGoto: true,
        prevText: "&lsaquo; Previous",
        nextText: "Next &rsaquo;",
        hideIfOne: false,
        onClick: buildTeamTable,
    });

    teamPager.numItems(dataAccessors.teamData.length)
    buildTeamTable()

    teamTypePager = $("#teamTypePager").anyPaginator({
        itemsPerPage: 5,
        mode: 1,
        hideGoto: true,
        prevText: "&lsaquo; Previous",
        nextText: "Next &rsaquo;",
        hideIfOne: false,
        onClick: buildTeamTypeTable,
    });

    teamTypePager.numItems(dataAccessors.teamTypeData.length)
    buildTeamTypeTable()
}

/**
 * This method sets up the whole teammanagement page by creating the popups and loading the teams and teamtypes.
 * It also initializes the buttons.
 */
async function setup() {
    //Create Popups for Team / Type Creation
    const popupTeam = new Popup("popup-containerTeam");
    const popupTeamType = new Popup("popup-containerTeamType");

    await loadTeams();
    await loadTeamTypes();

    popupTeam.displayInputPopupCustom("/res/others/plus.png", "Create Team", "Create", "btnCreateTeam",
        `<label for="TeamName" class="input-label">Name</label>` +
        `<input type="text" id="teamName" class="input-field"/>` +
        `<label for="teamType" class="input-label">Type</label>` +
        `<select id="teamType" class="input-field">` +
        getTeamTypeOptions() +
        `</select>` +
        `<label for="teamWeight" class="input-label">Weight</label>` +
        `<input type="number" id="teamWeight" class="input-field"/>`
    )

    popupTeamType.displayInputPopupCustom("/res/others/plus.png", "Create Team Type", "Create", "btnCreateTeamType",
        `<label for="TeamTypeName" class="input-label">Internal Name</label>` +
        `<input type="text" id="teamTypeName" class="input-field"/>` +
        `<label for="teamTypeDisplayName" class="input-label">Display Name</label>` +
        `<input type="text" id="teamTypeDisplayName" class="input-field"/>`
    )

    $("#newTeam").click(function (e) {
        popupTeam.open(e);
    });

    $("#newTeamType").click(function (e) {
        popupTeamType.open(e);
    });

    $("#btnCreateTeam").click(function (e) {
        createTeam(e, popupTeam);
    });

    $("#btnCreateTeamType").click(function (e) {
        createTeamType(e, popupTeamType);
    });

    setupPagination();
}

/**
 * This method loads the Teams into the data accessor
 */
async function loadTeams() {
    await $.ajax({
        url: "/team/getteams",
        type: "GET",
        dataType: "json",
        cache: false,
        success: function (data) {
            dataAccessors.teamData = data;
        },
        error: function (data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            console.log(data);
        }
    });
}

/**
 * This method loads the TeamTypes into the data accessor
 */
async function loadTeamTypes() {
    await $.ajax({
        url: "/teamtype/getteamtypes",
        type: "GET",
        dataType: "json",
        cache: false,
        success: function (data) {
            dataAccessors.teamTypeData = data;
        },
        error: function (data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            console.log(data);
        }
    });
}

/**
 * This method builds the TeamTypeTable
 */
async function buildTeamTable() {
    await loadTeams()
    teamPager.numItems(dataAccessors.teamData.length)

    //Correct currentPage if page is empty.
    if(teamPager.currentPage() > teamPager.numPages()){
        teamPager.currentPage(teamPager.numPages())
    }


    const tableBody = $("#teamData");
    tableBody.empty();

    let start = (teamPager.currentPage() - 1) * teamPager.options.itemsPerPage;
    let stop = start + teamPager.options.itemsPerPage - 1;


    for (let i = start; i <= stop; i++) {
        team = dataAccessors.teamData[i];
        if (!team) break;

        const tr = $("<tr></tr>");
        const tdInternalName = $("<td></td>").text(team.displayname);
        const tdType = $("<td></td>").text(dataAccessors.teamTypeData.find((teamtype) => teamtype.id === team.teamtype_fk).displayname);
        const tdWeight = $("<td></td>").text(team.weight);

        const tdButton = $("<td></td>");
        const button = $("<button></button>");
        button.addClass("default purple table-btn");
        button.append($("<i></i>").addClass("ri-file-edit-line").addClass("ri-2x"));

        button.on("click", function () {
            const row = $(this).closest("tr");
            const name = row.find("td:first").text();

            editTeam(name);
        });

        tdButton.append(button);

        tr.append(tdInternalName).append(tdType).append(tdWeight).append(tdButton);
        tableBody.append(tr);
    }
}

/**
 * This method builds the TeamTypeTable
 */
async function buildTeamTypeTable() {
    await loadTeamTypes();
    teamTypePager.numItems(dataAccessors.teamTypeData.length)

    //Correct currentPage if page is empty.
    if(teamTypePager.currentPage() > teamTypePager.numPages()){
        teamTypePager.currentPage(teamTypePager.numPages())
    }

    const tableBody = $("#teamTypeData");
    tableBody.empty();

    let start = (teamTypePager.currentPage() - 1) * teamTypePager.options.itemsPerPage + 1;
    let stop = start + teamTypePager.options.itemsPerPage - 1;

    for (let i = start; i <= stop; i++) {
        teamType = dataAccessors.teamTypeData[i];
        if (!teamType) break;

        const tr = $("<tr></tr>");
        const tdInternalName = $("<td></td>").text(teamType.name);
        const tdDisplayName = $("<td></td>").text(teamType.displayname);

        const tdButton = $("<td></td>");
        const button = $("<button></button>");
        button.addClass("default purple table-btn");
        button.append($("<i></i>").addClass("ri-file-edit-line").addClass("ri-2x"));

        button.on("click", function () {
            const row = $(this).closest("tr");
            const name = row.find("td:first").text();

            editTeamType(name);
        });

        tdButton.append(button);

        tr.append(tdInternalName).append(tdDisplayName).append(tdButton);
        tableBody.append(tr);
    }
}
/**
 * Creates a new Team
 */
async function createTeam(e, popupTeam) {
    const teamName = $("#teamName").val();
    const teamType = $("#teamType").val();
    const teamWeight = $("#teamWeight").val();

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
/**
 * Edits the data of a Team
 */
function editTeamType(name) {
    const teamType = dataAccessors.teamTypeData.find((teamType) => teamType.name === name);
    if (teamType) {
        // Show the edit box
        $("#teamTypeEdit").show();

        // Fill in the input values
        $("#internalName").val(teamType.name === "-" ? "" : teamType.name);
        $("#displayName").val(teamType.displayname === "-" ? "" : teamType.displayname);
        $("#teamTypeId").val(teamType.id);
    }
}
/**
 * Edits the data of a Team
 */
function editTeam(name) {
    const team = dataAccessors.teamData.find((team) => team.displayname === name);
    const teamTypeId = dataAccessors.teamTypeData.find((teamtype) => teamtype.id === team.teamtype_fk).id
    if (team) {
        // Show the edit box
        $("#teamEdit").show();

        // Fill in the input values
        $("#name").val(team.displayname === "-" ? "" : team.displayname);
        const typeSelect = $("#type");
        typeSelect.empty(); // Remove existing options
        typeSelect.append(getTeamTypeOptions()); // Add new options
        typeSelect.val(teamTypeId);

        $("#weight").val(team.weight === "-" ? "" : team.weight);
        $("#teamId").val(team.id);
        $("#discordnotificationdays").val(team.discordnotificationdays);

        loadTeamManagerOptions().then(() => {
            if(!team.account_fk){
                team.account_fk = 0;
            }
            $("#teammanagerDropdown").val(team.account_fk);
        });
    }
}

function getTeamTypeOptions() {
    let options = "";
    dataAccessors.teamTypeData.forEach(function (teamType) {
        options += `<option value="${teamType.id}">${teamType.displayname}</option>`;
    });
    return options;
}
/**
 * Deletes a Team
 */
function deleteTeam(e, id) {
    const popup = new Popup("popup-containerTeamDel");
    popup.displayYesNoPopup("/res/others/alert.png", "Warning", "Are you sure you want to delete this team?", "Yes", "No", "btnTeamDelYes", "btnTeamDelNo");
    popup.open(e);

    $("#btnTeamDelYes").click(function (e) {
        $.ajax({
            url: "/team/deleteteam",
            type: "POST",
            dataType: "json",
            data: {
                id: id
            },
            success: function () {
                displaySuccess("Deleted team!");
                popup.close(e);
                $("#teamEdit").hide();
                buildTeamTable()
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

    $("#btnTeamDelNo").click(function (e) {
        popup.close(e);
    });
}
/**
 * Updates the data of a Team
 */
function updateTeam(){
    const id = $("#teamId").val();
    const teamName = $("#name").val();
    const teamType = $("#type").val();
    const teamWeight = $("#weight").val();
    const teamManager = $("#teammanagerDropdown").val();
    const discordnotificationdays = $("#discordnotificationdays").val();

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
            discordnotificationdays: discordnotificationdays
        },
        success: function () {
            loadTeams();
            displaySuccess("Updated team!");
            $("#teamEdit").hide();
            buildTeamTable()
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
function updateTeamType(){
    const id = $("#teamTypeId").val();
    const internalName = $("#internalName").val();
    const displayName = $("#displayName").val();

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
            loadTeamTypes();
            displaySuccess("Updated team type!");
            $("#teamTypeEdit").hide();
            buildTeamTypeTable()
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
 * Loads  all options for the team manager
 */
function loadTeamManagerOptions(){
    return new Promise((resolve) => {
        $.ajax({
            url: '/user/getUsers',
            type: "GET",
            data: {
                minimalData: true
            },
            dataType: "json",
            error: function(data){
                if (data.responseJSON && data.responseJSON.redirect) {
                    window.location.href = data.responseJSON.redirect;
                }
            }
        }).then((data) => {
            const managerOptions = $('#teammanagerDropdown');
            managerOptions.empty();

            const option = $('<option></option>').attr('value', 0).text('No Teammanager');
            managerOptions.append(option);

            data.forEach(function (user) {
                const option = $('<option></option>').attr('value', user.id).text(user.username);
                managerOptions.append(option);
            });

            resolve();
        });
    });
}