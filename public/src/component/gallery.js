import React from 'react';
import $ from 'jquery';
import Editor from './editor';
import Item from './item';
import galleryActions from '../action/galleryActions';
import itemStore from '../store/itemStore';

/**
 * @func getItemStoreState
 * @private
 * @return {object}
 * @desc Factory for getting the current state of the ItemStore.
 */
function getItemStoreState() {
    return {
        items: itemStore.getAll()
    };
}

class Gallery extends React.Component {

    constructor(props) {
        super(props);

        var items = window.SS_ASSET_GALLERY[this.props.name];

        // Manually bind so listeners are removed correctly
        this.onChange = this.onChange.bind(this);

        galleryActions.setStoreProps({
            data_url: props.data_url,
            update_url: props.update_url,
            delete_url: props.delete_url,
            initial_folder: props.initial_folder,
            limit: props.limit,
            filter_folder: props.filter_folder,
            filter_name: props.filter_name,
            filter_type: props.filter_type,
            filter_created_from: props.filter_created_from,
            filter_created_to: props.filter_created_to
        });

        // Populate the store.
        if (items && items.length > 0) {
            for (let i = 0; i < items.length; i += 1) {
                galleryActions.create(items[i], true);
            }
        }

        // Set the initial state of the gallery.
        this.state = $.extend(getItemStoreState(), { editing: false, currentItem: null });
    }

    componentDidMount () {
        // @todo
        // if we want to hook into dirty checking, we need to find a way of refreshing
        // all loaded data not just the first page again...

        var $content = $('.cms-content-fields'),
            $sort = $('.gallery__header__sort .dropdown'),
            self = this;

        if ($content.length) {
            $content.on('scroll', (event) => {
                if ($content[0].scrollHeight - $content[0].scrollTop === $content[0].clientHeight) {
                    galleryActions.page();
                }
            });
        }

        $sort.change(function () {
            self.handleSort($(this).val());
        });

        itemStore.addChangeListener(this.onChange);
    }

    componentWillUnmount () {
        itemStore.removeChangeListener(this.onChange);
    }

    render() {
        var ReactTestUtils = React.addons.TestUtils;

        if (this.state.editing) {
            let editorComponent = this.getEditorComponent();

            return (
                <div className='gallery'>
                    {editorComponent}
                </div>
            );
        } else {
            let items = this.getItemComponents();
            let button = null;

            if (itemStore.hasNavigated()) {
                button = <button
                    type='button'
                    className='ss-ui-button ui-corner-all font-icon-level-up'
                    onClick={this.handleNavigate.bind(this)}>
                    Back
                </button>;
            }

            var sorts = <div className="gallery__header__sort fieldholder-small" style={{width: '160px'}}>
                <select className="dropdown no-change-track">
                    <option value="title">
                        name
                    </option>
                    <option value="created">
                        created
                    </option>
                    <option value="type">
                        type
                    </option>
                </select>
            </div>;

            return (
                <div className='gallery'>
                    <div className="gallery__header">
                        {button}
                        {sorts}
                    </div>
                    <div className='gallery__header__items'>
                        {items}
                    </div>
                </div>
            );
        }
    }

    handleNavigate() {
        let navigation = itemStore.popNavigation();

        galleryActions.navigate(navigation[1]);
    }

    handleSort(sortBy) {
        galleryActions.sort(sortBy);
    }

    /**
     * @func onChange
     * @desc Updates the gallery state when something changes in the store.
     */
    onChange() {
        this.setState(getItemStoreState());
    }

    /**
     * @func setEditing
     * @param {boolean} isEditing
     * @param {string} [id]
     * @desc Switches between editing and gallery states.
     */
    setEditing(isEditing, id) {
        var newState = { editing: isEditing };

        if (id !== void 0) {
            let currentItem = itemStore.getById(id);

            if (currentItem !== void 0) {
                this.setState($.extend(newState, { currentItem: currentItem }));
            }
        } else {
            this.setState(newState);
        }
    }

    /**
     * @func getEditorComponent
     * @desc Generates the editor component.
     */
    getEditorComponent() {
        var props = {};

        props.item = this.state.currentItem;
        props.setEditing = this.setEditing.bind(this);

        return (
            <Editor {...props} />
        );
    }

    /**
     * @func getItemComponents
     * @desc Generates the item components which populate the gallery.
     */
    getItemComponents() {
        var self = this;

        return Object.keys(this.state.items).map((key) => {
            var item = self.state.items[key],
                props = {};

            props.attributes = item.attributes;
            props.id = item.id;
            props.setEditing = this.setEditing.bind(this);
            props.title = item.title;
            props.url = item.url;
            props.type = item.type;
            props.filename = item.filename;

            return (
                <Item key={key} {...props} />
            );
        });
    }
}

export default Gallery;
