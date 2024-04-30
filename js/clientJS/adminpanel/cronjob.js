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

    fillCronjobDropdown(function() {
        loadExistingCronjobs().then(function (data) {
            buildTable(data).then(r => {
                toggleLoadingVisibility();
            });
        });
    });

    setupDeleteJobPopup();
}

/**
 * Builds the table with the cronjobs
 * @param data
 */
async function buildTable(data) {
    let tableBody = $('#cronData');
    tableBody.empty();

    for (const element of data) {
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };

        const formatter = new Intl.DateTimeFormat('de-DE', options);
        const lastExecTime = formatter.format(new Date(element.lastexectime)).replace(',', '');

        const tr = $("<tr></tr>");
        const tdId = $("<td></td>").text(element.id)
        const tdType = $("<td></td>").text(element.displayname).addClass('hidden sm:table-cell overflow-hidden whitespace-nowrap max-w-0 truncate md:overflow-visible md:whitespace-normal sm:max-w-none sm:w-56');
        const tdName = $("<td></td>").text(element.name).addClass('overflow-hidden whitespace-nowrap max-w-0 truncate md:overflow-visible md:whitespace-normal sm:max-w-none sm:w-64');
        const tdInterval = $("<td></td>").text(element.executioninterval).addClass('hidden xl:table-cell')
        const tdExec = $("<td></td>").text(lastExecTime).addClass('hidden xl:table-cell')
        const tdButton = $("<td class='flex gap-2'></td>");
        const del = $("<a href='#' id='delJob'><i class='ri-close-line ri-lg text-error'></i></a>").click(function (e) {
            $(document).off('click', '#btnDelete').on('click', '#btnDelete', function () {
                deleteCronJob(element.id);
                deleteJobPopup.close();
            });
            deleteJobPopup.open(e);
        });
        const runNow = $("<a href='#' id='runNow'><i class='ri-play-fill ri-lg text-success'></i></a>").click(function () {
            displayInfo('Running Cronjob...');
            runCronJob(element.id);
        });
        const showInfo = $("<a href='#' id='showInfo'><i class='ri-eye-line ri-lg text-turquoise'></i></a>").click(function () {
            const form = $(this).closest("tr").next(".editForm");
            form.toggleClass('hidden');
        });

        const cronjobDefinition = cronjobDefinitions.find(function (definition) {
            return definition.id == element.cronjobdefinition_fk;
        });

        tr.append(tdId).append(tdType).append(tdName).append(tdInterval).append(tdExec).append(tdButton.append(showInfo).append(runNow).append(del));
        tableBody.append(tr);
        tableBody.append(await buildEditGUI(element, cronjobDefinition));
    }
}

/**
 * This function is used to update a cronjob in the database
 * @param element
 */
function updateCronJob(element){
    const cronjobDefinition = cronjobDefinitions.find(function (definition) {
        return definition.id == element.cronjobdefinition_fk;
    });

    const configFields = cronjobDefinition.configfields.split(',');

    let configData = {
        name: $(`#name-${element.id}`).val(),
        executioninterval: $(`#execInterval-${element.id}`).val()
    };

    // Loop through each config field and update the configData object with values from form
    configFields.forEach(field => {
        let fieldValue = $(`#${field}-${element.id}`).val();
        if (fieldValue !== undefined) {
            configData[field] = fieldValue;
        }
    });

    $.ajax({
        url: '/cronjob/updateCronjob/' + element.id,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            config: configData
        }),
        success: function(response) {
            displaySuccess("Cron Job updated successfully.");
            toggleLoadingVisibility()
            loadExistingCronjobs().then(function (data) {
                buildTable(data).then(r => {
                    toggleLoadingVisibility();
                });
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
 * This function is used to toggle the visibility of the loading spinner and the table
 */
function toggleLoadingVisibility() {
    $('#loading').toggleClass('hidden');
    $('#cronList').toggleClass('hidden');
}

/**
 * This function is used to build the GUI for editing a cronjob
 * @param element
 * @param cronjobDefinition
 */
async function buildEditGUI(element, cronjobDefinition) {
    const trEdit = $("<tr class='editForm hidden'></tr>");
    const tdEdit = $("<td colspan='6' ></td>")
    const divEdit = $("<div class='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4'></div>")

    const config = cronjobDefinition.configfields.split(',');
    await buildEntryField(divEdit, 'Name', `name-${element.id}`, `text`, 'The name of the cronjob', element.name)
    await buildEntryField(divEdit, 'Execution Interval', `execInterval-${element.id}`, 'text', 'Execution Interval of the cronjob', element.executioninterval)

    for (const element1 of config) {
        switch (element1) {
            case 'discordchannelid':
                await buildEntryField(divEdit, 'Discord Channel Id', `discordchannelid-${element.id}`, 'number', 'The id of the discord channel', element.discordchannelid);
                break;
            case 'team_fk':
                const options = await getTeamOptions();
                await buildDropdownField(divEdit, 'Team', `team_fk-${element.id}`, options, 'Choose a Team', 'The team that should be considered', element.team_fk);
                break;
            case 'timeframe':
                await buildEntryField(divEdit, 'Timeframe', `timeframe-${element.id}`, 'number', 'How many days should be considered', element.timeframe);
                break;
            case 'minsoloqgames':
                await buildEntryField(divEdit, 'Min. Solo Q', `minsoloqgames-${element.id}`, 'number', 'How many solo q games are required', element.minsoloqgames);
                break;
            case 'minflexqgames':
                await buildEntryField(divEdit, 'Min. Flex Q', `minflexqgames-${element.id}`, 'number', 'How many flex games are required', element.minflexqgames);
                break;
            case 'mindeathmatchgames':
                await buildEntryField(divEdit, 'Min. Deathmatches', `mindeathmatchgames-${element.id}`, 'number', 'How many deathmatches are required', element.mindeathmatchgames);
                break;
            case 'mincompetitivegames':
                await buildEntryField(divEdit, 'Min. Competitive', `mincompetitivegames-${element.id}`, 'number', 'How many competitive games are required', element.mincompetitivegames);
                break;
        }
    }

    const btnDiv = $("<div class='w-full flex justify-end pb-4'></div>")
    const btnId = `btnUpdate-${element.id}`;
    const btn = await fetchButton('button', btnId,'Save', undefined,'ri-check-line','mt-6',undefined,'Success')

    tdEdit.append(divEdit).append(btnDiv.append(btn));
    trEdit.append(tdEdit);

    $("#cronData").off("click", `#${btnId}`).on("click", `#${btnId}`, function() {
        updateCronJob(element);
    });

    return trEdit;
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
                toggleLoadingVisibility()
                loadExistingCronjobs().then(function (data) {
                    buildTable(data).then(r => {
                        toggleLoadingVisibility()
                    });
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
            toggleLoadingVisibility()
            loadExistingCronjobs().then(function (data) {
                buildTable(data).then(r => {
                    toggleLoadingVisibility();
                });
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
async function buildConfigGUI(cronjobId) {
    $("#configGUI").removeClass('hidden')
    const configGUIContent = $('#configGUIContent');
    configGUIContent.empty();

    const cronjobDefinition = cronjobDefinitions.find(function (element) {
        return element.id == cronjobId;
    });

    currentNewJob = cronjobDefinition;

    const config = cronjobDefinition.configfields.split(',');
    const div = $("<div class='w-80'></div>")

    for (const element of config) {
        switch (element) {
            case 'discordchannelid':
                await buildEntryField(div, 'Discord Channel Id', 'discordchannelid', 'number');
                break;
            case 'team_fk':
                const teamOptions = await getTeamOptions();
                await buildDropdownField(div, 'Team', 'team_fk', teamOptions, 'Choose a Team');
                break;
            case 'timeframe':
                await buildEntryField(div, 'Timeframe', 'timeframe', 'number', 'How many days should be considered');
                break;
            case 'minsoloqgames':
                await buildEntryField(div, 'Min. Solo Q', 'minsoloqgames', 'number', 'How many solo q games are required');
                break;
            case 'minflexqgames':
                await buildEntryField(div, 'Min. Flex Q', 'minflexqgames', 'number', 'How many flex games are required');
                break;
            case 'mindeathmatchgames':
                await buildEntryField(div, 'Min. Deathmatches', 'mindeathmatchgames', 'number', 'How many deathmatches are required');
                break;
            case 'mincompetitivegames':
                await buildEntryField(div, 'Min. Competitive', 'mincompetitivegames', 'number', 'How many competitive games are required');
                break;
        }
    }

    configGUIContent.append(div);
}

/**
 * Build the config GUI for an entry field
 */
async function buildEntryField(parentElement, title, id, entryType = 'text', subtitle = '', value) {
    const mainDiv = $('<div class="flex flex-col"></div>');
    const titleClasses = subtitle !== '' ? 'mt-4' : 'mt-4 mb-2';
    const titleP = $(`<p class="font-semibold font-montserrat text-md text-almost-white ${titleClasses}">${title}</p>`);
    mainDiv.append(titleP);

    if (subtitle !== '') {
        const subtitleP = $(`<p class="font-montserrat text-sm text-almost-white mb-2 overflow-hidden truncate">${subtitle}</p>`);
        mainDiv.append(subtitleP);
    }

    const field1 = await fetchEntryField(entryType, id, id, 'w-full', value);
    mainDiv.append(field1);
    parentElement.append(mainDiv);
}

/**
 * Build the config GUI to insert a team id
 */
async function buildDropdownField(parentElement, title, id, options, defaultOption, subtitle = '', value) {
    const mainDiv = $('<div class="flex flex-col w-72"></div>');
    const titleClasses = subtitle !== '' ? 'mt-4' : 'mt-4 mb-2';
    const titleP = $(`<p class="font-semibold font-montserrat text-md text-almost-white ${titleClasses}">${title}</p>`);

    mainDiv.append(titleP);

    if (subtitle !== '') {
        const subtitleP = $(`<p class="font-montserrat text-sm text-almost-white mb-2 overflow-hidden truncate">${subtitle}</p>`);
        mainDiv.append(subtitleP);
    }

    const field1 = await fetchDropdown(id, 'w-72', JSON.stringify(options), defaultOption)
    mainDiv.append(field1);
    waitForElement(`#${id}`, () => {
        $(`#${id}`).val(value)
    })
    parentElement.append(mainDiv);
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
function fillCronjobDropdown(callback) {
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
            if (callback) callback();
        },
        error: function (data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            displayError(data.responseJSON.message);
        }
    });
}