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
        const tdTeam = $("<td></td>").text(element.teamname);
        const tdUsed = $("<td></td>").text(element.used)
        const tdValid = $("<td></td>").text(element.validuntil)
        const tdButton = $("<td class='flex gap-2' ></td>");
        const enable = $("<a href='#' id='enable'><i class='ri-restart-line ri-lg text-turquoise'></i></a>").click(function(){
        });
        const disable = $("<a href='#' id='disable'><i class='ri-stop-fill ri-lg text-error'></i></a>").click(function(){
        });

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
            dataType: "json",
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
