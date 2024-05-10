dataAccessors = {
    user: [],
    get userData(){
        return this.user
    },

    set userData(data){
        this.user = data
    },
}

let userPager;


/**
 * This method sets up the whole user management page by creating the popups and loading the users and the registration
 * It also initializes the buttons.
 */
async function setupUserManagement() {
    const popup = new Popup("popup-container");
    const dropdownPromise = fetchTeamTypes();
    loadUserTable().then(() => {
        dropdownPromise.then(dropdownOptions => {
            popup.displayDropdownPopup("/res/others/plus.png", "Create new Registration Code", "Create", "create", "teamDropdown", dropdownOptions);

            loadRegistrationCodeTable();

            $("#newRegistrationCode").click(function (e) {
                popup.open(e);
            });

            $("#delUser").click(function (e) {
                deleteUser(e);
            });

            $("#updateUser").click(function (e) {
                updateUser();
            });

            $("#blockUser").click(function (e) {
                blockUser(e);
            });

            $("#create").click(function () {
                const dropdownVal = $("#teamDropdown").val();

                // Wrap the AJAX call in a promise
                const generateRegistrationCode = new Promise((resolve, reject) => {
                    $.ajax({
                        url: '/registrationcode/generateNewRegistrationCode/' + dropdownVal,
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

                popup.close();

                // Use the promise to ensure the code is loaded after the registration code is generated and the popup is closed
                generateRegistrationCode
                    .then(() => {
                        loadRegistrationCodeTable();
                    })
                    .catch(() => {
                        // Handle the error if needed
                    });
            });
        });

        setupPagination()
    });
}

/**
 * This method sets up the pagination for user table
 */
function setupPagination() {
    userPager = $("#userPager").anyPaginator({
        itemsPerPage: 6,
        mode: 1,
        hideGoto: true,
        prevText: "&lsaquo; Previous",
        nextText: "Next &rsaquo;",
        hideIfOne: false,
        onClick: buildUserTable,
    });

    userPager.numItems(dataAccessors.userData.length)
    buildUserTable().then(() => {
        document.querySelector('#loading-message-container').style.display = 'none';
        document.querySelector('.content').style.display = 'flex';
    });
}

/**
 * This method builds the registration-code table
 */
async function loadRegistrationCodeTable(){
    await $.ajax({
        url: "/registrationcode/getregistrationcodes",
        type: "GET",
        dataType: "json",
        cache: false,
        dataType: "json",
        success: function(data) {
            const tableBody = $("#registration-codes-table tbody");
            tableBody.empty();

            data = data.slice(0,10);

            data.forEach(function(registrationCode) {
                const tr = $("<tr></tr>");
                const tdCode = $("<td></td>").text(registrationCode.code);
                const tdExpiration = $("<td></td>").text(registrationCode.validuntil);
                const tdUsed = $("<td></td>").text(registrationCode.used);
                const tdTeam = $("<td></td>").text(registrationCode.teamname);
                const tdValid = $("<td></td>");

                const statusIndicator = $("<div></div>").addClass("status-indicator-registration");
                if (registrationCode.valid) {
                    statusIndicator.addClass("status-green");
                } else {
                    statusIndicator.addClass("status-red");
                }
                tdValid.append(statusIndicator)

                const tdButton = $("<td></td>");
                const button = $("<button></button>");
                if (registrationCode.valid) {
                    button.addClass("default table-btn");
                    button.append($("<i></i>").addClass("ri-close-circle-line").addClass("ri-2x"));

                } else {
                    button.addClass("default purple table-btn");
                    button.append($("<i></i>").addClass("ri-refresh-line ").addClass("ri-2x"));
                }

                button.on("click", function(e) {
                    const row = $(this).closest("tr");
                    const code = row.find("td:first").text(); // Get the code from the first column

                    // Call your method with the code and teamName variables
                    regCodeButtonAction(code, registrationCode.valid, e);
                });

                tdButton.append(button);

                tr.append(tdCode).append(tdExpiration).append(tdUsed).append(tdTeam).append(tdValid).append(tdButton);
                tableBody.append(tr);
            });

        },
        error: function(data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            console.log("Error fetching registration codes:", data.responseJSON);
        }
    });
}

/**
 * This method fetches the team types
 */
async function fetchTeamTypes() {
    try {
        const teams = await $.ajax({
            url: '/team/getteams',
            type: 'GET',
            dataType: 'json',
            error: function (data){
                if (data.responseJSON && data.responseJSON.redirect) {
                    window.location.href = data.responseJSON.redirect;
                }
            }
        });

        // Create a list of objects with value and label properties
        const teamList = teams.map(team => {
            return {
                value: team.id,
                label: team.displayname
            };
        });

        return teamList;
    } catch (error) {
        console.error("Error occurred while fetching team types:", error);
        return [];
    }
}


/**
 * This method handles the action performed when the registration code button is clicked.
 * It displays a confirmation popup to confirm the action and triggers the appropriate code update operation.
 * @param {string} code - The registration code to be updated.
 * @param {boolean} valid - Indicates whether the registration code is currently valid or not.
 * @param {Event} event - The event object, typically triggered by a user action.
 */
function regCodeButtonAction(code, valid, event) {
    //Display a popup to confirm the action
    const question = valid ? "Do you really want to deactivate this registration code?" : "Do you really want to reactivate this registration code?";
    const popup = new Popup("popup-containerYesNo");
    popup.displayYesNoPopup("/res/others/question_blue.png", "Are you sure?", question, "Yes", "No", "btnYes", "btnNo");
    popup.open(event);

    $("#btnNo").click(function (e) {
        popup.close(e);
    });

    $("#btnYes").click(function (e) {
        popup.close(e);
        updateRegisterCode(code, valid);
    });
}

/**
 * This method updates the registration code in the database
 */
async function updateRegisterCode(code, valid){
    await $.ajax({
        url: "/registrationcode/updateRegistrationCode/" + code + "/" + valid,
        type: "POST",
        dataType: "json",
        success: function (data) {

        },
        error: function (data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            console.log("Error deactivating registration code:", data.responseJSON);
        }
    });

    await loadRegistrationCodeTable();
}

/**
 * This method loads the users into the data accessor
 */
async function loadUserTable() {
    await $.ajax({
        url: "/user/getusers",
        type: "GET",
        cache: false,
        dataType: "json",
        success: function (data) {
            dataAccessors.userData = data;
        },
        error: function (data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            console.log("Error fetching registration codes:", data.responseJSON);
        }
    })
}

/**
 * This method builds the user table
 */
async function buildUserTable() {
    await loadUserTable()

    const tableBody = $("#userData");
    tableBody.empty();

    userPager.numItems(dataAccessors.userData.length)

    //Correct currentPage if page is empty.
    if(userPager.currentPage() > userPager.numPages()){
        userPager.currentPage(userPager.numPages())
    }
    let start = (userPager.currentPage() - 1) * userPager.options.itemsPerPage;
    let stop = start + userPager.options.itemsPerPage - 1;


    for (let i = start; i <= stop; i++) {
        account = dataAccessors.userData[i];
        if (!account) break;

        const tr = $("<tr></tr>");
        const tdUsername = $("<td></td>").text(account.username);
        const tdTeam = $("<td></td>").text(account.team_display);
        const tdFullname = $("<td></td>").text(account.fullname);

        // Create an img element with the picture URL and onerror event handler
        if (account.thumbnail.length < 10) {
            account.thumbnail = "/res/others/blank_profile_picture.png";
        }

        const img = $("<img>").attr("src", account.thumbnail);

        img.addClass("profile-picture");

        // Create a td element and append the img element to it
        const tdPicture = $("<td></td>").addClass("text-center").append(img);

        // Create a td element with a button and icon
        const tdButton = $("<td></td>");
        const button = $("<button></button>").addClass("default purple table-btn");
        const icon = $("<i></i>").addClass("ri-file-edit-line").addClass("ri-2x");

        button.on("click", function () {
            const row = $(this).closest("tr");
            const username = row.find("td:first").text(); // Get the username from the first column
            editUser(username);
        });

        const statusIndicatorTd = $("<td></td>");
        // Create a td element with a button and icon for the blocked user
        const statusIndicator = $("<div></div>").addClass("status-indicator-user");
        if (!account.blocked) {
            statusIndicator.addClass("status-green");
        } else {
            statusIndicator.addClass("status-red");
        }
        statusIndicatorTd.append(statusIndicator);
        button.append(icon);
        tdButton.append(button);

        tr.append(tdUsername).append(tdTeam).append(tdFullname).append(tdPicture).append(statusIndicatorTd).append(tdButton);
        tableBody.append(tr);
    }
}

/**
 * This method builds the edit user table
 */
function editUser(username) {
    const user = dataAccessors.userData.find((user) => user.username === username);
    if (user) {
        if(user.blocked){
            $("#blockUser").text("Unblock User");
        }
        else{
            $("#blockUser").text("Block User");
        }
        // Show the edit box
        $(".edit-box").show();

        // Fill in the input values
        $("#fullName").val(user.fullname === "-" ? "" : user.fullname);
        $("#email").val(user.email === "-" ? "" : user.email);
        $("#phone").val(user.phone === "-" ? "" : user.phone);
        $("#username").val(user.username === "-" ? "" : user.username);
        $("#street").val(user.street === "-" ? "" : user.street);
        $("#city").val(user.city === "-" ? "" : user.city);
        $("#zip").val(user.zip === "-" ? "" : user.zip);
        $("#password").val("");
        $("#userid").val(user.id);
    }

}

/**
 * This method blocks or unblocks a user
 */
function blockUser(e) {
    let user = dataAccessors.userData.find((user) => user.username === $("#username").val());
    if(user.blocked){
        const popup = new Popup("popup-containerYesNoUnBlockUser");
        popup.displayYesNoPopup("/res/others/question_blue.png","Warning","Are you sure you want to unblock this user?", "Yes", "No", "unblockUserYes","unblockUserNo");
        popup.open(e);

        $("#unblockUserNo").click(function (e) {
            popup.close(e);
        });

        $("#unblockUserYes").click(function (e) {
            popup.close(e);
            user.blocked = false;
            updateUser()
        });
    }
    else{
        const popup = new Popup("popup-containerYesNoBlockUser");
        popup.displayYesNoPopup("/res/others/question_blue.png","Warning","Are you sure you want to block this user?", "Yes", "No", "blockUserYes","blockUserNo");
        popup.open(e);

        $("#blockUserNo").click(function (e) {
            popup.close(e);
        });

        $("#blockUserYes").click(function (e) {
            popup.close(e);
            user.blocked = true;
            updateUser()
        })
    }
}

/**
 * This method deletes a user from the database
 */
async function deleteUser(e){
    const popup = new Popup("popup-containerYesNoDelUser");
    popup.displayYesNoPopup("/res/others/question_blue.png","Warning","Are you sure you want to delete this user?", "Yes", "No", "delUserYes","delUserNo");
    popup.open(e);

    $("#delUserNo").click(function (e) {
        popup.close(e);
    });

    $("#delUserYes").click(async function (e) {
        popup.close(e);
        const username = $("#username").val();
        await $.ajax({
            url: "/user/deleteUser/" + username,
            type: "POST",
            dataType: "json",
            success: function (data) {
                $(".edit-box").hide();
                displaySuccess("User deleted successfully!")
            },
            error: function (data) {
                if (data.responseJSON && data.responseJSON.redirect) {
                    window.location.href = data.responseJSON.redirect;
                }
                console.log("Error deleting user:", data.responseJSON);
                displayError("Error deleting user! Try reloading the page.")
            }
        });
    });
    buildUserTable()
}

/**
 * This method updates a user's information.
 * It collects the form data, sends an AJAX request to the server to update the user, and refreshes the user table.
 */
async function updateUser() {
    // Get the form and its data
    const form = document.getElementById('form');
    const formData = new FormData(form);

    // Create an empty object to store the user data
    const data = {};

    // Iterate over each key-value pair in the form data
    for (const [key, value] of formData.entries()) {
        // Check if the value is not empty
        if (value) {
            // Add the key-value pair to the data object
            data[key] = value;
        }
    }

    // Find the user object to be updated from the userData array
    const user = dataAccessors.userData.find((user) => user.username === $("#username").val());

    // Set the "blocked" property of the data object to the current user's blocked status
    data["blocked"] = user?.blocked;

    // Send an AJAX request to update the user on the server
    await $.ajax({
        url: "/user/updateUser/" + $("#userid").val(),
        type: "POST",
        dataType: "json",
        data: JSON.stringify(data),
        contentType: "application/json",
        success: function (data) {
            // Hide the edit box
            $(".edit-box").hide();

            // Display a success message
            displaySuccess("User updated successfully!");
        },
        error: function (data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            console.log("Error updating user:", data.responseJSON);
            // Display an error message
            displayError("Error updating user! Try reloading the page.");
        }
    });

    // Refresh the user table
    buildUserTable();
}
