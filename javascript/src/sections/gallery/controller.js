import $ from 'jQuery';
import i18n from 'i18n';
import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import ReactTestUtils from 'react-addons-test-utils';
import FileComponent from '../../components/file/index';
import BulkActionsComponent from '../../components/bulk-actions/index';
import SilverStripeComponent from 'silverstripe-component';
import CONSTANTS from '../../constants';
import * as galleryActions from '../../state/gallery/actions';

function getComparator(field, direction) {
	return (a, b) => {
		const fieldA = a[field].toLowerCase();
		const fieldB = b[field].toLowerCase();

		if (direction === 'asc') {
			if (fieldA < fieldB) {
				return -1;
			}

			if (fieldA > fieldB) {
				return 1;
			}
		} else {
			if (fieldA > fieldB) {
				return -1;
			}

			if (fieldA < fieldB) {
				return 1;
			}
		}

		return 0;
	};
}

class GalleryContainer extends SilverStripeComponent {

	constructor(props) {
		super(props);

		this.folders = [props.initial_folder];

		this.sort = 'name';
		this.direction = 'asc';

		this.sorters = [
			{
				field: 'title',
				direction: 'asc',
				label: i18n._t('AssetGalleryField.FILTER_TITLE_ASC')
			},
			{
				field: 'title',
				direction: 'desc',
				label: i18n._t('AssetGalleryField.FILTER_TITLE_DESC')
			},
			{
				field: 'created',
				direction: 'desc',
				label: i18n._t('AssetGalleryField.FILTER_DATE_DESC')
			},
			{
				field: 'created',
				direction: 'asc',
				label: i18n._t('AssetGalleryField.FILTER_DATE_ASC')
			}
		];

		this.handleFileNavigate = this.handleFileNavigate.bind(this);
		this.handleFileDelete = this.handleFileDelete.bind(this);
		this.handleBackClick = this.handleBackClick.bind(this);
		this.handleMoreClick = this.handleMoreClick.bind(this);
		this.handleSort = this.handleSort.bind(this);
	}

	componentDidMount() {
		super.componentDidMount();

		let $select = $(ReactDOM.findDOMNode(this)).find('.gallery__sort .dropdown');

		// We opt-out of letting the CMS handle Chosen because it doesn't re-apply the behaviour correctly.
		// So after the gallery has been rendered we apply Chosen.
		$select.chosen({
			'allow_single_deselect': true,
			'disable_search_threshold': 20
		});

		//Chosen stops the change event from reaching React so we have to simulate a click.
		$select.change(() => ReactTestUtils.Simulate.click($select.find(':selected')[0]));
	}

	/**
	 * Handler for when the user changes the sort order.
	 *
	 * @param object event - Click event.
	 */
	handleSort(event) {
		const data = event.target.dataset;
		this.props.actions.sortFiles(getComparator(data.field, data.direction));
	}

	getNoItemsNotice() {
		if (this.props.gallery.count < 1) {
			return <p className="gallery__no-item-notice">{i18n._t('AssetGalleryField.NOITEMSFOUND')}</p>;
		}
		
		return null;
	}

	getBackButton() {
		if (this.folders.length > 1) {
			return <button
				className='gallery__back ss-ui-button ui-button ui-widget ui-state-default ui-corner-all font-icon-level-up no-text'
				onClick={this.handleBackClick}
				ref="backButton"></button>;
		}

		return null;
	}

	getBulkActionsComponent() {
		if (this.props.gallery.selectedFiles.length > 0 && this.props.backend.bulkActions) {
			return <BulkActionsComponent
				backend={this.props.backend} />;
		}

		return null;
	}

	getMoreButton() {
		if (this.props.gallery.count > this.props.gallery.files.length) {
			return <button
				className="gallery__load__more"
				onClick={this.handleMoreClick}>{i18n._t('AssetGalleryField.LOADMORE')}</button>;
		}

		return null;
	}

	render() {
		return <div>
			{this.getBackButton()}
			{this.getBulkActionsComponent()}
			<div className="gallery__sort fieldholder-small">
				<select className="dropdown no-change-track no-chzn" tabIndex="0" style={{width: '160px'}}>
					{this.sorters.map((sorter, i) => {
						return <option
								key={i}
								onClick={this.handleSort}
								data-field={sorter.field}
								data-direction={sorter.direction}>{sorter.label}</option>;
					})}
				</select>
			</div>
			<div className='gallery__folders'>
				{this.props.gallery.files.map((file, i) => {
					if (file.type === 'folder') {
						return <FileComponent key={i} {...file}
							spaceKey={CONSTANTS.SPACE_KEY_CODE}
							returnKey={CONSTANTS.RETURN_KEY_CODE}
							handleFileDelete={this.handleFileDelete}
							handleFileNavigate={this.handleFileNavigate} />;
					}})}
			</div>
			<div className='gallery__files'>
				{this.props.gallery.files.map((file, i) => {
					if (file.type !== 'folder') {
						return <FileComponent key={i} {...file}
							spaceKey={CONSTANTS.SPACE_KEY_CODE}
							returnKey={CONSTANTS.RETURN_KEY_CODE}
							handleFileDelete={this.handleFileDelete}
							handleFileNavigate={this.handleFileNavigate} />;
					}})}
			</div>
			{this.getNoItemsNotice()}
			<div className="gallery__load">
				{this.getMoreButton()}
			</div>
		</div>;
	}

	handleFileDelete(file, event) {
		if (confirm(i18n._t('AssetGalleryField.CONFIRMDELETE'))) {
			this.props.backend.delete(file.id);
		}

		event.stopPropagation();
	}

	handleFileNavigate(file) {
		this.folders.push(file.filename);
		this.props.backend.navigate(file.filename);

		this.props.actions.deselectFiles();
	}

	handleMoreClick(event) {
		event.stopPropagation();

		this.props.backend.more();

		event.preventDefault();
	}

	handleBackClick(event) {
		if (this.folders.length > 1) {
			this.folders.pop();
			this.props.backend.navigate(this.folders[this.folders.length - 1]);
		}

		this.props.actions.deselectFiles();

		event.preventDefault();
	}
}

GalleryContainer.propTypes = {
	backend: React.PropTypes.object.isRequired
};

function mapStateToProps(state) {
	return {
		gallery: state.assetAdmin.gallery,
		path: state.assetAdmin.gallery.path
	}
}

function mapDispatchToProps(dispatch) {
	return {
		actions: bindActionCreators(galleryActions, dispatch)
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(GalleryContainer);
