/**
 * This function is used to initialize the page.
 */
function initPage(){
    fillRegistrationcodeDropdown();

    loadRegistrationCodes().then(function (data) {
      buildTable(data)
    });
}

function buildTable(data){
    let tableBody = $('#registrationcodeData');
    tableBody.empty();

    data.forEach(function (element) {
        const tr = $("<tr></tr>");
        const tdCode = $("<td></td>").text(element.code)
        const tdTeam = $("<td></td>").text(element.teamname).addClass("truncate");
        const tdUsed = $("<td></td>").text(element.used === "Yes" ? "Inactive" : "Active").addClass("hidden md:block")
        tdUsed.addClass(element.used === "Yes" ? "text-error" : "text-success");
        const tdValid = $("<td></td>").addClass("hidden sm:table-cell").text(element.validuntil.split(',')[0])
        const tdButton = $("<td class='flex gap-2' ></td>");
        const enable = $("<a href='#' id='enable'><i class='ri-restart-line ri-lg text-turquoise'></i></a>")
            .click(function() {
                updateRegisterCode(element.code, false);
            });

        const disable = $("<a href='#' id='disable'><i class='ri-stop-fill ri-lg text-error'></i></a>")
            .click(function() {
                updateRegisterCode(element.code, true);
            });

        // Determine which button to show
        if (element.used === "Yes") {
            disable.hide();
            enable.show();
        } else {
            enable.hide();
            disable.show();
        }

        tr.append(tdCode).append(tdTeam).append(tdUsed).append(tdValid).append(tdButton.append(enable).append(disable));
        tableBody.append(tr);
    });


}
/**
 * This function is used to fill the dropdown with the teams
 */
function fillRegistrationcodeDropdown(){
    $.ajax({
        url: '/team/getteams',
        type: 'GET',
        success: function (data) {
            let dropdown = $('#team');
            dropdown.empty();
            dropdown.append(`<option value="undefined">Select a team</option>`);
            data.forEach(function (element) {
                dropdown.append(`<option value="${element.id}">${element.displayname}</option>`);
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
 * Loads all existing cronjobs from the server
 */
function loadRegistrationCodes(){
    return new Promise(function (resolve, reject) {
        $.ajax({
            url: '/registrationcode/getregistrationcodes',
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

function generateRegistrationCode(teamId){
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/registrationcode/generateNewRegistrationCode/' + teamId,
            type: 'POST',
            success: function (data) {
                console.log("Registration code created");
                resolve(); // Resolve the promise when the registration code is generated successfully
            },
            error: function (data) {
                if (data.responseJSON && data.responseJSON.redirect) {
                    window.location.href = data.responseJSON.redirect;
                }
                console.log("Error creating registration code:", data.responseJSON);
                reject(); // Reject the promise if there is an error generating the registration code
            }
        });
    });
}

/**
 * This method updates the registration code in the database
 */
async function updateRegisterCode(code, valid){
    await $.ajax({
        url: "/registrationcode/updateRegistrationCode/" + code + "/" + valid,
        type: "POST",
        success: function (data) {
            loadRegistrationCodes().then(function (data) {
                buildTable(data)
            });

            displaySuccess("Registration code updated successfully")
        },
        error: function (data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            console.log("Error deactivating registration code:", data);
        }
    });
}