import $ from 'jquery';
import React from 'react';
import FileComponent from './file-component';
import EditorComponent from './editor-component';

export default class extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			'count': 0, // The number of files in the current view
			'files': [],
			'editing': null
		};

		this.folders = [props.initial_folder];

		this.sort = 'name';
		this.direction = 'asc';
	}

	getListeners() {
		return {
			'onSearchData': (data) => {
				this.setState({
					'count': data.count,
					'files': data.files
				});
			},
			'onMoreData': (data) => {
				this.setState({
					'count': data.count,
					'files': this.state.files.concat(data.files)
				});
			},
			'onNavigateData': (data) => {
				this.setState({
					'count': data.count,
					'files': data.files
				});
			},
			'onDeleteData': (data) => {
				this.setState({
					'count': this.state.count - 1,
					'files': this.state.files.filter((file) => {
						return data !== file.id;
					})
				});
			},
			'onSaveData': (id, values) => {
				let files = this.state.files;

				files.forEach((file) => {
					if (file.id == id) {
						file.title = values.title;
						file.basename = values.basename;
					}
				});

				this.setState({
					'files': files,
					'editing': false
				});
			}
		};
	}

	componentDidMount() {
		let listeners = this.getListeners();

		for (let event in listeners) {
			this.props.backend.on(event, listeners[event]);
		}

		if (this.props.initial_folder !== this.props.current_folder) {
			this.onNavigate(this.props.current_folder);
		} else {
			this.props.backend.search();
		}
	}

	componentWillUnmount() {
		let listeners = this.getListeners();

		for (let event in listeners) {
			this.props.backend.removeListener(event, listeners[event]);
		}
	}

	componentDidUpdate() {
		var $select = $(React.findDOMNode(this)).find('.gallery__sort .dropdown');

		// We opt-out of letting the CMS handle Chosen because it doesn't re-apply the behaviour correctly.
		// So after the gallery has been rendered we apply Chosen ourself.
		$select.chosen({
			'allow_single_deselect': true,
			'disable_search_threshold': 20
		});

		// Chosen stops the change event from reaching React so we have to simulate a click.
		$select.change(() => React.addons.TestUtils.Simulate.click($select.find(':selected')[0]));
	}

	render() {
		if (this.state.editing) {
			return <div className='gallery'>
				<EditorComponent file={this.state.editing}
					onFileSave={this.onFileSave.bind(this)}
					onListClick={this.onListClick.bind(this)} />
			</div>
		}

		let fileComponents = this.getFileComponents();

		let sorts = [
			{'field': 'title', 'direction': 'asc', 'label': ss.i18n._t('AssetGalleryField.FILTER_TITLE_ASC')},
			{'field': 'title', 'direction': 'desc', 'label': ss.i18n._t('AssetGalleryField.FILTER_TITLE_DESC')},
			{'field': 'created', 'direction': 'desc', 'label': ss.i18n._t('AssetGalleryField.FILTER_DATE_DESC')},
			{'field': 'created', 'direction': 'asc', 'label': ss.i18n._t('AssetGalleryField.FILTER_DATE_ASC')}
		];

		let sortButtons = sorts.map((sort) => {
			let onSort = () => {
				let folders = this.state.files.filter(file => file.type === 'folder');
				let files = this.state.files.filter(file => file.type !== 'folder');

				let comparator = (a, b) => {
					if (sort.direction === 'asc') {
						if (a[sort.field] < b[sort.field]) {
							return -1;
						}

						if (a[sort.field] > b[sort.field]) {
							return 1;
						}
					} else {
						if (a[sort.field] > b[sort.field]) {
							return -1;
						}

						if (a[sort.field] < b[sort.field]) {
							return 1;
						}
					}

					return 0;
				};

				this.setState({
					'files': folders.sort(comparator).concat(files.sort(comparator))
				});
			};

			return <option onClick={onSort}>{sort.label}</option>;
		});

		var moreButton = null;

		if (this.state.count > this.state.files.length) {
			moreButton = <button className="gallery__load__more" onClick={this.onMoreClick.bind(this)}>{ss.i18n._t('AssetGalleryField.LOADMORE')}</button>;
		}

		var backButton = null;

		if (this.folders.length > 1) {
			backButton = <button
				className='ss-ui-button ui-button ui-widget ui-state-default ui-corner-all font-icon-level-up'
				onClick={this.onBackClick.bind(this)}>{ss.i18n._t('AssetGalleryField.BACK')}</button>;
		}

		return <div className='gallery'>
			{backButton}
			<div className="gallery__sort fieldholder-small" style={{width: '160px'}}>
				<select className="dropdown no-change-track no-chzn">
					{sortButtons}
				</select>
			</div>
			<div className='gallery__items'>
				{fileComponents}
			</div>
			<div className="gallery__load">
				{moreButton}
			</div>
		</div>;
	}

	onListClick() {
		this.setState({
			'editing': null
		});
	}

	getFileComponents() {
		return this.state.files.map((file) => {
			return <FileComponent
					{...file}
					onFileDelete={this.onFileDelete.bind(this)}
					onFileEdit={this.onFileEdit.bind(this)}
					onFileNavigate={this.onFileNavigate.bind(this)}
			/>;
		});
	}

	onFileDelete(file, event) {
		event.stopPropagation();

		if (confirm(ss.i18n._t('AssetGalleryField.CONFIRMDELETE'))) {
			this.props.backend.delete(file.id);
		}
	}

	onFileEdit(file, event) {
		event.stopPropagation();

		this.setState({
			'editing': file
		});
	}

	onFileNavigate(file) {
		this.folders.push(file.filename);
		this.props.backend.navigate(file.filename);
	}

	onNavigate(folder) {
		this.folders.push(folder);
		this.props.backend.navigate(folder);
	}

	onMoreClick(event) {
		event.preventDefault(); //Prevent submission of insert media dialog
		this.props.backend.more();
	}

	onBackClick(event) {
		event.preventDefault(); //Prevent submission of insert media dialog
		if (this.folders.length > 1) {
			this.folders.pop();
			this.props.backend.navigate(this.folders[this.folders.length - 1]);
		}
	}

	onFileSave(id, state, event) {
		this.props.backend.save(id, state);

		event.stopPropagation();
		event.preventDefault();
	}
}