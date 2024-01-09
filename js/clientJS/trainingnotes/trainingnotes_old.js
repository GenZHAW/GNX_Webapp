let currentNote = null;
let allNotes = [];
let currentNoteSections = [];
let currentSection = null;
let currentInternalId = 0;
let allAnnotations = [];

let sectionIndexToBeDeleted = null;
let existingNotesPager = null;


const popupAddAnnotation = new Popup("popupContainerAddAnnotation");

/**
 * This function holds all logic for the initialization of the training notes page
 */
function initTrainingNotes() {
    $("#noteDisplayContainer").hide();
    $("#editNoteContainer").hide();
    $("#editBtnContainer").hide();
    $("#saveNote").off('click').click(function() {
        saveNote();
    });
    $("#editNote").hide().off('click').click(function() {
        editNote();
    });
    $("#discardChanges").off('click').click(function() {
        displayTrainingNote(currentNote.id)
    });
    $("#newNote").off('click').click(function() {
        createNewNote();
    });

    setupPaginationForExistingNotes();
    setupAddSectionPopup();
    setupDelSectionPopup();
    setupDelNotePopup();
    setupAddAnnotationPopup();
    setupActionButtons();
}



/**
 * Builds the existing notes table
 */
function buildExistingNodesTable() {
    let table = $('#existingNotesData');
    table.empty();

    loadExistingNotes().then((result) => {
        existingNotesPager.numItems(result.length);

        if(existingNotesPager.currentPage() > existingNotesPager.numPages()){
            existingNotesPager.currentPage(existingNotesPager.numPages());
        }

        let start = (existingNotesPager.currentPage() - 1) * existingNotesPager.options.itemsPerPage;
        let stop = start + existingNotesPager.options.itemsPerPage - 1;

        for (let i = start; i <= stop; i++) {
            let note = result[i];
            if (!note) break;

            let newRow = $('<tr>');
            newRow.append($('<td>').text(note.created));
            newRow.append($('<td style="font-weight: bold">').text(note.title));
            newRow.append($('<td>').text(note.creator));
            newRow.append($('<td>').text(note.editor));
            newRow.append($('<td>').text(note.lastedited));

            let viewButton = $('<button class="default purple" style="height: 30px"><i class="ri-eye-line ri-lg"></i>View</button>');
            viewButton.attr('data-id', note.id);
            viewButton.on('click', function() {
                let id = $(this).attr('data-id');
                if ($("#editNoteContainer").is(":visible")) {
                    displayError("Please save or cancel your changes first!")
                }else {
                    displayTrainingNote(id);
                }
            });

            newRow.append($('<td>').append(viewButton));
            table.append(newRow);
        }
    });
}

/**
 * Setup for Table pagination
 */
function setupPaginationForExistingNotes() {
    existingNotesPager = $("#notesPager").anyPaginator({
        itemsPerPage: 5,
        mode: 1,
        hideGoto: true,
        prevText: "&lsaquo; Previous",
        nextText: "Next &rsaquo;",
        hideIfOne: false,
        onClick: buildExistingNodesTable,
    });

    loadExistingNotes().then((result) => {
        existingNotesPager.numItems(result.length);
        existingNotesPager.currentPage(1);
        buildExistingNodesTable();
    });
}

/**
 * Displays the training note with the given noteId
 * @param noteId
 */
async function displayTrainingNote(noteId) {
    if (!noteId) {
        $("#editBtnContainer").hide();
        $("#editNoteContainer").hide();
        $("#editNote").hide();
        $("#nothingPlaceholder").show();
        return;
    }

    await loadExistingNotes().then((result) => {
        allNotes = result
        })

    currentNote = allNotes.find(note => note.id == noteId);

    if (!currentNote) {
        console.error("Note with ID " + noteId + " not found in allNotes.");
        return;
    }

    const result = await getSections(noteId);
    currentNoteSections = result;

    $("#nothingPlaceholder").hide();
    $("#editBtnContainer").hide();
    $("#editNoteContainer").hide();
    $("#noteDisplayContainer").show();
    $("#sectionDisplayContainer").empty();
    $("#editNote").show();

    $("#noteTitle").text(currentNote.title);
    $("#noteCreation").html("Created at <strong>" + currentNote.created + "</strong> by <strong>" + currentNote.creator + "</strong>");

    //Load all the annotations
    allAnnotations = [];



    currentNoteSections.forEach(function (section) {
        currentSection = section;
        addSection(section.type, 0, section);
    });
}

/**
 * Function which enabled the edit mode for the note
 */
function editNote() {
    $("#noteDisplayContainer").hide();
    $("#sectionDisplayContainer").empty();
    $("#editNote").hide();
    $("#editBtnContainer").show();
    $("#editNoteContainer").show();
    $("#sectionContainer").empty();

    $("#noteCreationEdit").html("Created at <strong>" + currentNote.created + "</strong> by <strong>" + currentNote.creator + "</strong>");
    $("#editTitle").val(currentNote.title);

    //Add all the Sections to display them
    for(let i = 0; i < currentNoteSections.length; i++) {
        addSection(currentNoteSections[i].type, 1, currentNoteSections[i], false, i+1);
    }
}





/**
 * Function which opens the popup for adding a new section
 */
function setupAddSectionPopup(){
    const popupAddSection = new Popup("popupContainerAddSection");

    popupAddSection.displayDropdownPopup('/res/others/plus.png','Add new Section','Add','btnAddSection','sectionDropdown',
        [{value: 1, label: "Title"},{value: 2, label: "Simple Text"},{value: 3, label: "Rich Text"},{value: 4, label: "Video"},{value: 5, label: "LoL Game-Stats"}])

    $("#addNewSection").click(function (e) {
        $("#sectionDropdown").val(1);
        popupAddSection.open(e);
    });

    $("#btnAddSection").click(function () {
        popupAddSection.close()
        addSection($("#sectionDropdown").val(),1,"",true, currentNoteSections.length+1);
    });
}











/**
 * This function adds a new section to the note
 * @param type
 * @param mode 0 = display, 1 = edit
 * @param section the section object
 * @param newSection true if the section is new
 * @param internalSectionId the id of the section in the array
 */
function addSection(type, mode, section, newSection = false, internalSectionId) {
    let html;

    if (typeof type === 'string') {
        type = parseInt(type);
    }

    switch (type) {
        case 1:
            html = addTitleSection(mode, section.value, newSection, internalSectionId);
            break;
        case 2:
            html = addSimpleTextSection(mode, section.value, newSection, internalSectionId);
            break;
        case 3:
            html = addRichTextSection(mode, section.value, newSection, internalSectionId);
            break;
        case 4:
            html = addVideoSection(mode, section.value, newSection, internalSectionId, section.id);
            break;
        case 5:
            break;
    }

    if (mode === 0){
        $("#sectionDisplayContainer").append(html);
        setupPlayButton();
        setupDelAnnotationButton();
    }else {
        $("#sectionContainer").append(html);
        setupAddAnnotationPopup();
        setupActionButtons();
        if (type === 3) {

            //Configure the Rich Text Editor
            let editorCfg = {}
            editorCfg.toolbar = "basic";
            editorCfg.showFloatParagraph = false;
            editorCfg.skin = "rounded-corner";
            editorCfg.editorResizeMode = "height";
            editorCfg.showSelectedBlock = false;
            editorCfg.showPlusButton = false;
            editorCfg.showTagList = false;
            currentNoteSections[internalSectionId - 1].editor = new RichTextEditor("#editor" + internalSectionId, editorCfg);
            if (section.value) {
                currentNoteSections[internalSectionId - 1].editor.setHTMLCode(section.value);
            }else {
                currentNoteSections[internalSectionId - 1].editor.setHTMLCode(' ');
            }
        }
    }
}

/**
 * This function returns the html for a new title section
 */
function addTitleSection(mode, value, newSection, internalSectionId){
    let html;

    if(mode === 0){
        html = `<div class="section">
                    <p class="section-display-title">${value}</p>
                </div>`
    }else {
        if (newSection) {
            currentNoteSections.push({type: 1, editor: null, fieldRef: "#newTitle" + internalSectionId, order: internalSectionId});
        }else{
            currentNoteSections[internalSectionId-1].fieldRef = "#newTitle" + internalSectionId;
        }

        if (!value) {
            value= "";
        }

        html = `<div class="section">
                        <div class="new-title-container">
                            ${getActionHtml()}
                            <label class="label">Section Title</label>
                            <input type="text" class="input" id="newTitle${internalSectionId}" style="width: 500px" value="${value}"/>
                        </div>
                      </div>`;
    }
    return html;
}

/**
 * This function returns the html for a new simple text section
 */
function addSimpleTextSection(mode, value, newSection, internalSectionId){
    let html;

    if (!value) {
        value= "";
    }

    if(mode === 0){
        html = `<div class="section">
                    <p class="section-display-simpletext">${value}</p>
                </div>`
    }else {
        html = `<div class="section">
                        <div class="new-title-container">
                            ${getActionHtml()}
                            <label class="label">Simple Text</label>
                            <textarea class="input-textarea" id="newSimpleText${internalSectionId}" rows="7">${value}</textarea>
                        </div>
                      </div>`;

        if (newSection) {
            currentNoteSections.push({
                type: 2,
                editor: null,
                fieldRef: "#newSimpleText" + internalSectionId,
                order: internalSectionId
            });
        }else{
            currentNoteSections[internalSectionId-1].fieldRef = "#newSimpleText" + internalSectionId;
        }
    }

    return html;
}

/**
 * This function returns the html for a new text section
 * @returns {*}
 */
function addRichTextSection(mode, value, newSection, internalSectionId){
    let html;

    if (mode === 0){
        html = `<div class="section">
                    ${value}
                </div>`
    }else{
        html= `<div class="section">
                <div class="new-title-container">
                    ${getActionHtml()}
                    <label class="label">Rich Text</label>
                    <div id="editor${internalSectionId}" class="richtexteditor">
                </div>
            </div>`;

        if (newSection) {
            currentNoteSections.push({type: 3, editor: null, fieldRef: null});
        }
    }

    return html;
}

/**
 * This function returns the html for a new video section
 */
function addVideoSection(mode, value, newSection, internalSectionId, id){
    let html;

    if (value){
        if (mode === 0) {
            html = `<div class="section">
                        <div class="video-player-container">
                            <video class="video-player" controls>
                                <source src="/trainingNotes/getVideo/${value}" type="video/mp4">
                            </video>
                            <p class="purple-title" style="align-self: center; margin-top: 36px; color: #381A53">Annotations</p>
                            <div class="annotation-container-display">
                                ${getAnnotationHtml(id, mode)}
                            </div>
                        </div>
                    </div>`
        }else{
            html = `<div class="section">
                        <div class="new-title-container">
                            ${getActionHtml()}
                            <label class="label">Video</label>         
                            <video class="video-player" controls style="margin-left: 95px" id="video${internalSectionId}">
                                <source src="/trainingNotes/getVideo/${value}" type="video/mp4">
                            </video>
                            <div class="annotation-container">
                                <button class="default purple addAnnotation" data-internalId="${internalSectionId}"><i class="ri-map-pin-add-line ri-lg"></i>Add Annotation</button>
                                <div class="annoation-list" id="annotationList${internalSectionId}">
                                    ${getAnnotationHtml(id, mode)}
                                </div>                          
                            </div>
                        </div>
                    </div>`
        }
    }else{
        if(mode === 0) {
            html = `<div class="section">
                        <p class="section-display-simpletext"><i class="ri-file-unknow-line ri-lg" style="color: red; margin-right: 10px"></i>No video found...</p>
                    </div>`
        }else {
            if (newSection) {
                currentNoteSections.push({type: 4, editor: null, fieldRef: null, order: internalSectionId});
            }

            html = `<div class="section">
                        <div class="new-title-container">
                            ${getActionHtml()}
                            <label class="label">Video</label>
                            <button class="default purple" data-internalId="${internalSectionId}" id="uploadBtn-${internalSectionId}" onclick="uploadVideo(${internalSectionId})">Upload Video <i class="ri-upload-2-line"></i></button>
                            <div class="progress-bar-container" style="margin-left: 18px; display: none">
                                <div class="progress-bar-fill"><span class="percentage">0%</span></div>
                            </div>
                        </div>
                      </div>`;
        }
    }

    return html;
}

/**
 * This function returns the html for all existing annotations
 * @param sectionId
 * @param mode is it edit mode or display mode
 */
function getAnnotationHtml(sectionId, mode){
    let html = '';
    allAnnotations.forEach(function (annotation) {
        if (annotation.section_fk === sectionId){
            html += '<div class="annotation">';
            if (mode === 1){
                html += `<a href="" class="edit-icon del-anno" data-annotationId="${annotation.id}"><i class="ri-close-circle-line ri-xl"></i></a>`;
            }

            html += `<a href="" class="edit-icon play" id="playButton" data-time="${annotation.time}"><i class="ri-play-circle-line ri-xl"></i></a>
                <p style="font-style: italic">${annotation.time}</p>
                <p style="font-weight: bold">${annotation.title}</p>
                <p>${annotation.text}</p>
            </div>`
        }
    });

    if (html === ''){
        html = '<p style="color: #5C5C5C; align-self: center">NO ANNOTATIONS FOUND</p>'
    }

    return html;
}

/**
 * Setups the play events for the play buttons of a video
 */
function setupPlayButton(){
    $(document).off('click').on('click', '.play', function(event) {
        event.preventDefault();
        const time = $(this).data('time');
        const timeArray = time.split(":");
        const seconds = (+timeArray[0]) * 60 * 60 + (+timeArray[1]) * 60 + (+timeArray[2]);
        const videoElement = $(this).closest('.section').find('video.video-player')[0];

        if (videoElement) {
            videoElement.currentTime = seconds;
            videoElement.play();
        }
    });

}

/**
 * Setups the delete annotation events for the delete buttons of a video
 */
function setupDelAnnotationButton(){
    $(document).on('click', '.del-anno', function(event) {
        event.preventDefault();
        const annotationId = $(this).data('annotationid');
        let sectionId = allAnnotations.find(annotation => annotation.id === annotationId).section_fk;
        allAnnotations = allAnnotations.filter(annotation => annotation.id !== annotationId);

        if (annotationId > 0) {
            $.ajax({
                url: '/trainingNotes/deleteAnnotation',
                type: 'DELETE',
                data: {annotationId: annotationId},
                dataType: 'json',
                success: function (response) {
                    displaySuccess(response.message);
                },
                error: function (data) {
                    if (data.responseJSON && data.responseJSON.redirect) {
                        window.location.href = data.responseJSON.redirect;
                    }
                    console.log("Error getting training notes:", data.responseJSON);
                }
            });
        }

        // Update the annotations display
        const newHtml = getAnnotationHtml(sectionId, 1);
        $(this).closest('.annotation-container').find('.annoation-list').html(newHtml);
    });
}

/**
 * This function upserts a training note with all its sections
 */
function upsertTrainingNote() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/trainingNotes/upsert',
            type: 'POST',
            data: { note: currentNote, sections: currentNoteSections, annotations: allAnnotations },
            success: function(data) {
                loadExistingNotes().then((result) => {
                    allNotes = result;
                    displaySuccess(data.message);
                    resolve();
                }).fail((error) => {
                    console.error("Error refreshing allNotes data after upsert:", error);
                    reject(error);
                });
            },
            error: function(data) {
                if (data.responseJSON && data.responseJSON.redirect) {
                    window.location.href = data.responseJSON.redirect;
                }
                console.log("Error getting training notes:", data.responseJSON);
                reject(data); // Reject the promise with the error data
            }
        });
    });
}

/**
 * Returns the html for all buttons in edit mode
 */
function getActionHtml(){
    return `<div class="action-container">
                <a class="edit-icon section-action"><i class="ri-arrow-up-line ri-xl"></i></a>
                <a class="edit-icon section-action"><i class="ri-arrow-down-line ri-xl"></i></a>
                <a class="edit-icon section-action"><i class="ri-close-circle-line ri-xl"></i></a>
            </div>`
}



/**
 * Function to delete a section
 * @param index
 */
function deleteSection(index) {
    let section = currentNoteSections[index];
    currentNoteSections.splice(index, 1);

    if (section.id){
        //Delete the section in the database
        $.ajax({
            url: '/trainingNotes/deleteSection',
            type: 'POST',
            data: { sectionId: section.id },
            error: function(data) {
                if (data.responseJSON && data.responseJSON.redirect) {
                    window.location.href = data.responseJSON.redirect;
                }
                console.log("Error deleting section: ", data.responseJSON);
            }
        });
    }

    editNote();
}

/**
 * This function creates a new note
 */
function createNewNote(){
    currentNote = {};
    currentNoteSections = [];
    currentSection = null;
    currentInternalId = 0;
    allAnnotations = [];
    if ($("#editNoteContainer").is(":visible")) {
        displayError("Please save or cancel your changes first!")
        return;
    }

    $("#editNoteContainer").show();
    $("#editBtnContainer").show();
    $("#nothingPlaceholder").hide();
    $("#noteDisplayContainer").hide();
    $("#editNote").hide();
    $("#sectionContainer").empty();

    $("#editTitle").val("");
}