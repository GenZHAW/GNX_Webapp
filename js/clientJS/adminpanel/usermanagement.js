let currentPageUsers = 1;
const elementsPerPage = 10;
let allUsers = [];
const personalFields = ['username', 'fullname', 'street', 'city', 'zip', 'phone', 'email'];
const gameFields = ['steam', 'origin', 'riotgames', 'battlenet', 'discord'];
const otherFields = ['trainingdatareminder']


/**
 * Initializes the User management page by loading all resources and setting up the tables and event handlers
 */
function initPage() {
    loadAllUsers().then(() => {
        // Display data based on current page indices
        sliceTableForPage(currentPageUsers, allUsers);
    });

    // Pagination for users table
    $('#usersNextPage').click(function () {
        let totalPages = Math.ceil(allUsers.length / elementsPerPage);
        if (currentPageUsers < totalPages) {
            currentPageUsers++;
            sliceTableForPage(currentPageUsers, allUsers);
        }
    });

    $('#usersPrevPage').click(function () {
        if (currentPageUsers > 1) {
            currentPageUsers--;
            sliceTableForPage(currentPageUsers, allUsers);
        }
    });
}

/**
 * Slices the data to display only the data for the current page
 * After slicing the data it builds the table
 * @param page The current page index
 * @param data The data to slice e.g. allUsers
 */
function sliceTableForPage(page, data) {
    let startIndex = (page - 1) * elementsPerPage;
    let endIndex = startIndex + elementsPerPage;
    let dataToDisplay = data.slice(startIndex, endIndex);
    buildUserTable(dataToDisplay)
    updatePaginationIndicator(page, Math.ceil(data.length / elementsPerPage), "usersPageIndicator");
}

/**
 * Updates the pagination indicator
 * @param currentPage The current page index
 * @param totalPages Total pages available
 * @param elementName The name of the element to update
 */
function updatePaginationIndicator(currentPage, totalPages, elementName) {
    $('#' + elementName).text(`Page ${currentPage} / ${totalPages}`);
}

/**
 * Builds the user table
 * @param users The users to display in the table
 */
function buildUserTable(users){
    const tableBody = $('#usersData');
    tableBody.empty();

    users.forEach(async function (user) {
        const userId = user.id; // Ensure the 'id' is captured from 'user' for each click
        const tr = $("<tr></tr>");
        const tdUsername = $("<td></td>").text(user.username);
        const tdFullname = $("<td></td>").text(user.fullname).addClass('hidden sm:table-cell');
        const tdPhone = $("<td></td>").text(user.phone).addClass('hidden md:table-cell');
        const tdEmail = $("<td></td>").text(user.email).addClass('hidden xl:table-cell');
        const tdStatus = user.blocked ?  $("<td class='ri-thumb-up-line ri-lg text-error'></td>") : $("<td class='ri-thumb-down-line ri-lg text-success'></td>");
        const tdButtonContainer = $("<td class='flex gap-2'></td>");
        const editUser = $("<a href='#' id='editUser'><i class='ri-edit-fill ri-lg text-turquoise'></i></a>")
            .click(function () {
                const rowElement = $(this).closest('tr');
                displayEditUser(user, userId, rowElement);
            });

        const btnBlockUser = $("<a href='#' id='btnBlockUser'><i class='ri-spam-3-line ri-lg'></i></a>")
            btnBlockUser.addClass(user.blocked ? 'text-success' : 'text-error')
            .click(function (e) {
                blockUser(e, user);
            });

        tr.append(tdUsername).append(tdFullname).append(tdPhone).append(tdEmail).append(tdStatus).append(tdButtonContainer.append(editUser).append(btnBlockUser));
        tableBody.append(tr);
    });
}

function displayEditUser(user, userId, triggeringElement) {
    // Make a copy of the user object for updating purposes, excluding the 'id' for internal use
    const { id, ...userDetails } = user;

    // Clear the existing editing interface if it already exists
    if ($('#userEdit').length > 0) {
        $('#userEdit').remove();
    }

    // Create new elements for editing
    const userEdit = $('<tr id="userEdit"></tr>');
    const editTable = $('<td colspan="6"></td>');
    const tbody = $('<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"></div>');

    // Add the fields to the edit table
    addFieldsToElement(editTable, personalFields, userDetails,"Personal Information");
    addFieldsToElement(editTable, gameFields, userDetails, "Game Information");
    addToggleToElement(editTable, otherFields, userDetails, "Other Information");

    // Button container for closing and updating the user
    const btnContainer = $('<div class="flex float-right gap-4 mt-4"></div>');
    fetchButton('button', 'btnCloseEditUser', 'Close', 'w-32', 'ri-close-line').then(function (btnCloseEdit) {
        btnContainer.append(btnCloseEdit);
        // Fetch and append the update button
        return fetchButton('button', 'btnUpdateEditUser', 'Update', 'w-32', 'ri-check-line', '', undefined, 'Success');
    }).then(function (btnUpdateEdit) {
        btnContainer.append(btnUpdateEdit);
        editTable.append(btnContainer);
    }).then(function () {
        // Setup event handlers after buttons are added to the DOM
        $('#btnUpdateEditUser').click(function () {
            updateUser(userId, user); // Use the original user object with 'id' for updates
        });
        $('#btnCloseEditUser').click(function () {
            $('#userEdit').remove();
        });
    });

    editTable.append(tbody);
    userEdit.append(editTable);
    $(triggeringElement).after(userEdit);
}

/**
 * This method blocks or unblocks a user
 */
function blockUser(e, user) {
    if(user.blocked){
        const popup = new Popup("popup-containerYesNoUnBlockUser");
        popup.displayYesNoPopup("/res/others/question_blue.png","Warning","Are you sure you want to unblock this user?", "Yes", "No", "unblockUserYes","unblockUserNo");
        popup.open(e);

        $(document).off('click', '#unblockUserNo').on('click', '#unblockUserNo', function () {
            popup.close(e);
        });

        $(document).off('click', '#unblockUserYes').on('click', '#unblockUserYes', function () {
            popup.close(e);
            user.blocked = false;
            blockOrUnblockUser(user)
        });
    }
    else{
        const popup = new Popup("popup-containerYesNoBlockUser");
        popup.displayYesNoPopup("/res/others/question_blue.png","Warning","Are you sure you want to block this user?", "Yes", "No", "blockUserYes","blockUserNo");
        popup.open(e);

        $(document).off('click', '#blockUserNo').on('click', '#blockUserNo', function () {
            popup.close(e);
        });

        $(document).off('click', '#blockUserYes').on('click', '#blockUserYes', function () {
            popup.close(e);
            user.blocked = true;
            blockOrUnblockUser(user)
        });
    }
}

async function blockOrUnblockUser(user){
    const id = user.id
    const blocked = user.blocked

    $.ajax({
        url: "/user/blockOrUnblockUser",
        type: "POST",
        dataType: "json",
        data: {
            id: id,
            blocked: blocked
        },
        success: function () {
            displaySuccess("Updated user!");
            loadAllUsers().then(function () {
                sliceTableForPage(currentPageUsers, allUsers);
            });
        },
        error: function (data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            console.log("Error updating user:", data.responseJSON);
            displayError("Error updating User! Try reloading the page.")
        }
    });

}
/**
 * Updates the data of a team
 */
async function updateUser(userId, user) {
    const id = userId
    const username = $("#editusername").val()
    const fullName = $("#editfullname").val()
    const street = $("#editstreet").val()
    const city = $("#editcity").val()
    const zip = $("#editzip").val()
    const phone = $("#editphone").val()
    const email = $("#editemail").val()
    const steam = $("#editsteam").val()
    const origin = $("#editorigin").val()
    const riotgames = $("#editriotgames").val()
    const battlenet = $("#editbattlenet").val()
    const discord = $("#editdiscord").val()
    const trainingdatareminder = $("#edittrainingdatareminder").is(':checked') ? 1 : 0

    $.ajax({
        url: "/user/updateUser/" + id + "/",
        type: "POST",
        dataType: "json",
        data: {
            fullName: fullName,
            email: email,
            phone: phone,
            username: username,
            street: street,
            city: city,
            zip: zip,
            steam: steam,
            origin: origin,
            riotgames: riotgames,
            battlenet: battlenet,
            discord: discord,
            trainingdatareminder: trainingdatareminder
        },
        success: function () {
            displaySuccess("Updated user!");
            loadAllUsers().then(function () {
                sliceTableForPage(currentPageUsers, allUsers);
            });
        },
        error: function (data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            console.log("Error updating user:", data.responseJSON);
            displayError("Error updating User! Try reloading the page.")
        }
    });
}

function addToggleToElement(element, fieldName, userDetails, headingName){
    // Loop through the user details to generate form inputs
    const heading = $('<h4 class="font-montserrat text-lg text-almost-white w-full font-bold"></h4>').text(headingName);
    element.append(heading);
    const tbody = $('<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 my-2"></div>');
    for(const key of fieldName){
        const value = userDetails[key];
        const fieldName = "edit" + key;
        const tr = $('<div></div>');

        // Prepare the input value, handling empty values with a placeholder
        const tdValue = $('<div></div>');
        let tdKey;

        tdKey = $('<label class="font-montserrat text-base text-almost-white "></label>').text(key.charAt(0).toUpperCase() + key.slice(1));
        fetchToggleButton(fieldName, value).then(function (field) {
            tdValue.append(field);
        });
        // Append key and value divs to the row
        tr.append(tdKey).append(tdValue);
        tbody.append(tr);
        element.append(tbody)
    }
}
function addFieldsToElement(element, fieldNames, userDetails, headingName){
    // Loop through the user details to generate form inputs
    const heading = $('<h4 class="font-montserrat text-lg text-almost-white w-full font-bold"></h4>').text(headingName);
    element.append(heading);
    const tbody = $('<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 my-2"></div>');
    for(const key of fieldNames){
        const value = userDetails[key];
        const fieldName = "edit" + key;
        const tr = $('<div></div>');

        // Prepare the input value, handling empty values with a placeholder
        let inputValue = value || "";

        const tdValue = $('<div></div>');
        let tdKey;

        tdKey = $('<label class="font-montserrat text-base text-almost-white"></label>').text(key.charAt(0).toUpperCase() + key.slice(1));
        fetchEntryField('text', userDetails.displayname + "_" + key.charAt(0).toUpperCase() + key.slice(1), fieldName, 'w-64', inputValue).then(function (field) {
            tdValue.append(field);
        });
        // Append key and value divs to the row
        tr.append(tdKey).append(tdValue);
        tbody.append(tr);
        element.append(tbody)
    }
}
/**
 * Fetches all users from the database and saves it in the global variable 'users'
 */
function loadAllUsers() {
    return $.ajax({
        url: '/user/getusers',
        type: 'GET',
        success: function (data) {
            allUsers = data;
        },
        error: function (data) {
            if (data.responseJSON && data.responseJSON.redirect) {
                window.location.href = data.responseJSON.redirect;
            }
            console.log("Error fetching users:", data.responseJSON);
        }
    })
}
