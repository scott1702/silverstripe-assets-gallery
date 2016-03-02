import ACTION_TYPES from './action-types';

/**
 * Adds a file which has not been persisted to the server yet.
 *
 * @param object file - File interface. See https://developer.mozilla.org/en-US/docs/Web/API/File
 */
export function addQueuedFile(file) {
    return (dispatch, getState) => {
        return dispatch({
            type: ACTION_TYPES.ADD_QUEUED_FILE,
            payload: { file }
        });
    }
}

/**
 * Updates a queued file if it fails to upload.
 *
 * @param object file - File interface. See https://developer.mozilla.org/en-US/docs/Web/API/File
 */
export function failUpload(file) {
    return (dispatch, getState) => {
        return dispatch({
            type: ACTION_TYPES.FAIL_UPLOAD,
            payload: { file }
        });
    };
}

/**
 * Purges the upload queue.
 *   - Failed uploads are removed.
 *   - Successful uploads are removed.
 *   - Pending uploads are ignored.
 */
export function purgeUploadQueue() {
    return (dispatch, getState) => {
        return dispatch({
            type: ACTION_TYPES.PURGE_UPLOAD_QUEUE,
            payload: null
        });
    };
}

/**
 * Removes a file from the queue.
 * The file doesn't have a unique ID at this point
 * so we match it by filename and filesize.
 *
 * @param string filename - the name of the file to remove.
 * @param number size - the size of the file to remove.
 */
export function removeQueuedFile(filename, size) {
    return (dispatch, getState) => {
        return dispatch({
            type: ACTION_TYPES.REMOVE_QUEUED_FILE,
            payload: { filename, size }
        });
    }
}

/**
 * Updates a queued file when it successfully uploads.
 *
 * @param object file - File interface. See https://developer.mozilla.org/en-US/docs/Web/API/File
 */
export function succeedUpload(file) {
    return (dispatch, getState) => {
        return dispatch({
            type: ACTION_TYPES.SUCCEED_UPLOAD,
            payload: { file }
        });
    };
}

/**
 * Override the values of a currently queued file.
 *
 * @param string filename - The filename to identify the file by.
 * @param string size - The size to identify the file by.
 * @param object updates - The values to update.
 */
export function updateQueuedFile(filename, size, updates) {
    return (dispatch, getState) => {
        return dispatch({
            type: ACTION_TYPES.UPDATE_QUEUED_FILE,
            payload: { filename, size, updates }
        });
    };
}
