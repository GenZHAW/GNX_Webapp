/**
 * @fileoverview This file contains the javascript code for the team calendar page
 */
const daysOfWeek = ["Filler", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
let clipboard = null;
let trainingsToBeDefined = null;
let teamId = 0;

/**
 * Format a date object into a string with the format dd.mm.yyyy
 * @param date
 * @returns {string}
 */
function formatDate(date) {
    // get the day, month, and year of the date object
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
}

/**
 * Get the monday of the week of the given date
 * @param dateString the date as a string
 * @returns {Date} the monday of the week of the given date
 */
function getMondayOfWeek(dateString) {
    const date = new Date(dateString);
    let day = date.getDay();
    if (day === 0) {
        day = 7;
    }
    const diff = date.getDate() - day + 1;

    return new Date(date.setDate(diff));
}

/**
 * Get the sunday of the week of the given date
 * @param dateString
 * @returns {Date} the sunday of the week of the given date
 */
function getSundayOfCurrentWeek(dateString) {
    const fDay = getMondayOfWeek(dateString);
    const lDay = new Date(fDay);
    lDay.setDate(lDay.getDate() + 6);

    return lDay
}

/**
 * Get the date of a given day in the week of the given date with the given offset
 * @param dateString the date as a string
 * @param offset how many days to add to the monday of the week of the given date
 * @returns {Date}  the date of the given day in the week of the given date with the given offset
 */
function getXDayOfWeek(dateString, offset) {
    const fDay = getMondayOfWeek(dateString);
    const lDay = new Date(fDay);
    lDay.setDate(lDay.getDate() + offset);
    lDay.setHours(23, 59, 59);

    return lDay
}

/**
 * Retunrs the date based on a week day (e.g. monday, tuesday, etc.) and the current week we are in
 * @param date the current week we are in
 * @param dayOfWeek the week day (e.g. monday, tuesday, etc.)
 * @returns {string} the date based on a week day (e.g. monday, tuesday, etc.) and the current week we are in
 */
function getDateFromDay(date, dayOfWeek) {
    if (dayOfWeek === "") return "";
    return formatDate(getXDayOfWeek(date, daysOfWeek.indexOf(dayOfWeek) - 1));
}

/**
 * Main  function which generates and prints the calendar
 * @param users the users of the team for which a row is generated
 * @param currentDate the current date (is the start date of the calendar)
 * @param sessionUser the user who is currently logged in
 * @param lTeamId the id of the team
 * @param teamManagerId the id of the team manager
 * @param isAdmin
 * @returns {Promise<void>}
 */
async function generateCalendar(users, currentDate, sessionUser, lTeamId, teamManagerId, isAdmin) {
    const today = new Date();
    teamId = lTeamId;

    //Creates the header of the table
    const calHeader = $("#calHeader");
    calHeader.empty();

    daysOfWeek.forEach(function(day) {
        const dateStr = getDateFromDay(currentDate, day);
        const isToday = dateStr === formatDate(new Date());
        const headerClass = isToday ? "bg-turquoise" : "";
        const isHidden = day === 'Filler' ? "opacity-0" : "";

        // Create the <th> element
        let th = $("<th></th>", {
            "scope": "col",
            "class": "px-7 border-8 border-grey-level1 py-4 bg-grey-level2 " + headerClass + " " + isHidden,
            "html": day + "<br><span class='text-base mt-1 block font-normal'>" + dateStr + "</span>"
        });

        calHeader.append(th);
    });

    //Set the current Week text
    $("#currentWeekText").text("Week " + formatDate(getMondayOfWeek(currentDate)) + " - " + formatDate(getSundayOfCurrentWeek(currentDate)));

    //Load data from monday to sunday
    const teamData = await getDataFromTeam(getMondayOfWeek(currentDate), getSundayOfCurrentWeek(currentDate), lTeamId)

    //Sort users based on calendar order
    for (let x = 0; x < users.length; x++) {
        users[x].calendarorder = users.length - x
    }

    //Generate the rows for each user
    const calContainer = $("#calBody");
    calContainer.empty();
    const numRows = users.length;
    const numCols = 8;

    //Data to iterate over
    let data = {
        actionIcons: [
            { href: "#", iconClass: "ri-edit-line", id: "edit" },
            { href: "#", iconClass: "ri-clipboard-line", id: "copy" },
            { href: "#", iconClass: "ri-file-copy-2-line", id: "paste" }
        ],
        statusImgSrc: "images/ok.png",
        statusText: ""
    };

    for (let i = 0; i < numRows; i++) {
        // Generate the <tr> element
        let tr = $("<tr></tr>", {
            "class": "border-b-8 border-grey-level1",
            "data-userid": users[i].userid  // Store the user's ID in the row
        });

        for (let j = 0; j < numCols; j++) {

            if (j === 0) {
                // Special Case: 1st column with username
                let userImage = users[i].thumbnail ? users[i].thumbnail : "/res/others/blank_profile_picture.png";

                let crownHtml = '';
                if (users[i].userid === teamManagerId) {
                    crownHtml = '<img src="/res/others/crown.png" alt="Team Manager" class="w-5">';
                }

                let tdUser = $("<td></td>", {
                    "scope": "row",
                    "class": "px-6 py-2 bg-grey-level2 h-[130px]",
                    "html": `<div class="flex items-center flex-col text-center">
                            <div class="flex flex-col items-center">
                                ${crownHtml}
                                <img src="${userImage}" alt="Picture of user ${users[i].username}" class="rounded-full w-12">
                            </div>
                            <h6 class="text-lg mt-2 font-montserrat text-white text-center font-bold">${users[i].username}</h6>
                         </div>`
                });

                tr.append(tdUser);
            } else {
                //Search Data for the current user and date
                const dateOrg = new Date(getXDayOfWeek(currentDate, j - 1));
                const epoch = Math.floor(new Date(dateOrg.getFullYear(), dateOrg.getMonth(), dateOrg.getDate()).getTime() / 1000);

                const presenceData = teamData.find(record => record.date == epoch && record.username == users[i].username);

                //Get the correct picture
                switch (presenceData?.state) {
                    case 0: //Present
                        data.statusImgSrc = "/res/teamcalendar/present.png";
                        data.statusText = `${presenceData.from} <br>-<br> ${presenceData.until}`;
                        break;
                    case 1: //Open
                        data.statusImgSrc = "/res/teamcalendar/present.png";
                        data.statusText = "";
                        break;
                    case 2: //Absent
                        data.statusImgSrc = "/res/teamcalendar/absent.png";
                        data.statusText = presenceData.comment;
                        break;
                    case 3: //Unsure
                        data.statusImgSrc = "/res/teamcalendar/unsure.png";
                        data.statusText = presenceData.comment;
                        break;
                    default: //No Data
                        data.statusImgSrc = "";
                        data.statusText = "No Data";
                }

                // All other columns
                let tdActions = $("<td></td>").addClass("px-3 py-4 bg-grey-level2").attr("date", presenceData ? formatDate(new Date(presenceData.date * 1000)) : formatDate(dateOrg));
                let divRelative = $("<div></div>").addClass("relative");
                let ulIcons = $("<ul></ul>").addClass("text-end");

                data.actionIcons.forEach(function (icon) {
                    if((icon.id !== 'edit' && icon.id !== 'paste' || dateOrg.getTime() >= today.getTime()) && (users[i].username === sessionUser  || isAdmin)) {
                        let a = $("<a></a>").attr("href", icon.href);
                        let i = $("<i></i>").addClass(`${icon.iconClass} font-normal text-sm text-white ${icon.id}`);
                        a.append(i); // Append the icon to the link
                        let li = $("<li></li>").append(a); // Append the link to the list item
                        ulIcons.append(li); // Append the list item to the unordered list
                    }
                });

                if(dateOrg.getTime() < today.getTime()){
                    ulIcons.append($("<li><div class='h-10'></div></li>"));
                }

                let text = $("<p>" + data.statusText + "</p>").addClass("text-base text-center absolute top-1/2 left-1/2 -translate-x-1/2 z-10 -translate-y-1/2 text-white font-montserrat font-semibold");

                // Overlay div for image
                let divImageOverlay = $("<div></div>").addClass("absolute w-[95px] h-[95px] top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2");
                let img = $("<img>").attr({
                    "src": data.statusImgSrc,
                    "class": "opacity-40"
                });
                divImageOverlay.append(img);

                divRelative.append(divImageOverlay);
                divRelative.append(text);
                divRelative.append(ulIcons);
                tdActions.append(divRelative);
                tr.append(tdActions);
            }
        }
        calContainer.append(tr);
    }

    registerActionIcons();

    //Make the Calendar draggable
    calContainer.find('tr').each(function() {
        this.setAttribute('draggable', true);
        this.addEventListener('dragstart', dragStart);
        this.addEventListener('dragover', dragOver);
        this.addEventListener('drop', drop);
    });
}

/**
 * This function binds the edit copy and paste icons to the DOM Events
 */
function registerActionIcons(){
    $(document).off('click', '.copy');
    $(document).off('click', '.paste');
    $(document).off('click', '.edit');

    $(document).on('click', '.copy', function(e) {
        const row = $(this).closest('tr');
        const username = row.find('td:first').text().trim();
        const date = $(this).closest('td').attr('date');

        copyDay(username, date, teamId);
    });

    $(document).on('click', '.paste', function(e) {
        const row = $(this).closest('tr');
        const username = row.find('td:first').text().trim();
        const date = $(this).closest('td').attr('date');

        pasteDay(username, date);
    });

    $(document).on('click', '.edit', function(e) {
        const row = $(this).closest('tr');
        const username = row.find('td:first').text().trim();
        const date = $(this).closest('td').attr('date');

        editDay(username, date, e, teamId);
    });
}

let draggedRow = null;

function dragStart(event) {
    draggedRow = this;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', this.outerHTML);
}


function dragOver(event) {
    event.preventDefault();
    this.classList.add('drag-over');
}

async function drop(event) {
    event.preventDefault();
    $('.drag-over').removeClass('drag-over');

    if (draggedRow) {
        this.parentNode.insertBefore(draggedRow, this);

        // After updating DOM, calculate new order and save it
        const rows = Array.from($('#calBody').find('tr'));
        const newOrder = rows.map((row, index) => {
            const userId = $(row).data('userid');  // Retrieve the user ID from the row
            return {
                userId: userId,
                order: rows.length - index,
                teamId: teamId
            };
        });

        await saveNewOrder(newOrder);
    }
}

/**
 * This method updates the calendar order of a whole team
 * @param newOrder
 * @returns {Promise<void>}
 */
async function saveNewOrder(newOrder) {
    $.ajax({
        url: "/teammembership/updateCalendarOrder",
        type: "POST",
        dataType: "json",
        data: {newOrder},
        success: function () {
            displaySuccess("Order saved successfully!")
        }, error: function (data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            displayError("Error saving Order! Please try again later.")
        }
    });
}


/**
 * This method copies a presence of a specific day
 * @param username the username of the user
 * @param date the date that should be copied
 * @param teamId the ID of the team
 * @returns {Promise<void>}
 */
async function copyDay(username, date, teamId) {
    clipboard = await getPresenceFromDateAndUsername(date, username, teamId);
    if (clipboard) {
        displaySuccess("Presence copied to clipboard");
    } else {
        displayError("No existing data found");
    }
}

/**
 * This method pastes the presence of a specific day
 * @param username the username of the user
 * @param date the date that should be pasted
 * @returns {Promise<void>}
 */
async function pasteDay(username, date) {
    if (clipboard) {
        saveDay(username, date, clipboard.state, clipboard.from, clipboard.until, clipboard.comment);
    } else {
        displayError("No data in clipboard");
    }
}

/**
 * This method returns the presence of a specific day and user
 * @param date the date
 * @param username the username
 * @param teamId the ID of the team
 * @returns {Promise<*>}
 */
async function getPresenceFromDateAndUsername(date, username, teamId) {
    const parts = date.split('.');
    const day = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const dateDat = new Date(year, monthIndex, day);
    const teamData = await getDataFromTeam(dateDat, dateDat, teamId)

    return teamData.find((element) => element.username === username);
}

/**
 * This method edits a presence of a specific day
 * @param username the username of the user
 * @param date the date that should be edited
 * @param e the event that triggered the edit
 * @param teamId the ID of the team
 */
async function editDay(username, date, e, teamId) {

    const elementWithUsername = await getPresenceFromDateAndUsername(date, username, teamId);

    //Configure Popup to edit day
    const popup = new Popup("popup-container-edit");
    $("#popup-container-edit").empty();

    $.when(
        fetchDropdown('presenceType', 'w-60', '[{"value": "0", "text": "Present"}, {"value": "1", "text": "Open"}, {"value": "2", "text": "Absent"}, {"value": "3", "text": "Unsure"}]', 'Select Presence Type'),
        fetchEntryField('time', 'from', 'from', undefined, ''),
        fetchEntryField('time', 'until', 'until', undefined, '23:59'),
        fetchEntryField('text', 'comment', 'comment', undefined, '')
        ).then(function(dropdown, from, until, input) {
        popup.displayInputPopupCustom("/res/others/edit.png", "Edit Day", "Save", "btnSave", '' +
            '<label for="presenceType" class="input-label" style="margin-bottom: 10px">Presence Type</label>' +
            dropdown[0] +
            '<div class="flex flex-col" id="sub-data-container">' +
            '</div>'
        );
            //Add event listener to select box
            $(document).on('change', '#presenceType', function () {
                let presenceType = $(this).val();

                if (presenceType === "0") {
                    //Add from until fields
                    $("#sub-data-container").empty().html('' +
                        '<label for="from" class="input-label">From</label>' +
                        from[0] +
                        '<label for="until" class="input-label">Until</label>' +
                        until[0]);
                } else if (presenceType === "3" || presenceType === "2") {
                    //Add comment field
                    $("#sub-data-container").empty().html('' +
                        '<label for="comment" class="input-label">Comment</label>' +
                        input[0]);
                } else {
                    $("#sub-data-container").empty();
                }
            });

            $(document).ready(function () {
                if (elementWithUsername) {
                    $('#presenceType').val(elementWithUsername.state).trigger('change');
                    if (elementWithUsername.state === 0) {
                        $("#from").val(elementWithUsername.from);
                        $("#until").val(elementWithUsername.until);
                    } else if (elementWithUsername.state === 3 || elementWithUsername.state === 2) {
                        $("#comment").val(elementWithUsername.comment);
                    }
                }
            });
        });

        //Add event listener to save button
        waitForElement('#btnSave', function() {
            $("#btnSave").click(function (e) {
                //check if all fields are filled
                const presenceType = $("#presenceType").val();
                let from;
                let until;
                const comment = $("#comment").val();

                if (presenceType) {
                    if (presenceType === "0") {
                        from = $("#from").val();
                        until = $("#until").val();
                        if (!from || !until) {
                            displayError("Please fill out all fields!");
                            return;
                        }
                    }
                } else {
                    displayError("Please fill out all fields!");
                    return;
                }

                //Save data
                saveDay(username, date, presenceType, from, until, comment);

                popup.close(e);
            });
        });

        popup.open(e);

}

/**
 * Loads all existing presence data from a team in a given time period
 * @param from start of time period
 * @param until end of time period
 * @param teamId id of the team
 * @returns {Promise<*>}
 */
async function getDataFromTeam(from, until, teamId) {
    const dateFrom = new Date(from);
    const dateUntil = new Date(until);

    //Convert the dates into epoch time
    const epochFrom = Math.floor(new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate()).getTime() / 1000);
    const epochUntil = Math.floor(new Date(dateUntil.getFullYear(), dateUntil.getMonth(), dateUntil.getDate()).getTime() / 1000);

    //Get data from server
    return $.ajax({
        url: "/presence/getPresenceListFromTeam/" + teamId + "/" + epochFrom + "/" + epochUntil,
        type: "GET",
        dataType: "json",
        success: function (data) {
            return data;
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
 * Returns correct innerHTML for a day for a user based on the presence state
 * @param date date of the day
 * @param username username of the user
 * @param teamData data of the team
 * @returns {string} innerHTML
 */
function getDataFromDay(date, username, teamData) {
    const dateOrg = new Date(date);
    const epoch = Math.floor(new Date(dateOrg.getFullYear(), dateOrg.getMonth(), dateOrg.getDate()).getTime() / 1000);

    const data = teamData.find(record => record.date == epoch && record.username == username);
    let newHTML;
    if (data) {
        switch (data.state) {
            case 0:
                newHTML =
                    '<i class="ri-check-fill icon icon-green"></i>' +
                    `<p class="info-text">${data.from} - ${data.until}</p>`;
                break;
            case 1:
                newHTML =
                    '<i class="ri-check-fill icon icon-green"></i>' +
                    `<p class="info-text">Open</p>`;
                break;
            case 2:
                newHTML =
                    '<i class="ri-close-line icon icon-red"></i>';
                if (data.comment) {
                    newHTML += `<p class="info-text">${data.comment}</p>`;
                } else {
                    newHTML += `<p class="info-text">Absent</p>`;
                }
                break;
            case 3:
                newHTML =
                    '<i class="ri-question-mark icon icon-orange"></i>';
                if (data.comment) {
                    newHTML += `<p class="info-text">${data.comment}</p>`;
                } else {
                    newHTML += `<p class="info-text">Unsure</p>`;
                }
                break;
        }
    } else {
        newHTML =
            '<i class="ri-subtract-line icon icon-grey"></i>' +
            '<p class="info-text">No data found</p>';
    }
    return newHTML;
}

/**
 * Saves presence data to the server
 * @param username username of the user
 * @param date date of the day
 * @param presenceType which type of presence should get stored
 * @param from start time of the presence
 * @param until end time of the presence
 * @param comment comment for the presence
 */
function saveDay(username, date, presenceType, from, until, comment) {
    //ajax call to save data
    $.ajax({
        url: "/presence/save",
        type: "POST",
        data: {
            username: username,
            date: date,
            state: presenceType,
            from: from,
            until: until,
            comment: comment
        },
        success: function () {
            displaySuccess("Data saved successfully!")
            const parts = date.split('.');
            const day = parseInt(parts[0], 10);
            const monthIndex = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const dateDat = new Date(year, monthIndex, day);
            buildCalendarBasedOnScreenSize(dateDat);
        }, error: function (data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            displayError(data.responseJSON.message)
        }
    });
}

/**
 * Gets all users from the database from one team
 * @returns {Promise<void>}
 */
async function getUsers(teamId) {
    let users;
    await $.ajax({
        url: "/user/getUserList/" + teamId,
        type: "GET",
        dataType: "json",
        success: function (data) {
            users = data;
        },
        error: function (data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
        }
    });

    return users;
}

/**
 * Builds the next training table for a team
 * @param teamId id of the team
 * @param isMobile
 */
function buildNextTrainingTable(teamId, isMobile) {
    return new Promise((resolve, reject) => {
        const url = "/presence/nextTrainings/" + teamId;
        $.ajax({
            url: url,
            type: "GET",
            dataType: "json",
            success: function (data) {
                let tableBody = undefined;
                if(isMobile){
                    tableBody = $("#ntDataM");
                }else{
                    tableBody = $("#ntData");
                }

                tableBody.empty();

                if (data.length === 0) {
                    const tr = $("<tr></tr>");
                    const noDataText = $("<td></td>").attr('colspan', 4).text('NO DATA FOUND').addClass("text-center text-md font-bold");
                    tr.append(noDataText)
                    tableBody.append(tr);
                } else {
                    data.forEach(function (training) {
                        const tr = $("<tr class='font-montserrat text-almost-white'></tr>");
                        const tdDate = $("<td></td>").text(training.readable_date);
                        const tdFrom = $("<td></td>").text(training.starttime);
                        const tdUntil = $("<td></td>").text(training.endtime);
                        const tdDuration = $("<td></td>").text(training.duration);

                        tr.append(tdDate).append(tdFrom).append(tdUntil)

                        if(!isMobile){
                            tr.append(tdDuration);
                        }

                        tableBody.append(tr);
                    });
                }

                resolve();
            },
            error: function (data) {
                if (data.responseJSON && data.responseJSON.redirect) {
                    window.location.href = data.responseJSON.redirect;
                }
                console.log(data);
                reject(data);
            }
        });
    });
}

/**
 * Setup of the define training time popup
 */
async function setupDefTrainingTimePopup(id) {
    teamId = id;
    const defTrainingTimePopup = new Popup("popup-containerDefTrainingTime");

    const options = await getTrainingOptions(teamId);
    $.when(
        fetchEntryField('time', 'from', 'from', undefined, ''),
        fetchEntryField('time', 'until', 'until', undefined, ''),
        fetchDropdown('presenceType', 'w-60', `${JSON.stringify(options)}`, 'Select a Training'),
        fetchButton('button', 'btnDeleteTraining','Delete', undefined,'ri-close-line','mt-6',undefined,'Error')
    ).then(function (from, until, dropdown, btnDeleteTraining) {
        defTrainingTimePopup.displayInputPopupCustom("/res/others/edit.png", "Define Training Time", "Confirm", "btnDefineTrainingTime",
            '<label for="training" class="input-label" style="margin-bottom: 10px">Choose Training</label>' +
            dropdown[0] +
            '<label for="from" class="input-label">From</label>' +
            from[0] +
            '<label for="until" class="input-label">Until</label>' +
            until[0] +
            `<div id="delTrainingDiv">${btnDeleteTraining[0]}</div>`
        )

        $('#manageLink').click(function (e) {
            $("#training").val("");
            $("#from").val("").prop("disabled", true);
            $("#until").val("").prop("disabled", true);
            $("#delTrainingDiv").hide();
            defTrainingTimePopup.open(e);
        });

        waitForElement('#presenceType', function() {
            $('#presenceType').change(function () {
                const selectedTrainingEpochDate = $(this).val();
                const fixedTrainingId = $(this).find(":selected").data("secondvalue");

                if (fixedTrainingId > 0) {
                    $("#delTrainingDiv").show();
                } else {
                    $("#delTrainingDiv").hide();
                }

                if (selectedTrainingEpochDate != "") {
                    const selectedTraining = trainingsToBeDefined.find(training => training.epochdate == selectedTrainingEpochDate);

                    if (selectedTraining) {
                        $("#from").prop("disabled", false).val(selectedTraining.starttime);
                        $("#until").prop("disabled", false).val(selectedTraining.endtime);
                    } else {
                        $("#from").prop("disabled", true);
                        $("#until").prop("disabled", true);
                    }
                } else {
                    $("#from").prop("disabled", true);
                    $("#until").prop("disabled", true);
                }
            });
        });

        $(document).off('click', '#btnDefineTrainingTime');
        $(document).on('click', '#btnDefineTrainingTime', function(e) {
            if (!$("#presenceType").val()) {
                displayError("Please select a training!");
                return;
            }
            if ($("#from").val() == "") {
                displayError("Please select a start time!");
                return;
            }
            if ($("#until").val() == "") {
                displayError("Please select an end time!");
                return;
            }

            if ($("#from").val() >= $("#until").val()) {
                displayError("Start time must be before end time!");
                return;
            }

            const fixedTrainingId = $("#presenceType").find(":selected").data("secondvalue");

            let action = "create";
            if (fixedTrainingId > 0) {
                action = "update";
            }

            const data = {
                epochdate: $("#presenceType").val(),
                starttime: $("#from").val(),
                endtime: $("#until").val(),
                id: fixedTrainingId,
                team_fk: teamId
            }

            crudFixedTraining(data, action)

            defTrainingTimePopup.close();
        });

        waitForElement('#btnDeleteTraining', function() {
            $("#btnDeleteTraining").click(function () {
                const data = {
                    id: $("#presenceType").find(":selected").data("secondvalue")
                }

                crudFixedTraining(data, "delete")

                defTrainingTimePopup.close();
            });
        });
    });
}

/**
 * Returns all training options
 * @returns {string}
 */
function getTrainingOptions(teamId) {
    return new Promise((resolve, reject) => {
        let options = [];

        $.ajax({
            url: "/training/getTrainingsToBeDefined",
            data: {teamId: teamId},
            type: "GET",
            dataType: "json",
            success: function (data) {
                trainingsToBeDefined = data;

                for (let x = 0; x < data.length; x++) {
                    const dateParts = data[x].readable_date.split(".");
                    const date = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
                    const weekday = date.toLocaleString('en-US', {weekday: 'long'});
                    let text;

                    if (data[x].playercount == -1) {
                        text = `${weekday}, ${data[x].readable_date} - fixed (${data[x].starttime} - ${data[x].endtime})`;
                    } else {
                        text = `${weekday}, ${data[x].readable_date} - proposed (${data[x].playercount} player(s) available)`;
                    }

                    options.push({
                        "value": data[x].epochdate.toString(),
                        "text": text,
                        "secondvalue": data[x].fixedtrainings_id.toString()
                    });
                }
                resolve(options);
            },
            error: function (data) {
                if (data.responseJSON && data.responseJSON.redirect) {
                    window.location.href = data.responseJSON.redirect;
                }
                console.log(data);
                reject(data);
            }
        });
    });
}

/**
 * CRUD on fixed training
 * @param data
 * @param action
 */
function crudFixedTraining(data, action){
    data.action = action;

    $.ajax({
        url: "/training/crud",
        data: data,
        type: "POST",
        dataType: "json",
        success: function (data) {
            displaySuccess(data.message);
            setupDefTrainingTimePopup(teamId)
            buildNextTrainingTable(teamId)
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
 * Generates the calendar for the mobile view
 * @param currentDate
 * @param data
 */
async function buildCalendarMobile(currentDate, data) {
    const today = new Date();
    teamId = parseInt(data.teamId);

    //Build the header
    let tr = $('<tr></tr>').addClass("bg-grey-level2 text-white font-montserrat text-xl");
    daysOfWeek.forEach(function (day) {
        if (day === 'Filler') return;

        const dateStr = getDateFromDay(currentDate, day);
        const dayNumber = dateStr.split('.')[0];
        const isToday = dateStr === formatDate(new Date());

        let td = $('<td></td>').addClass("text-center py-2 xs:px-4 px-2").text(dayNumber);

        if (isToday) {
            td.addClass("bg-turquoise/40");
        }

        tr.append(td);
    });

    $('#calendarTable').empty().append(tr);

    //Build the body
    const calContainer = $("#calBodyMobile").empty();

    //Load data from monday to sunday
    const teamData = await getDataFromTeam(getMondayOfWeek(currentDate), getSundayOfCurrentWeek(currentDate), teamId)
    let j = 0;
    daysOfWeek.forEach(function (day) {
        j++;
        if (day === 'Filler') return;

        const dateStr = getDateFromDay(currentDate, day);
        const dateOrg = new Date(getXDayOfWeek(currentDate, j - 2));
        const epoch = Math.floor(new Date(dateOrg.getFullYear(), dateOrg.getMonth(), dateOrg.getDate()).getTime() / 1000);

        // Create the div and its content
        let dayDiv = $('<div></div>').addClass("flex items-center justify-between px-[13px] py-1 border-t border-red-text bg-turquoise/40").attr('date', dateStr);

        let leftDiv = $('<div></div>');
        let rightUl = $('<ul></ul>').addClass("flex");

        // Left part with date
        leftDiv.append(`<h5 class="text-white font-montserrat text-base font-semibold">${day}, ${dateStr}</h5>`);

        // Right part with icons
        const icons = [{icon: 'ri-edit-line', class: 'edit'}, {icon: 'ri-clipboard-line', class: 'copy'}, {icon: 'ri-file-copy-2-line', class: 'paste'}];
        icons.forEach(function (icon, index) {
            let li = $('<li></li>').addClass(index === 1 ? 'mx-[14px]' : '');
            li.append(`<a href="#"><i class="${icon.icon} ${icon.class} font-normal text-sm text-white"></i></a>`);
            rightUl.append(li);
        });

        dayDiv.append(leftDiv)

        if(dateOrg.getTime() >= today.getTime())
        {
            dayDiv.append(rightUl);
        }

        // Append the day div to the container
        calContainer.append(dayDiv);

        data.users.forEach(function(user) {
            const presenceData = teamData.find(record => record.date == epoch && record.username == user.username);
            let statusImgSrc = "";
            let statusText = "";

            //Get the correct picture
            switch (presenceData?.state) {
                case 0: //Present
                    statusImgSrc = "/res/teamcalendar/present.png";
                    statusText = `${presenceData.from} - ${presenceData.until}`;
                    break;
                case 1: //Open
                    statusImgSrc = "/res/teamcalendar/present.png";
                    break;
                case 2: //Absent
                    statusImgSrc = "/res/teamcalendar/absent.png";
                    statusText = presenceData.comment;
                    break;
                case 3: //Unsure
                    statusImgSrc = "/res/teamcalendar/unsure.png";
                    statusText = presenceData.comment;
                    break;
                default: //No Data
                    statusImgSrc = "";
                    statusText = "No Data";
            }

            //Main Div
            let userDiv = $('<div></div>').addClass("flex items-center py-2 mx-4 border-btn-grey");
            if(user.username !== data.users[data.users.length - 1].username){
                userDiv.addClass("border-b");
            }

            //User Thumbnail
            userDiv.append(`<div><img src="${user.thumbnail}" alt="" class="rounded-full h-6 w-6"></div>`);

            //Status icon
            userDiv.append(`<div class=""><img src="${statusImgSrc}" class="w-7 mx-4" alt=""></div>`);

            //Status text
            userDiv.append(`<div><h6 class="text-white font-montserrat font-normal text-base">${statusText}</h6></div>`);

            calContainer.append(userDiv);
        });
    });

    $(document).off('click', '.copy');
    $(document).off('click', '.paste');
    $(document).off('click', '.edit');

    $(document).on('click', '.copy', function(e) {
        let parentDiv = $(this).closest('div[date]');
        let date = parentDiv.attr('date');

        copyDay(data.sessionUser, date, teamId);
    });

    $(document).on('click', '.paste', function(e) {
        let parentDiv = $(this).closest('div[date]');
        let date = parentDiv.attr('date');

        pasteDay(data.sessionUser, date);
    });

    $(document).on('click', '.edit', function(e) {
        let parentDiv = $(this).closest('div[date]');
        let date = parentDiv.attr('date');

        editDay(data.sessionUser, date, e, teamId);
    });
}