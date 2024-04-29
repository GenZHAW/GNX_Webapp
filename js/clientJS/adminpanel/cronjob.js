let cronjobDefinitions = {};
let currentNewJob;
let deleteJobPopup;

/**
 * This function is used to initialize the page.
 */
function initPage(){
    $('#saveNewJob').hide().click( function(){
        saveNewCronJob();
    });

    $('#cancelNewJob').click(function(){
        $('#addNewCronjob').toggleClass('hidden');
        clearNewJobForm();
    });

    fillCronjobDropdown();

    loadExistingCronjobs().then(function (data) {
        buildTable(data);
    });

    setupDeleteJobPopup();
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
        const tdType = $("<td></td>").text(element.displayname).addClass('hidden sm:table-cell overflow-hidden whitespace-nowrap max-w-0 truncate md:overflow-visible md:whitespace-normal sm:max-w-none sm:w-56');
        const tdName = $("<td></td>").text(element.name).addClass('overflow-hidden whitespace-nowrap max-w-0 truncate md:overflow-visible md:whitespace-normal sm:max-w-none sm:w-64');
        const tdInterval = $("<td></td>").text(element.executioninterval).addClass('hidden xl:table-cell')
        const tdButton = $("<td class='flex gap-2'></td>");
        const del = $("<a href='#' id='delJob'><i class='ri-close-line ri-lg text-error'></i></a>").click(function(e){
            $(document).off('click', '#btnDelete').on('click', '#btnDelete', function() {
                deleteCronJob(element.id);
                deleteJobPopup.close();
            });
            deleteJobPopup.open(e);
        });
        const runNow = $("<a href='#' id='runNow'><i class='ri-play-fill ri-lg text-success'></i></a>").click(function(){
            displayInfo('Running Cronjob...');
            runCronJob(element.id);
        });
        const showInfo = $("<a href='#' id='showInfo'><i class='ri-eye-line ri-lg text-turquoise'></i></a>").click(function(){
            //deleteJob(element.id);
        });

        tr.append(tdId).append(tdType).append(tdName).append(tdInterval).append(tdButton.append(showInfo).append(runNow).append(del));
        tableBody.append(tr);
    });
}

/**
 * Run a cron job immediately
 * @param id
 */
function runCronJob(id){
    $.ajax(
        {
            url: '/cronjob/runCronjob/' + id,
            type: 'GET',
            success: function (data) {
                displaySuccess(data.message);
            },
            error: function (data) {
                if (data.responseJSON && data.responseJSON.redirect) {
                    window.location.href = data.responseJSON.redirect;
                }
                displayError(data.responseJSON.message);
            }
        }
    )
}

/**
 * Delete a Job from the database
 * @param id
 */
function deleteCronJob(id){
    $.ajax(
        {
            url: '/cronjob/deleteJob/' + id,
            type: 'DELETE',
            success: function (data) {
                displaySuccess(data.message);
                loadExistingCronjobs().then(function (data) {
                    buildTable(data);
                });
            },
            error: function (data) {
                if (data.responseJSON && data.responseJSON.redirect) {
                    window.location.href = data.responseJSON.redirect;
                }
                displayError(data.responseJSON.message);
            }
        }
    )
}

/**
 * Setup for the delete job popup
 */
function setupDeleteJobPopup() {
    deleteJobPopup = new Popup("popup-containerDeleteJob");
    deleteJobPopup.displayYesNoPopup('/res/others/alert.png', 'Delete Cronjob', 'Are you sure you want to delete this Cronjob?', 'Yes', 'No', 'btnDelete', 'btnCancel');

    $(document).off('click', '#btnCancel').on('click', '#btnCancel', function() {
        deleteJobPopup.close();
    });
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
 * Clears the new job form
 */
function clearNewJobForm(){
    $('#configGUIContent').empty();
    $('#configGUI').toggleClass('hidden');

    $('#execMins').val('*');
    $('#execHrs').val('*');
    $('#execDays').val('*');
    $('#execMonth').val('*');
    $('#execDOWeek').val('*');

    $('#jobType').val('undefined');

    $('#name').val('');
}

/**
 * Stores a new cronjob in the database
 */
function saveNewCronJob(){
    const config = currentNewJob.configfields.split(',');

    let configData = {};
    config.forEach(field => {
        configData[field] = $('#' + field).val();
    });

    //Fetch the Execution Interval
    configData['executioninterval'] = $('#execMins').val() + ' ' + $('#execHrs').val() + ' ' + $('#execDays').val() + ' ' + $('#execMonth').val() + ' ' + $('#execDOWeek').val();
    configData['name'] = $('#name').val();

    $.ajax({
        url: '/cronjob/saveNewCronjob',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            jobId: currentNewJob.id,
            config: configData
        }),
        success: function(response) {
            displaySuccess("Cron Job saved successfully.");
            $('#addNewCronjob').toggleClass('hidden');
            clearNewJobForm()
            loadExistingCronjobs().then(function (data) {
                buildTable(data);
            });
        },
        error: function(xhr, status, error) {
            displayError("Failed to save Cron Job: " + xhr.responseText);
        }
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

    currentNewJob = cronjobDefinition;

    const config = cronjobDefinition.configfields.split(',');

    config.forEach(function (element) {
       switch (element) {
           case 'discordchannelid':
                buildEntryField(configGUIContent, 'Discord Channel Id', 'discordchannelid', 'number');
                break;
           case 'team_fk':
                getTeamOptions().then(function (options) {
                    buildDropdownField(configGUIContent, 'Team', 'team_fk', options, 'Choose a Team');
                });
                break;
           case 'timeframe':
               buildEntryField(configGUIContent, 'Timeframe', 'timeframe', 'number', 'How many days should be considered');
               break;
           case 'minsoloqgames':
               buildEntryField(configGUIContent, 'Min. Solo Q', 'minsoloqgames', 'number', 'How many solo q games are required');
               break;
           case 'minflexqgames':
               buildEntryField(configGUIContent, 'Min. Flex Q', 'minflexqgames', 'number', 'How many flex games are required');
               break;
           case 'mindeathmatchgames':
               buildEntryField(configGUIContent, 'Min. Deathmatches', 'mindeathmatchgames', 'number', 'How many deathmatches are required');
               break;
           case 'mincompetitivegames':
               buildEntryField(configGUIContent, 'Min. Competitive', 'mincompetitivegames', 'number', 'How many competitive games are required');
               break;
       }
    });
}

/**
 * Build the config GUI for an entry field
 */
function buildEntryField(parentElement, title, id, entryType = 'text', subtitle = ''){
    const mainDiv = $('<div class="flex flex-col"></div>');
    const titleClasses = subtitle !== '' ? 'mt-4' : 'mt-4 mb-2';
    const titleP = $(`<p class="font-semibold font-montserrat text-md text-almost-white ${titleClasses}">${title}</p>`);
    mainDiv.append(titleP);

    if (subtitle !== ''){
        const subtitleP = $(`<p class="font-montserrat text-sm text-almost-white mb-2">${subtitle}</p>`);
        mainDiv.append(subtitleP);
    }

    $.when(
        fetchEntryField(entryType, id, id, 'w-60', '')
    ).then(function (field1) {
        mainDiv.append(field1);

        parentElement.append(mainDiv);
    });
}

/**
 * Build the config GUI to insert a team id
 */
function buildDropdownField(parentElement, title, id, options, defaultOption){
    const mainDiv = $('<div class="flex flex-col w-60"></div>');
    const titleP = $(`<p class="font-semibold font-montserrat text-md text-almost-white mt-4 mb-2">${title}</p>`);

    mainDiv.append(titleP);

    $.when(
        fetchDropdown(id, 'w-60', JSON.stringify(options), defaultOption)
    ).then(function (field1) {
        mainDiv.append(field1);

        parentElement.append(mainDiv);
    });


}

/**
 * Fetches the team options from the server
 */
function getTeamOptions(){
    return new Promise(function (resolve, reject) {
        $.ajax({
            url: '/team/getteams',
            type: 'GET',
            success: function (data) {
                let options = data.map(function(item) {
                    return { value: item.id, text: item.displayname };
                });

                resolve(options);
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