import deepFreeze from 'deep-freeze';
import ACTION_TYPES from './action-types';

function fileFactory() {
    return deepFreeze({
        attributes: {
            dimensions: {
                height: null,
                width: null
            }
        },
        basename: null,
        canDelete: false,
        canEdit: false,
        category: null,
        created: null,
        extension: null,
        filename: null,
        id: 0,
        lastUpdated: null,
        messages: null,
        owner: {
            id: 0,
            title: null
        },
        parent: {
            filename: null,
            id: 0,
            title: null
        },
        size: null,
        title: null,
        type: null,
        url: null
    });
}

const initialState = {
    items: []
};

function queuedFilesReducer(state = initialState, action) {

    switch (action.type) {

        case ACTION_TYPES.ADD_QUEUED_FILE:
            return deepFreeze(Object.assign({}, state, {
                items: state.items.concat([Object.assign({}, fileFactory(), action.payload.file)])
            }));

        case ACTION_TYPES.FAIL_UPLOAD:
            // Add an error message to the failed file.
            return deepFreeze(Object.assign({}, state, {
                items: state.items.map((file) => {
                    // We don't have a unique identifier so matching on file name and size...
                    if (file.filename === action.payload.file.name && file.size === action.payload.file.size) {
                        return Object.assign({}, file, {
                            messages: [{
                                value: 'Failed to upload file',
                                type: 'error',
                                extraClass: 'error'
                            }]
                        });
                    }

                    return file;
                })
            }));

        case ACTION_TYPES.PURGE_UPLOAD_QUEUE:
            // Failed uploads are removed.
            // Successful file uploads removed.
            // Pending uploads are ignored.
            return deepFreeze(Object.assign({}, state, {
                items: state.items.filter((file) => {
                    if (Array.isArray(file.messages)) {
                        // If any of the file's messages are of type 'error' or 'success' then return false.
                        return !file.messages.filter(message => message.type === 'error' || message.type === 'success').length > 0;
                    }

                    return true;
                })
            }));

        case ACTION_TYPES.REMOVE_QUEUED_FILE:
            return deepFreeze(Object.assign({}, state, {
                items: state.items.filter((file) => {
                    var keep = true;

                    if (file.filename === action.payload.filename && file.size === action.payload.size) {
                        keep = false;
                    }

                    return keep;
                })
            }));

        case ACTION_TYPES.SUCCEED_UPLOAD:
            return deepFreeze(Object.assign({}, state, {
                items: state.items.map((file) => {
                    // We don't have a unique identifier so matching on file name and size...
                    if (file.filename === action.payload.file.name && file.size === action.payload.file.size) {
                        return Object.assign({}, file, {
                            messages: [{
                                value: 'File uploaded',
                                type: 'success',
                                extraClass: 'success'
                            }]
                        });
                    }

                    return file;
                })
            }));

        case ACTION_TYPES.UPDATE_QUEUED_FILE:
            return deepFreeze(Object.assign({}, state, {
                items: state.items.map((file) => {
                    if (file.filename === action.payload.filename && file.size === action.payload.size) {
                        return Object.assign({}, file, action.payload.updates);
                    }

                    return file;
                })
            }));

        default:
            return state;
    }
}

export default queuedFilesReducer;
