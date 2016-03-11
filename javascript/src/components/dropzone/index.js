import React from 'react';
import ReactDOM from 'react-dom';
import SilverStripeComponent from 'silverstripe-component';
import i18n from 'i18n';
import Dropzone from 'dropzone';
import $ from 'jQuery';
import CONSTANTS from '../../constants.js';

class DropzoneComponent extends SilverStripeComponent {

    constructor(props) {
        super(props);

        // Override default Dropzone.js behaviour with our own React implementations.

        // By default Dropzone adds markup to the DOM for displaying a thumbnail preview.
        // Here we're relpacing that default behaviour with our own React / Redux implementation.
        Dropzone.prototype.defaultOptions.addedfile = this.handleAddedFile.bind(this);

        // When a file upload fails.
        Dropzone.prototype.defaultOptions.error = this.handleError.bind(this);

        // When a file upload succeeds.
        Dropzone.prototype.defaultOptions.success = this.handleSuccess.bind(this);

        // When the user drags a file into the dropzone.
        Dropzone.prototype.defaultOptions.dragenter = this.handleDragEnter.bind(this);

        // When the user's cursor leaves the dropzone while dragging a file.
        Dropzone.prototype.defaultOptions.dragleave = this.handleDragLeave.bind(this);

        // When the user drops a file onto the dropzone.
        Dropzone.prototype.defaultOptions.drop = this.handleDrop.bind(this);

        // When file file is sent to the server.
        Dropzone.prototype.defaultOptions.sending = this.handleSending.bind(this);
        
        // When a file's upload progress changes
        Dropzone.prototype.defaultOptions.uploadprogress = this.handleUploadProgress.bind(this);

        // The text used before any files are dropped
        Dropzone.prototype.defaultOptions.dictDefaultMessage = i18n._t('AssetGalleryField.DROPZONE_DEFAULT_MESSAGE');

        // The text that replaces the default message text it the browser is not supported
        Dropzone.prototype.defaultOptions.dictFallbackMessage = i18n._t('AssetGalleryField.DROPZONE_FALLBACK_MESSAGE');

        // The text that will be added before the fallback form
        // If null, no text will be added at all.
        Dropzone.prototype.defaultOptions.dictFallbackText = i18n._t('AssetGalleryField.DROPZONE_FALLBACK_TEXT');

        // If the filesize is too big.
        Dropzone.prototype.defaultOptions.dictFileTooBig = i18n.sprintf(i18n._t('AssetGalleryField.DROPZONE_FILE_TOO_BIG'), Dropzone.prototype.defaultOptions.maxFilesize);

        // If the file doesn't match the file type.
        Dropzone.prototype.defaultOptions.dictInvalidFileType = i18n._t('AssetGalleryField.DROPZONE_INVALID_FILE_TYPE');

        // If the server response was invalid.
        Dropzone.prototype.defaultOptions.dictResponseError = i18n._t('AssetGalleryField.DROPZONE_RESPONSE_ERROR');

        // If used, the text to be used for the cancel upload link.
        Dropzone.prototype.defaultOptions.dictCancelUpload = i18n._t('AssetGalleryField.DROPZONE_CANCEL_UPLOAD');

        // If used, the text to be used for confirmation when cancelling upload.
        Dropzone.prototype.defaultOptions.dictCancelUploadConfirmation = i18n._t('AssetGalleryField.DROPZONE_CANCEL_UPLOAD_CONFIRMATION');

        // If used, the text to be used to remove a file.
        Dropzone.prototype.defaultOptions.dictRemoveFile = i18n._t('AssetGalleryField.DROPZONE_REMOVE_FILE');

        // Displayed when the maxFiles have been exceeded
        // You can use {{maxFiles}} here, which will be replaced by the option.
        Dropzone.prototype.defaultOptions.dictMaxFilesExceeded = i18n._t('AssetGalleryField.DROPZONE_MAX_FILES_EXCEEDED');

        this.dropzone = null;
        this.dragging = false;
    }

    componentDidMount() {
        super.componentDidMount();

        if (this.props.uploadButton === true) {
            Dropzone.prototype.defaultOptions.clickable = $(ReactDOM.findDOMNode(this)).find('.dropzone-component__upload-button')[0];
        }

        this.dropzone = new Dropzone(ReactDOM.findDOMNode(this), Object.assign({}, Dropzone.prototype.defaultOptions, this.props.options));

        // Set the user warning displayed when a user attempts to remove a file.
        // If the props hasn't been passed there will be no warning when removing files.
        if (typeof this.props.promptOnRemove !== 'undefined') {
            this.setPromptOnRemove(this.props.promptOnRemove);
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();

        // Remove all dropzone event listeners.
        this.dropzone.disable();
    }

    render() {
        var className = ['dropzone-component'];

        if (this.dragging === true) {
            className.push('dragging');
        }

        return (
            <div className={className.join(' ')}>
                {this.props.uploadButton &&
                    <button className='dropzone-component__upload-button [ ss-ui-button font-icon-upload ]' type='button'>{i18n._t("AssetGalleryField.DROPZONE_UPLOAD")}</button>
                }
                {this.props.children}
            </div>
        );
    }

    /**
     * Gets a file's category based on its type.
     *
     * @param string fileType - For example 'image/jpg'.
     *
     * @return string
     */
    getFileCategory(fileType) {
        return fileType.split('/')[0];
    }

    /**
     * Event handler triggered when the user drags a file into the dropzone.
     *
     * @param object event
     */
    handleDragEnter(event) {
        this.dragging = true;
        this.forceUpdate();

        if (typeof this.props.handleDragEnter === 'function') {
            this.props.handleDragEnter(event);
        }
    }

    /**
     * Event handler triggered when a user's curser leaves the dropzone while dragging a file.
     *
     * @param object event
     */
    handleDragLeave(event) {
        const componentNode = ReactDOM.findDOMNode(this);

        // Event propagation (events bubbling up from decendent elements) means the `dragLeave`
        // event gets triggered on the dropzone. Here we're ignoring events that don't originate from the dropzone node.
        if (event.target !== componentNode) {
            return;
        }

        this.dragging = false;
        this.forceUpdate();

        if (typeof this.props.handleDragLeave === 'function') {
            this.props.handleDragLeave(event, componentNode);
        }
    }

    handleUploadProgress(file, progress, bytesSent) {
        if (typeof this.props.handleUploadProgress === 'function') {
            this.props.handleUploadProgress(file, progress, bytesSent);
        }
    }

    /**
     * Event handler triggered when the user drops a file on the dropzone.
     *
     * @param object event
     */
    handleDrop(event) {
        this.dragging = false;
        this.forceUpdate();

        if (typeof this.props.handleDrop === 'function') {
            this.props.handleDrop(event);
        }
    }

    /**
     * Called just before the file is sent. Gets the `xhr` object as second parameter,
     * so you can modify it (for example to add a CSRF token) and a `formData` object to add additional information.
     *
     * @param object file - File interface. See https://developer.mozilla.org/en-US/docs/Web/API/File
     * @param object xhr
     * @param object formData - FormData interface. See https://developer.mozilla.org/en-US/docs/Web/API/FormData
     */
    handleSending(file, xhr, formData) {
        formData.append('SecurityID', this.props.securityID);
        formData.append('folderID', this.props.folderID);

        if (typeof this.props.handleSending === 'undefined') {
            return;
        }

        this.props.handleSending(file, xhr, formData);
    }

    /**
     * Event handler for files being added. Called before the request is made to the server.
     *
     * @param object file - File interface. See https://developer.mozilla.org/en-US/docs/Web/API/File
     */
    handleAddedFile(file) {
        var reader = new FileReader();

        reader.onload = function (event) {
            this.props.handleAddedFile({
                attributes: {
                    dimensions: {
                        height: CONSTANTS.THUMBNAIL_HEIGHT + 1,
                        width: CONSTANTS.THUMBNAIL_WIDTH + 1 // Ensure image gets item__thumbnail--large class
                    }
                },
                category: this.getFileCategory(file.type),
                filename: file.name,
                size: file.size,
                title: file.name,
                type: file.type,
                url: event.target.result
            });
        }.bind(this);

        reader.readAsDataURL(file);
    }

    /**
     * Event handler for failed uploads.
     *
     * @param object file - File interface. See https://developer.mozilla.org/en-US/docs/Web/API/File
     * @param string errorMessage
     */
    handleError(file, errorMessage) {
        this.props.handleError(file, errorMessage);
    }

    /**
     * Event handler for successfully upload files.
     *
     * @param object file - File interface. See https://developer.mozilla.org/en-US/docs/Web/API/File
     */
    handleSuccess(file) {
        this.props.handleSuccess(file);
    }

    /**
     * Set the text displayed when a user tries to remove a file.
     *
     * @param string userPrompt - The message to display.
     */
    setPromptOnRemove(userPrompt) {
        this.dropzone.options.dictRemoveFileConfirmation = userPrompt;
    }

}

DropzoneComponent.propTypes = {
    folderID: React.PropTypes.number.isRequired,
    handleAddedFile: React.PropTypes.func.isRequired,
    handleDragEnter: React.PropTypes.func,
    handleDragLeave: React.PropTypes.func,
    handleDrop: React.PropTypes.func,
    handleError: React.PropTypes.func.isRequired,
    handleSuccess: React.PropTypes.func.isRequired,
    options: React.PropTypes.shape({
        url: React.PropTypes.string.isRequired
    }),
    promptOnRemove: React.PropTypes.string,
    securityID: React.PropTypes.string.isRequired,
    uploadButton: React.PropTypes.bool
};

DropzoneComponent.defaultProps = {
    uploadButton: true
};

export default DropzoneComponent;
