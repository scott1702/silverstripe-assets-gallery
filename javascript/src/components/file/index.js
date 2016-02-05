import $ from 'jQuery';
import i18n from 'i18n';
import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as galleryActions from '../../state/gallery/actions';
import constants from '../../constants';
import SilverStripeComponent from 'silverstripe-component';

class FileComponent extends SilverStripeComponent {
	constructor(props) {
		super(props);

		this.handleFileNavigate = this.handleFileNavigate.bind(this);
		this.handleFileEdit = this.handleFileEdit.bind(this);
		this.handleFileDelete = this.handleFileDelete.bind(this);
		this.handleClick = this.handleClick.bind(this);
		this.handleKeyDown = this.handleKeyDown.bind(this);
		this.preventFocus = this.preventFocus.bind(this);
		this.onFileSelect = this.onFileSelect.bind(this);
	}

	handleClick(event) {
		this.handleFileNavigate(event);
	}

	handleFileNavigate(event) {
		if (this.isFolder()) {
			this.props.handleFileNavigate(this.props, event)
			return;
		}

		if (this.props.canEdit) {
			this.handleFileEdit(event);
		}
	}

	onFileSelect(event) {
		event.stopPropagation(); //stop triggering click on root element

		if (this.props.selectedFiles.indexOf(this.props.id) === -1) {
			this.props.actions.selectFiles([this.props.id]);
		} else {
			this.props.actions.deselectFiles([this.props.id]);
		}
	}

	handleFileEdit(event) {
		const file = this.props.files.find(file => file.id === this.props.id);
		const path = constants.EDITING_ROUTE.replace(':id', file.id);

		this.props.actions.setEditing(file);
		window.ss.router.show(path);
	}

	handleFileDelete(event) {
		event.stopPropagation(); //stop triggering click on root element
		this.props.handleFileDelete(this.props, event)
	}

	isFolder() {
		return this.props.category === 'folder';
	}

	getThumbnailStyles() {
		if (this.props.category === 'image') {
			return {'backgroundImage': 'url(' + this.props.url + ')'};
		}

		return {};
	}

	getThumbnailClassNames() {
		var thumbnailClassNames = 'item__thumbnail';

		if (this.isImageLargerThanThumbnail()) {
			thumbnailClassNames += ' item__thumbnail--large';
		}

		return thumbnailClassNames;
	}
	
	isSelected() {
		return this.props.selectedFiles.indexOf(this.props.id) > -1;
	}

	getItemClassNames() {
		var itemClassNames = 'item item--' + this.props.category;

		if (this.isSelected()) {
			itemClassNames += ' item--selected';
		}

		return itemClassNames;
	}

	isImageLargerThanThumbnail() {
		let dimensions = this.props.attributes.dimensions;

		return dimensions.height > constants.THUMBNAIL_HEIGHT || dimensions.width > constants.THUMBNAIL_WIDTH;
	}

	handleKeyDown(event) {
		event.stopPropagation();

		//If space is pressed, select file
		if (this.props.spaceKey === event.keyCode) {
			event.preventDefault(); //Stop page from scrolling
			this.onFileSelect(event);
		}

		//If return is pressed, navigate folder
		if (this.props.returnKey === event.keyCode) {
			this.handleFileNavigate(event);
		}
	}

	preventFocus(event) {
		//To avoid browser's default focus state when selecting an item
		event.preventDefault();
	}

	render() {
		var selectButton;

		selectButton = <button
			className='item__actions__action--select [ font-icon-tick ]'
			type='button'
			title={i18n._t('AssetGalleryField.SELECT')}
			tabIndex='-1'
			onMouseDown={this.preventFocus}
			onClick={this.onFileSelect}>
		</button>;

		return <div className={this.getItemClassNames()} data-id={this.props.id} tabIndex="0" onKeyDown={this.handleKeyDown} onClick={this.handleClick} >
			<div ref="thumbnail" className={this.getThumbnailClassNames()} style={this.getThumbnailStyles()}>
				<div className='item--overlay [ font-icon-edit ]'> View
				</div>
			</div>
			<div className='item__title' ref="title">{this.props.title}
				{selectButton}
			</div>
		</div>;
	}
}

FileComponent.propTypes = {
	id: React.PropTypes.number,
	title: React.PropTypes.string,
	category: React.PropTypes.string,
	url: React.PropTypes.string,
	dimensions: React.PropTypes.shape({
		width: React.PropTypes.number,
		height: React.PropTypes.number
	}),
	handleFileNavigate: React.PropTypes.func,
	handleFileDelete: React.PropTypes.func,
	spaceKey: React.PropTypes.number,
	returnKey: React.PropTypes.number,
	onFileSelect: React.PropTypes.func,
	selected: React.PropTypes.bool,
	canEdit: React.PropTypes.bool,
	canDelete: React.PropTypes.bool
};

function mapStateToProps(state) {
	return {
		files: state.assetAdmin.gallery.files,
		focus: state.assetAdmin.gallery.focus,
		selectedFiles: state.assetAdmin.gallery.selectedFiles
	}
}

function mapDispatchToProps(dispatch) {
	return {
		actions: bindActionCreators(galleryActions, dispatch)
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(FileComponent);
