import deepFreeze from 'deep-freeze';
import { GALLERY } from '../action-types';
import CONSTANTS from '../../constants.js';

const initialState = {
    bulkActions: {
        placeholder: CONSTANTS.BULK_ACTIONS_PLACEHOLDER,
        options: CONSTANTS.BULK_ACTIONS
    },
    count: 0, // The number of files in the current view
    editing: null, // The file being edited
    editorFields: [], // The input fields for editing files. Hardcoded until form field schema is implemented.
    files: [],
    focus: false,
    path: null, // The current location path the app is on
    selectedFiles: []
};

/**
 * Reducer for the `assetAdmin.gallery` state key.
 *
 * @param object state
 * @param object action - The dispatched action.
 * @param string action.type - Name of the dispatched action.
 * @param object [action.payload] - Optional data passed with the action.
 */
export default function galleryReducer(state = initialState, action) {

    var nextState;

    switch (action.type) {
        case GALLERY.ADD_FILES:
            let nextFilesState = []; // Clone the state.files array

            action.payload.files.forEach(payloadFile => {
                let fileInState = false;

                state.files.forEach(stateFile => {
                    // Check if each file given is already in the state
                    if (stateFile.id === payloadFile.id) {
                        fileInState = true;
                    };
                });

                // Only add the file if it isn't already in the state
                if (!fileInState) {
                    nextFilesState.push(payloadFile)
                }
            });

            return deepFreeze(Object.assign({}, state, {
                count: typeof action.payload.count !== 'undefined' ? action.payload.count : state.count,
                files: state.files.concat(nextFilesState)
            }));

        case GALLERY.REMOVE_FILES:
            if (typeof action.payload.ids === 'undefined') {
                // No param was passed, remove everything.
                nextState = deepFreeze(Object.assign({}, state, { count: 0, files: [] }));
            } else {
                // We're dealing with an array of ids
                nextState = deepFreeze(Object.assign({}, state, {
                    count: state.files.filter(file => action.payload.ids.indexOf(file.id) === -1).length,
                    files: state.files.filter(file => action.payload.ids.indexOf(file.id) === -1)
                }));
            }

            return nextState;

        case GALLERY.UPDATE_FILE:
            let fileIndex = state.files.map(file => file.id).indexOf(action.payload.id);
            let updatedFile = Object.assign({}, state.files[fileIndex], action.payload.updates);

            return deepFreeze(Object.assign({}, state, {
                files: state.files.map(file => file.id === updatedFile.id ? updatedFile : file)
            }));

        case GALLERY.SELECT_FILES:
            if (action.payload.ids === null) {
                // No param was passed, add everything that isn't currently selected, to the selectedFiles array.
                nextState = deepFreeze(Object.assign({}, state, {
                    selectedFiles: state.selectedFiles.concat(state.files.map(file => file.id).filter(id => state.selectedFiles.indexOf(id) === -1))
                }));
            } else {
                // We're dealing with an array if ids to select.
                nextState = deepFreeze(Object.assign({}, state, {
                    selectedFiles: state.selectedFiles.concat(action.payload.ids.filter(id => state.selectedFiles.indexOf(id) === -1))
                }));
            }

            return nextState;

        case GALLERY.DESELECT_FILES:
            if (action.payload.ids === null) {
                // No param was passed, deselect everything.
                nextState = deepFreeze(Object.assign({}, state, { selectedFiles: [] }));
            } else {
                // We're dealing with an array of ids to deselect.
                nextState = deepFreeze(Object.assign({}, state, {
                    selectedFiles: state.selectedFiles.filter(id => action.payload.ids.indexOf(id) === -1)
                }));
            }

            return nextState;

        case GALLERY.SET_EDITING:
            return deepFreeze(Object.assign({}, state, {
                editing: action.payload.file
            }));

        case GALLERY.SET_EDITOR_FIELDS:
            return deepFreeze(Object.assign({}, state, {
                editorFields: action.payload.editorFields
            }));

        case GALLERY.UPDATE_EDITOR_FIELD:
            let fieldIndex = state.editorFields.map(field => field.name).indexOf(action.payload.updates.name),
                updatedField = Object.assign({}, state.editorFields[fieldIndex], action.payload.updates);

            return deepFreeze(Object.assign({}, state, {
                editorFields: state.editorFields.map(field => field.name === updatedField.name ? updatedField : field)
            }));

        case GALLERY.SORT_FILES:
            let folders = state.files.filter(file => file.type === 'folder'),
                files = state.files.filter(file => file.type !== 'folder');

            return deepFreeze(Object.assign({}, state, {
                files: folders.sort(action.payload.comparator).concat(files.sort(action.payload.comparator))
            }));

        case GALLERY.SET_PATH:
            return deepFreeze(Object.assign({}, state, {
                path: action.payload.path
            }));

        default:
            return state;
    }
}
