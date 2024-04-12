let cronjobDefinitions = {};

/**
 * This function is used to initialize the page.
 */
function initPage(){
    fillCronjobDropdown();

    loadExistingCronjobs().then(function (data) {
        buildTable(data);
    });
}

/**
 * Builds the table with the cronjobs
 * @param data
 */
function buildTable(data){
    let tableBody = $('#cronData');
    tableBody.empty();

    data.forEach(function (element) {
        const tr = $("<tr></tr>");
        const tdId = $("<td></td>").text(element.id)
        const tdType = $("<td></td>").text(element.displayname);
        const tdInterval = $("<td></td>").text(element.executioninterval)
        const tdButton = $("<td class='flex gap-2'></td>");
        const del = $("<a href='#' id='delJob'><i class='ri-close-line ri-lg text-error'></i></a>").click(function(){
            //deleteJob(element.id);
        });
        const runNow = $("<a href='#' id='runNow'><i class='ri-play-fill ri-lg text-success'></i></a>").click(function(){
            //deleteJob(element.id);
        });
        const showInfo = $("<a href='#' id='showInfo'><i class='ri-eye-line ri-lg text-turquoise'></i></a>").click(function(){
            //deleteJob(element.id);
        });

        tr.append(tdId).append(tdType).append(tdInterval).append(tdButton.append(showInfo).append(runNow).append(del));
        tableBody.append(tr);
    });

    console.log(data);
}

/**
 * Loads all existing cronjobs from the server
 */
function loadExistingCronjobs(){
    return new Promise(function (resolve, reject) {
        $.ajax({
            url: '/cronjob/getCronjobs',
            type: 'GET',
            success: function (data) {
                resolve(data);
            },
            error: function (data) {
                if (data.responseJSON && data.responseJSON.redirect) {
                    window.location.href = data.responseJSON.redirect;
                }
                displayError(data.responseJSON.message);
                reject(data);
            }
        });
    });
}

/**
 * This function is used to build the GUI for the selected cronjob
 * @param cronjobId
 */
function buildConfigGUI(cronjobId){
    $("#configGUI").removeClass('hidden')
    const configGUIContent = $('#configGUIContent');
    configGUIContent.empty();

    const cronjobDefinition = cronjobDefinitions.find(function (element) {
        return element.id == cronjobId;
    });

    const config = cronjobDefinition.configfields.split(',');

    config.forEach(function (element) {
       switch (element) {
           case 'discordchannelid':
                buildDiscordChannelIdGUI(configGUIContent);
                break;
           case 'team_fk':
                buildTeamIdGUI(configGUIContent);
                break;
       }
    });
}

/**
 * Build the config GUI to insert a discord channel id
 */
function buildDiscordChannelIdGUI(parentElement){
    const mainDiv = $('<div class="flex flex-col"></div>');
    const title = $('<p class="font-semibold font-montserrat text-md text-almost-white mt-4 mb-2">Discord Channel Id</p>');

    mainDiv.append(title);

    $.when(
        fetchEntryField('text', 'discordchannelid', 'discordchannelid', 'w-60', ''),
    ).then(function (field1) {
        mainDiv.append(field1);

        parentElement.append(mainDiv);
    });
}

/**
 * Build the config GUI to insert a team id
 */
function buildTeamIdGUI(parentElement){
    const mainDiv = $('<div class="flex flex-col w-60"></div>');
    const title = $('<p class="font-semibold font-montserrat text-md text-almost-white mt-4 mb-2">Team</p>');

    mainDiv.append(title);

    $.ajax({
        url: '/team/getteams',
        type: 'GET',
        success: function (data) {
            let options = data.map(function(item) {
                return { value: item.id, text: item.displayname };
            });
            $.when(
                fetchDropdown('text', 'w-60', JSON.stringify(options), 'Choose a Team')
            ).then(function (field1) {
                mainDiv.append(field1);

                parentElement.append(mainDiv);
            });
        },
        error: function (data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            displayError(data.responseJSON.message);
        }
    });
}

/**
 * This function fills the dropdown with all available cronjobs
 */
function fillCronjobDropdown(){
    $.ajax({
        url: '/cronjob/getDefinitions',
        type: 'GET',
        success: function (data) {
            const dropdown = $('#jobType');
            dropdown.empty();
            dropdown.append('<option value="undefined">Please select a Job</option>');
            data.forEach(function (element) {
                dropdown.append(`<option value="${element.id}">${element.displayname}</option>`);
            });

            cronjobDefinitions = data;
        },
        error: function (data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            displayError(data.responseJSON.message);
        }
    });
}