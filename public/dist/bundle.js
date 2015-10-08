(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
/*!
  Copyright (c) 2015 Jed Watson.
  Licensed under the MIT License (MIT), see
  http://jedwatson.github.io/classnames
*/
/* global define */

(function () {
	'use strict';

	var hasOwn = {}.hasOwnProperty;

	function classNames () {
		var classes = '';

		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			if (!arg) continue;

			var argType = typeof arg;

			if (argType === 'string' || argType === 'number') {
				classes += ' ' + arg;
			} else if (Array.isArray(arg)) {
				classes += ' ' + classNames.apply(null, arg);
			} else if (argType === 'object') {
				for (var key in arg) {
					if (hasOwn.call(arg, key) && arg[key]) {
						classes += ' ' + key;
					}
				}
			}
		}

		return classes.substr(1);
	}

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = classNames;
	} else if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {
		// register as 'classnames', consistent with npm package name
		define('classnames', function () {
			return classNames;
		});
	} else {
		window.classNames = classNames;
	}
}());

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _dispatcherEditorDispatcher = require('../dispatcher/editorDispatcher');

var _dispatcherEditorDispatcher2 = _interopRequireDefault(_dispatcherEditorDispatcher);

var _constants = require('../constants');

var _constants2 = _interopRequireDefault(_constants);

var editorActions = {

	create: function create(data, silent) {
		_dispatcherEditorDispatcher2['default'].dispatch({
			action: _constants2['default'].EDITOR.CREATE,
			data: data,
			silent: silent
		});
	},

	update: function update(data, silent) {
		_dispatcherEditorDispatcher2['default'].dispatch({
			action: _constants2['default'].EDITOR.UPDATE,
			data: data,
			silent: silent
		});
	},

	clear: function clear(silent) {
		_dispatcherEditorDispatcher2['default'].dispatch({
			action: _constants2['default'].EDITOR.CLEAR,
			silent: silent
		});
	}

};

exports['default'] = editorActions;
module.exports = exports['default'];

},{"../constants":9,"../dispatcher/editorDispatcher":10}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _dispatcherGalleryDispatcher = require('../dispatcher/galleryDispatcher');

var _dispatcherGalleryDispatcher2 = _interopRequireDefault(_dispatcherGalleryDispatcher);

var _constants = require('../constants');

var _constants2 = _interopRequireDefault(_constants);

var galleryActions = {

	/**
  * @func setStoreProps
  * @desc Initialises the store
  */
	setStoreProps: function setStoreProps(data, silent) {
		_dispatcherGalleryDispatcher2['default'].dispatch({
			action: _constants2['default'].ITEM_STORE.INIT,
			data: data,
			silent: silent
		});
	},

	/**
  * @func create
  * @param {object} data
  * @desc Creates a gallery item.
  */
	create: function create(data, silent) {
		_dispatcherGalleryDispatcher2['default'].dispatch({
			action: _constants2['default'].ITEM_STORE.CREATE,
			data: data,
			silent: silent
		});
	},

	/**
  * @func destroy
  * @param {string} id
  * @param {string} delete_url
  * @param {bool} silent
  * @desc destroys a gallery item.
  */
	destroy: function destroy(id, silent) {
		_dispatcherGalleryDispatcher2['default'].dispatch({
			action: _constants2['default'].ITEM_STORE.DESTROY,
			data: {
				id: id
			},
			silent: silent
		});
	},

	/**
  * @func update
  * @param {string} id
  * @param {string} key
  * @desc Updates a gallery item.
  */
	update: function update(id, updates, silent) {
		_dispatcherGalleryDispatcher2['default'].dispatch({
			action: _constants2['default'].ITEM_STORE.UPDATE,
			data: {
				id: id,
				updates: updates
			},
			silent: silent
		});
	},

	/**
  * Navigates to a new folder.
  *
  * @param {string} folder
  * @param {bool} silent
  */
	navigate: function navigate(folder, silent) {
		_dispatcherGalleryDispatcher2['default'].dispatch({
			action: _constants2['default'].ITEM_STORE.NAVIGATE,
			data: {
				'folder': folder
			},
			silent: silent
		});
	},

	/**
  * Loads another page of items into the gallery.
  *
  * @param {bool} silent
  */
	page: function page(silent) {
		_dispatcherGalleryDispatcher2['default'].dispatch({
			action: _constants2['default'].ITEM_STORE.PAGE,
			silent: silent
		});
	},

	/**
  * Sorts the items in the gallery.
  *
  * @param {bool} silent
  */
	sort: function sort(name, silent) {
		_dispatcherGalleryDispatcher2['default'].dispatch({
			action: _constants2['default'].ITEM_STORE.SORT,
			data: {
				'name': name
			},
			silent: silent
		});
	}
};

exports['default'] = galleryActions;
module.exports = exports['default'];

},{"../constants":9,"../dispatcher/galleryDispatcher":11}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _inputField = require('./inputField');

var _inputField2 = _interopRequireDefault(_inputField);

var _actionEditorActions = require('../action/editorActions');

var _actionEditorActions2 = _interopRequireDefault(_actionEditorActions);

var _storeEditorStore = require('../store/editorStore');

var _storeEditorStore2 = _interopRequireDefault(_storeEditorStore);

/**
 * @func getEditorStoreState
 * @private
 * @return {object}
 * @desc Factory for getting the current state of the ItemStore.
 */
function getEditorStoreState() {
    return {
        fields: _storeEditorStore2['default'].getAll()
    };
}

/**
 * @func Editor
 * @desc Used to edit the properties of an Item.
 */

var Editor = (function (_React$Component) {
    _inherits(Editor, _React$Component);

    function Editor(props) {
        _classCallCheck(this, Editor);

        _get(Object.getPrototypeOf(Editor.prototype), 'constructor', this).call(this, props);

        // Manually bind so listeners are removed correctly
        this.onChange = this.onChange.bind(this);

        // Populate the store.
        _actionEditorActions2['default'].create({ name: 'title', value: props.item.title }, true);
        _actionEditorActions2['default'].create({ name: 'filename', value: props.item.filename }, true);

        this.state = getEditorStoreState();
    }

    _createClass(Editor, [{
        key: 'componentDidMount',
        value: function componentDidMount() {
            _storeEditorStore2['default'].addChangeListener(this.onChange);
        }
    }, {
        key: 'componentWillUnmount',
        value: function componentWillUnmount() {
            _storeEditorStore2['default'].removeChangeListener(this.onChange);
        }
    }, {
        key: 'render',
        value: function render() {
            var textFields = this.getTextFieldComponents();

            return _react2['default'].createElement(
                'div',
                { className: 'editor' },
                _react2['default'].createElement(
                    'button',
                    {
                        type: 'button',
                        className: 'ss-ui-button ui-corner-all font-icon-level-up',
                        onClick: this.handleBack.bind(this) },
                    'Back to gallery'
                ),
                _react2['default'].createElement(
                    'form',
                    null,
                    _react2['default'].createElement(
                        'div',
                        { className: 'CompositeField composite cms-file-info nolabel' },
                        _react2['default'].createElement(
                            'div',
                            { className: 'CompositeField composite cms-file-info-preview nolabel' },
                            _react2['default'].createElement('img', { className: 'thumbnail-preview', src: this.props.item.url })
                        ),
                        _react2['default'].createElement(
                            'div',
                            { className: 'CompositeField composite cms-file-info-data nolabel' },
                            _react2['default'].createElement(
                                'div',
                                { className: 'CompositeField composite nolabel' },
                                _react2['default'].createElement(
                                    'div',
                                    { className: 'field readonly' },
                                    _react2['default'].createElement(
                                        'label',
                                        { className: 'left' },
                                        'File type:'
                                    ),
                                    _react2['default'].createElement(
                                        'div',
                                        { className: 'middleColumn' },
                                        _react2['default'].createElement(
                                            'span',
                                            { className: 'readonly' },
                                            this.props.item.type
                                        )
                                    )
                                )
                            ),
                            _react2['default'].createElement(
                                'div',
                                { className: 'field readonly' },
                                _react2['default'].createElement(
                                    'label',
                                    { className: 'left' },
                                    'File size:'
                                ),
                                _react2['default'].createElement(
                                    'div',
                                    { className: 'middleColumn' },
                                    _react2['default'].createElement(
                                        'span',
                                        { className: 'readonly' },
                                        this.props.item.size
                                    )
                                )
                            ),
                            _react2['default'].createElement(
                                'div',
                                { className: 'field readonly' },
                                _react2['default'].createElement(
                                    'label',
                                    { className: 'left' },
                                    'URL:'
                                ),
                                _react2['default'].createElement(
                                    'div',
                                    { className: 'middleColumn' },
                                    _react2['default'].createElement(
                                        'span',
                                        { className: 'readonly' },
                                        _react2['default'].createElement(
                                            'a',
                                            { href: this.props.item.url, target: '_blank' },
                                            this.props.item.url
                                        )
                                    )
                                )
                            ),
                            _react2['default'].createElement(
                                'div',
                                { className: 'field date_disabled readonly' },
                                _react2['default'].createElement(
                                    'label',
                                    { className: 'left' },
                                    'First uploaded:'
                                ),
                                _react2['default'].createElement(
                                    'div',
                                    { className: 'middleColumn' },
                                    _react2['default'].createElement(
                                        'span',
                                        { className: 'readonly' },
                                        this.props.item.created
                                    )
                                )
                            ),
                            _react2['default'].createElement(
                                'div',
                                { className: 'field date_disabled readonly' },
                                _react2['default'].createElement(
                                    'label',
                                    { className: 'left' },
                                    'Last changed:'
                                ),
                                _react2['default'].createElement(
                                    'div',
                                    { className: 'middleColumn' },
                                    _react2['default'].createElement(
                                        'span',
                                        { className: 'readonly' },
                                        this.props.item.lastUpdated
                                    )
                                )
                            ),
                            _react2['default'].createElement(
                                'div',
                                { className: 'field readonly' },
                                _react2['default'].createElement(
                                    'label',
                                    { className: 'left' },
                                    'Dimensions:'
                                ),
                                _react2['default'].createElement(
                                    'div',
                                    { className: 'middleColumn' },
                                    _react2['default'].createElement(
                                        'span',
                                        { className: 'readonly' },
                                        this.props.item.attributes.dimensions.width,
                                        ' x ',
                                        this.props.item.attributes.dimensions.height,
                                        'px'
                                    )
                                )
                            )
                        )
                    ),
                    textFields,
                    _react2['default'].createElement(
                        'div',
                        null,
                        _react2['default'].createElement(
                            'button',
                            { type: 'submit', className: 'ss-ui-button ui-corner-all font-icon-check-mark' },
                            'Save'
                        ),
                        _react2['default'].createElement(
                            'button',
                            { type: 'button', className: 'ss-ui-button ui-corner-all font-icon-cancel-circled', onClick: this.handleCancel.bind(this) },
                            'Cancel'
                        )
                    )
                )
            );
        }

        /**
         * @func getTextFieldComponents
         * @desc Generates the editable text field components for the form.
         */
    }, {
        key: 'getTextFieldComponents',
        value: function getTextFieldComponents() {
            var _this = this;

            return Object.keys(this.state.fields).map(function (key) {
                var field = _this.state.fields[key];

                return _react2['default'].createElement(
                    'div',
                    { className: 'field text', key: key },
                    _react2['default'].createElement(
                        'label',
                        { className: 'left' },
                        field.name
                    ),
                    _react2['default'].createElement(
                        'div',
                        { className: 'middleColumn' },
                        _react2['default'].createElement(_inputField2['default'], { name: field.name, value: field.value })
                    )
                );
            });
        }

        /**
         * @func onChange
         * @desc Updates the editor state when something changes in the store.
         */
    }, {
        key: 'onChange',
        value: function onChange() {
            this.setState(getEditorStoreState());
        }

        /**
         * @func handleBack
         * @desc Handles clicks on the back button. Switches back to the 'gallery' view.
         */
    }, {
        key: 'handleBack',
        value: function handleBack() {
            _actionEditorActions2['default'].clear(true);
            this.props.setEditing(false);
        }

        /**
         * @func handleSave
         * @desc Handles clicks on the save button
         */
    }, {
        key: 'handleSave',
        value: function handleSave() {}
        // TODO:

        /**
         * @func handleCancel
         * @param {object} event
         * @desc Resets the form to it's origional state.
         */

    }, {
        key: 'handleCancel',
        value: function handleCancel() {
            _actionEditorActions2['default'].update({ name: 'title', value: this.props.item.title });
            _actionEditorActions2['default'].update({ name: 'filename', value: this.props.item.filename });
        }
    }]);

    return Editor;
})(_react2['default'].Component);

Editor.propTypes = {
    item: _react2['default'].PropTypes.object,
    setEditing: _react2['default'].PropTypes.func
};

exports['default'] = Editor;
module.exports = exports['default'];

},{"../action/editorActions":3,"../store/editorStore":13,"./inputField":7,"react":"react"}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _editor = require('./editor');

var _editor2 = _interopRequireDefault(_editor);

var _item = require('./item');

var _item2 = _interopRequireDefault(_item);

var _actionGalleryActions = require('../action/galleryActions');

var _actionGalleryActions2 = _interopRequireDefault(_actionGalleryActions);

var _storeItemStore = require('../store/itemStore');

var _storeItemStore2 = _interopRequireDefault(_storeItemStore);

/**
 * @func getItemStoreState
 * @private
 * @return {object}
 * @desc Factory for getting the current state of the ItemStore.
 */
function getItemStoreState() {
    return {
        items: _storeItemStore2['default'].getAll()
    };
}

var Gallery = (function (_React$Component) {
    _inherits(Gallery, _React$Component);

    function Gallery(props) {
        _classCallCheck(this, Gallery);

        _get(Object.getPrototypeOf(Gallery.prototype), 'constructor', this).call(this, props);

        var items = window.SS_ASSET_GALLERY[this.props.name];

        // Manually bind so listeners are removed correctly
        this.onChange = this.onChange.bind(this);

        _actionGalleryActions2['default'].setStoreProps({
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
            for (var i = 0; i < items.length; i += 1) {
                _actionGalleryActions2['default'].create(items[i], true);
            }
        }

        // Set the initial state of the gallery.
        this.state = _jquery2['default'].extend(getItemStoreState(), { editing: false, currentItem: null });
    }

    _createClass(Gallery, [{
        key: 'componentDidMount',
        value: function componentDidMount() {
            // @todo
            // if we want to hook into dirty checking, we need to find a way of refreshing
            // all loaded data not just the first page again...

            var $content = (0, _jquery2['default'])('.cms-content-fields'),
                $sort = (0, _jquery2['default'])('.gallery__header__sort .dropdown'),
                self = this;

            if ($content.length) {
                $content.on('scroll', function (event) {
                    if ($content[0].scrollHeight - $content[0].scrollTop === $content[0].clientHeight) {
                        _actionGalleryActions2['default'].page();
                    }
                });
            }

            $sort.change(function () {
                self.handleSort((0, _jquery2['default'])(this).val());
            });

            _storeItemStore2['default'].addChangeListener(this.onChange);
        }
    }, {
        key: 'componentWillUnmount',
        value: function componentWillUnmount() {
            _storeItemStore2['default'].removeChangeListener(this.onChange);
        }
    }, {
        key: 'render',
        value: function render() {
            var ReactTestUtils = _react2['default'].addons.TestUtils;

            if (this.state.editing) {
                var editorComponent = this.getEditorComponent();

                return _react2['default'].createElement(
                    'div',
                    { className: 'gallery' },
                    editorComponent
                );
            } else {
                var items = this.getItemComponents();
                var button = null;

                if (_storeItemStore2['default'].hasNavigated()) {
                    button = _react2['default'].createElement(
                        'button',
                        {
                            type: 'button',
                            className: 'ss-ui-button ui-corner-all font-icon-level-up',
                            onClick: this.handleNavigate.bind(this) },
                        'Back'
                    );
                }

                var sorts = _react2['default'].createElement(
                    'div',
                    { className: 'gallery__header__sort fieldholder-small', style: { width: '160px' } },
                    _react2['default'].createElement(
                        'select',
                        { className: 'dropdown no-change-track' },
                        _react2['default'].createElement(
                            'option',
                            { value: 'title' },
                            'name'
                        ),
                        _react2['default'].createElement(
                            'option',
                            { value: 'created' },
                            'created'
                        ),
                        _react2['default'].createElement(
                            'option',
                            { value: 'type' },
                            'type'
                        )
                    )
                );

                return _react2['default'].createElement(
                    'div',
                    { className: 'gallery' },
                    _react2['default'].createElement(
                        'div',
                        { className: 'gallery__header' },
                        button,
                        sorts
                    ),
                    _react2['default'].createElement(
                        'div',
                        { className: 'gallery__header__items' },
                        items
                    )
                );
            }
        }
    }, {
        key: 'handleNavigate',
        value: function handleNavigate() {
            var navigation = _storeItemStore2['default'].popNavigation();

            _actionGalleryActions2['default'].navigate(navigation[1]);
        }
    }, {
        key: 'handleSort',
        value: function handleSort(sortBy) {
            _actionGalleryActions2['default'].sort(sortBy);
        }

        /**
         * @func onChange
         * @desc Updates the gallery state when something changes in the store.
         */
    }, {
        key: 'onChange',
        value: function onChange() {
            this.setState(getItemStoreState());
        }

        /**
         * @func setEditing
         * @param {boolean} isEditing
         * @param {string} [id]
         * @desc Switches between editing and gallery states.
         */
    }, {
        key: 'setEditing',
        value: function setEditing(isEditing, id) {
            var newState = { editing: isEditing };

            if (id !== void 0) {
                var currentItem = _storeItemStore2['default'].getById(id);

                if (currentItem !== void 0) {
                    this.setState(_jquery2['default'].extend(newState, { currentItem: currentItem }));
                }
            } else {
                this.setState(newState);
            }
        }

        /**
         * @func getEditorComponent
         * @desc Generates the editor component.
         */
    }, {
        key: 'getEditorComponent',
        value: function getEditorComponent() {
            var props = {};

            props.item = this.state.currentItem;
            props.setEditing = this.setEditing.bind(this);

            return _react2['default'].createElement(_editor2['default'], props);
        }

        /**
         * @func getItemComponents
         * @desc Generates the item components which populate the gallery.
         */
    }, {
        key: 'getItemComponents',
        value: function getItemComponents() {
            var _this = this;

            var self = this;

            return Object.keys(this.state.items).map(function (key) {
                var item = self.state.items[key],
                    props = {};

                props.attributes = item.attributes;
                props.id = item.id;
                props.setEditing = _this.setEditing.bind(_this);
                props.title = item.title;
                props.url = item.url;
                props.type = item.type;
                props.filename = item.filename;

                return _react2['default'].createElement(_item2['default'], _extends({ key: key }, props));
            });
        }
    }]);

    return Gallery;
})(_react2['default'].Component);

exports['default'] = Gallery;
module.exports = exports['default'];

},{"../action/galleryActions":4,"../store/itemStore":14,"./editor":5,"./item":8,"jquery":"jquery","react":"react"}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _actionEditorActions = require('../action/editorActions');

var _actionEditorActions2 = _interopRequireDefault(_actionEditorActions);

var InputField = (function (_React$Component) {
	_inherits(InputField, _React$Component);

	function InputField() {
		_classCallCheck(this, InputField);

		_get(Object.getPrototypeOf(InputField.prototype), 'constructor', this).apply(this, arguments);
	}

	_createClass(InputField, [{
		key: 'render',
		value: function render() {
			return _react2['default'].createElement('input', { className: 'text', type: 'text', value: this.props.value, onChange: this.handleChange.bind(this) });
		}

		/**
   * @func handleChange
   * @param {object} event
   * @desc Handles the change events on input fields.
   */
	}, {
		key: 'handleChange',
		value: function handleChange(event) {
			_actionEditorActions2['default'].update({ name: this.props.name, value: event.target.value });
		}
	}]);

	return InputField;
})(_react2['default'].Component);

exports['default'] = InputField;
module.exports = exports['default'];

},{"../action/editorActions":3,"react":"react"}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _actionGalleryActions = require('../action/galleryActions');

var _actionGalleryActions2 = _interopRequireDefault(_actionGalleryActions);

var _constants = require('../constants');

var _constants2 = _interopRequireDefault(_constants);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var Item = (function (_React$Component) {
    _inherits(Item, _React$Component);

    function Item() {
        _classCallCheck(this, Item);

        _get(Object.getPrototypeOf(Item.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(Item, [{
        key: 'render',
        value: function render() {
            var styles = this.getImageURL(),
                thumbnailClassNames = 'item__thumbnail',
                itemClassNames = (0, _classnames2['default'])({
                'item': true,
                'folder': this.props.type === 'folder'
            });

            if (this.imageLargerThanThumbnail()) {
                thumbnailClassNames += ' large';
            }

            var navigate = function navigate() {};

            if (this.props.type === 'folder') {
                navigate = this.handleNavigate.bind(this);
            }

            return _react2['default'].createElement(
                'div',
                { className: itemClassNames + ' ' + this.props.type, onClick: navigate },
                _react2['default'].createElement(
                    'div',
                    { className: thumbnailClassNames, style: styles },
                    _react2['default'].createElement(
                        'div',
                        { className: 'item__actions' },
                        _react2['default'].createElement('button', {
                            className: 'item__actions__action item__actions__action--remove [ font-icon-trash ]',
                            type: 'button',
                            onClick: this.handleDelete.bind(this) }),
                        _react2['default'].createElement('button', {
                            className: 'item__actions__action item__actions__action--edit [ font-icon-edit ]',
                            type: 'button',
                            onClick: this.handleEdit.bind(this) })
                    )
                ),
                _react2['default'].createElement(
                    'p',
                    { className: 'item__title' },
                    this.props.title
                )
            );
        }

        /**
         * @func handleEdit
         * @desc Event handler for the 'edit' button.
         */
    }, {
        key: 'handleEdit',
        value: function handleEdit() {
            this.props.setEditing(true, this.props.id);
        }

        /**
         * Event handler for the 'edit' button.
         */
    }, {
        key: 'handleNavigate',
        value: function handleNavigate() {
            _actionGalleryActions2['default'].navigate(this.props.filename);
        }

        /**
         * Event handler for the 'remove' button.
         */
    }, {
        key: 'handleDelete',
        value: function handleDelete() {
            //TODO internationalise confirmation message with transifex if/when merged into core
            if (confirm('Are you sure you want to delete this record?')) {
                _actionGalleryActions2['default'].destroy(this.props.id);
            }
        }

        /**
         * @func getImageURL
         * @desc Return the URL of the image, determined by it's type. 
         */
    }, {
        key: 'getImageURL',
        value: function getImageURL() {
            if (this.props.type.toLowerCase().indexOf('image') > -1) {
                return { backgroundImage: 'url(' + this.props.url + ')' };
            } else {
                return {};
            }
        }

        /**
         * @func imageLargerThanThumbnail
         * @desc Check if an image is larger than the thumbnail container.
         */
    }, {
        key: 'imageLargerThanThumbnail',
        value: function imageLargerThanThumbnail() {
            return this.props.attributes.dimensions.height > _constants2['default'].ITEM_COMPONENT.THUMBNAIL_HEIGHT || this.props.attributes.dimensions.width > _constants2['default'].ITEM_COMPONENT.THUMBNAIL_WIDTH;
        }
    }]);

    return Item;
})(_react2['default'].Component);

Item.propTypes = {
    attributes: _react2['default'].PropTypes.object,
    id: _react2['default'].PropTypes.number,
    setEditing: _react2['default'].PropTypes.func,
    title: _react2['default'].PropTypes.string,
    type: _react2['default'].PropTypes.string,
    url: _react2['default'].PropTypes.string
};

exports['default'] = Item;
module.exports = exports['default'];

},{"../action/galleryActions":4,"../constants":9,"classnames":2,"react":"react"}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
var CONSTANTS = {
	ITEM_STORE: {
		INIT: 'init',
		CHANGE: 'change',
		CREATE: 'create',
		UPDATE: 'update',
		DESTROY: 'destroy',
		NAVIGATE: 'navigate',
		PAGE: 'page',
		SORT: 'sort'
	},
	EDITOR: {
		CHANGE: 'change',
		UPDATE: 'update',
		CLEAR: 'clear'
	},
	ITEM_COMPONENT: {
		THUMBNAIL_HEIGHT: 150,
		THUMBNAIL_WIDTH: 200
	}
};

exports['default'] = CONSTANTS;
module.exports = exports['default'];

},{}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _flux = require('flux');

var _editorDispatcher = new _flux.Dispatcher(); // Singleton

exports['default'] = _editorDispatcher;
module.exports = exports['default'];

},{"flux":"flux"}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _flux = require('flux');

var _galleryDispatcher = new _flux.Dispatcher(); // Singleton

exports['default'] = _galleryDispatcher;
module.exports = exports['default'];

},{"flux":"flux"}],12:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _componentGallery = require('./component/gallery');

var _componentGallery2 = _interopRequireDefault(_componentGallery);

(0, _jquery2['default'])('.asset-gallery').entwine({
	'onadd': function onadd() {
		var props = {};

		props.name = this[0].getAttribute('data-asset-gallery-name');
		props.data_url = this[0].getAttribute('data-asset-gallery-data-url');
		props.update_url = this[0].getAttribute('data-asset-gallery-update-url');
		props.delete_url = this[0].getAttribute('data-asset-gallery-delete-url');
		props.initial_folder = this[0].getAttribute('data-asset-gallery-initial-folder');
		props.limit = this[0].getAttribute('data-asset-gallery-limit');

		props.filter_name = this[0].getAttribute('data-asset-gallery-filter-name');
		props.filter_type = this[0].getAttribute('data-asset-gallery-filter-type');
		props.filter_created_from = this[0].getAttribute('data-asset-gallery-filter-created-from');
		props.filter_created_to = this[0].getAttribute('data-asset-gallery-filter-created-to');
		props.filter_folder = this[0].getAttribute('data-asset-gallery-filter-folder');

		if (props.name === null || props.url === null) {
			return;
		}

		_react2['default'].render(_react2['default'].createElement(_componentGallery2['default'], props), this[0]);
	}
});

},{"./component/gallery":6,"jquery":"jquery","react":"react"}],13:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _dispatcherEditorDispatcher = require('../dispatcher/editorDispatcher');

var _dispatcherEditorDispatcher2 = _interopRequireDefault(_dispatcherEditorDispatcher);

var _actionEditorActions = require('../action/editorActions');

var _actionEditorActions2 = _interopRequireDefault(_actionEditorActions);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _constants = require('../constants');

var _constants2 = _interopRequireDefault(_constants);

var _fields = [];

function create(data) {
	var fieldExists = _fields.filter(function (field) {
		return field.name === data.name;
	}).length > 0;

	if (fieldExists) {
		return;
	}

	_fields.push({
		name: data.name,
		value: data.value
	});
}

function update(data) {
	for (var i = 0; i < _fields.length; i += 1) {
		if (_fields[i].name === data.name) {
			_fields[i] = data;
			break;
		}
	}
}

function clear() {
	_fields = [];
}

var EditorStore = (function (_EventEmitter) {
	_inherits(EditorStore, _EventEmitter);

	function EditorStore() {
		_classCallCheck(this, EditorStore);

		_get(Object.getPrototypeOf(EditorStore.prototype), 'constructor', this).apply(this, arguments);
	}

	_createClass(EditorStore, [{
		key: 'getAll',

		/**
   * @return {object}
   * @desc Gets the entire collection of items.
   */
		value: function getAll() {
			return _fields;
		}

		/**
   * @func emitChange
   * @desc Triggered when something changes in the store.
   */
	}, {
		key: 'emitChange',
		value: function emitChange() {
			this.emit(_constants2['default'].EDITOR.CHANGE);
		}

		/**
   * @param {function} callback
   */
	}, {
		key: 'addChangeListener',
		value: function addChangeListener(callback) {
			this.on(_constants2['default'].EDITOR.CHANGE, callback);
		}

		/**
   * @param {function} callback
   */
	}, {
		key: 'removeChangeListener',
		value: function removeChangeListener(callback) {
			this.removeListener(_constants2['default'].EDITOR.CHANGE, callback);
		}
	}]);

	return EditorStore;
})(_events2['default']);

var _editorStore = new EditorStore(); // Singleton.

_dispatcherEditorDispatcher2['default'].register(function (payload) {

	switch (payload.action) {
		case _constants2['default'].EDITOR.CREATE:
			create(payload.data);

			if (!payload.silent) {
				_editorStore.emitChange();
			}

			break;

		case _constants2['default'].EDITOR.UPDATE:
			update(payload.data);

			if (!payload.silent) {
				_editorStore.emitChange();
			}

			break;

		case _constants2['default'].EDITOR.CLEAR:
			clear();

			if (!payload.silent) {
				_editorStore.emitChange();
			}
	}

	return true; // No errors. Needed by promise in Dispatcher.
});

exports['default'] = _editorStore;
module.exports = exports['default'];

},{"../action/editorActions":3,"../constants":9,"../dispatcher/editorDispatcher":10,"events":1}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _dispatcherGalleryDispatcher = require('../dispatcher/galleryDispatcher');

var _dispatcherGalleryDispatcher2 = _interopRequireDefault(_dispatcherGalleryDispatcher);

var _actionGalleryActions = require('../action/galleryActions');

var _actionGalleryActions2 = _interopRequireDefault(_actionGalleryActions);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _constants = require('../constants');

var _constants2 = _interopRequireDefault(_constants);

var _items = [];
var _folders = [];
var _currentFolder = null;

/**
 * @func init
 * @private
 * @param {object} data
 * @desc Sets properties on the store.
 */
function init(data) {
	_itemStore.page = 1;
	_itemStore.limit = 10;
	_itemStore.sort = 'title';
	_itemStore.direction = 'asc';

	if (data.filter_folder && data.initial_folder && data.filter_folder !== data.initial_folder) {
		_folders.push([data.filter_folder, data.initial_folder]);
	}

	Object.keys(data).map(function (key) {
		_itemStore[key] = data[key];
	});
}

function sort(name, callback) {
	if (_itemStore.sort.toLowerCase() == name.toLowerCase()) {
		if (_itemStore.direction.toLowerCase() == 'asc') {
			_itemStore.direction = 'desc';
		} else {
			_itemStore.direction = 'asc';
		}
	} else {
		_itemStore.sort = name.toLowerCase();
		_itemStore.direction = 'asc';
	}

	callback && callback();
}

/**
 * @func create
 * @private
 * @param {object} itemData
 * @desc Adds a gallery item to the store.
 */
function create(itemData) {
	var itemExists = _items.filter(function (item) {
		return item.id === itemData.id;
	}).length > 0;

	if (itemExists) {
		return;
	}

	_items.push(itemData);
}

/**
 * @func destroy
 * @private
 * @param {int} id
 * @param {function} callback
 * @desc Removes a gallery item from the store.
 */
function destroy(id, callback) {
	_jquery2['default'].ajax({ // @todo fix this junk
		'url': _itemStore.delete_url,
		'data': {
			'id': id
		},
		'dataType': 'json',
		'method': 'GET',
		'success': function success(data) {
			var itemIndex = -1;

			// Get the index of the item we have deleted
			// so it can be removed from the store.
			for (var i = 0; i < _items.length; i += 1) {
				if (_items[i].id === id) {
					itemIndex = i;
					break;
				}
			}

			if (itemIndex === -1) {
				return;
			}

			_items.splice(itemIndex, 1);

			callback && callback();
		}
	});
}

/**
 * Navigates to a new folder.
 *
 * @private
 *
 * @param {string} folder
 * @param {function} callback
 */
function navigate(folder, callback) {
	_itemStore.page = 1;
	_itemStore.filter_folder = folder;

	var data = {
		'page': _itemStore.page++,
		'limit': _itemStore.limit
	};

	['filter_folder', 'filter_name', 'filter_type', 'filter_created_from', 'filter_created_to'].forEach(function (type) {
		if (_itemStore[type]) {
			data[type] = _itemStore[type];
		}
	});

	_jquery2['default'].ajax({
		'url': _itemStore.data_url,
		'dataType': 'json',
		'data': data,
		'success': function success(data) {
			_items = [];

			_itemStore.count = data.count;

			var $search = (0, _jquery2['default'])('.cms-search-form');

			if ($search.find('[type=hidden][name="q[Folder]"]').length == 0) {
				$search.append('<input type="hidden" name="q[Folder]" />');
			}

			if (folder.substr(-1) === '/') {
				folder = folder.substr(0, folder.length - 1);
			}

			$search.find('[type=hidden][name="q[Folder]"]').val(encodeURIComponent(folder));

			if (folder !== _itemStore.initial_folder) {
				_folders.push([folder, _currentFolder || _itemStore.initial_folder]);
			}

			_currentFolder = folder;

			data.files.forEach(function (item) {
				_actionGalleryActions2['default'].create(item, true);
			});

			callback && callback();
		}
	});
}

function page(callback) {
	if (_items.length < _itemStore.count) {
		(function () {
			var data = {
				'page': _itemStore.page++,
				'limit': _itemStore.limit
			};

			['filter_folder', 'filter_name', 'filter_type', 'filter_created_from', 'filter_created_to'].forEach(function (type) {
				if (_itemStore[type]) {
					data[type] = _itemStore[type];
				}
			});

			_jquery2['default'].ajax({
				'url': _itemStore.data_url,
				'dataType': 'json',
				'data': data,
				'success': function success(data) {
					data.files.forEach(function (item) {
						_actionGalleryActions2['default'].create(item, true);
					});

					callback && callback();
				}
			});
		})();
	}
}

/**
 * @func update
 * @private
 * @param {string} id
 * @param {object} itemData
 * @desc Updates an item in the store.
 */
function update(id, itemData) {
	// TODO:
}

var ItemStore = (function (_EventEmitter) {
	_inherits(ItemStore, _EventEmitter);

	function ItemStore() {
		_classCallCheck(this, ItemStore);

		_get(Object.getPrototypeOf(ItemStore.prototype), 'constructor', this).apply(this, arguments);
	}

	_createClass(ItemStore, [{
		key: 'hasNavigated',

		/**
   * Checks if the gallery has been navigated.
   */
		value: function hasNavigated() {
			return _folders.length > 0;
		}

		/**
   * Gets the folder stack.
   */
	}, {
		key: 'popNavigation',
		value: function popNavigation() {
			return _folders.pop();
		}

		/**
   * @return {object}
   * @desc Gets the entire collection of items.
   */
	}, {
		key: 'getAll',
		value: function getAll() {
			return _items.sort(function (a, b) {
				var sort = _itemStore.sort.toLowerCase();
				var direction = _itemStore.direction.toLowerCase();

				if (direction == 'asc') {
					if (a[sort] < b[sort]) {
						return -1;
					}

					if (a[sort] > b[sort]) {
						return 1;
					}

					return 0;
				}

				if (a[sort] > b[sort]) {
					return -1;
				}

				if (a[sort] < b[sort]) {
					return 1;
				}

				return 0;
			});
		}

		/**
   * @func getById
   * @param {string} id
   * @return {object}
   */
	}, {
		key: 'getById',
		value: function getById(id) {
			var item = null;

			for (var i = 0; i < _items.length; i += 1) {
				if (_items[i].id === id) {
					item = _items[i];
					break;
				}
			}

			return item;
		}

		/**
   * @func emitChange
   * @desc Triggered when something changes in the store.
   */
	}, {
		key: 'emitChange',
		value: function emitChange() {
			this.emit(_constants2['default'].ITEM_STORE.CHANGE);
		}

		/**
   * @param {function} callback
   */
	}, {
		key: 'addChangeListener',
		value: function addChangeListener(callback) {
			this.on(_constants2['default'].ITEM_STORE.CHANGE, callback);
		}

		/**
   * @param {function} callback
   */
	}, {
		key: 'removeChangeListener',
		value: function removeChangeListener(callback) {
			this.removeListener(_constants2['default'].ITEM_STORE.CHANGE, callback);
		}
	}]);

	return ItemStore;
})(_events2['default']);

var _itemStore = new ItemStore(); // Singleton

_dispatcherGalleryDispatcher2['default'].register(function (payload) {
	switch (payload.action) {
		case _constants2['default'].ITEM_STORE.INIT:
			init(payload.data);

			if (!payload.silent) {
				_itemStore.emitChange();
			}

			break;

		case _constants2['default'].ITEM_STORE.CREATE:
			create(payload.data);

			if (!payload.silent) {
				_itemStore.emitChange();
			}

			break;

		case _constants2['default'].ITEM_STORE.DESTROY:
			destroy(payload.data.id, function () {
				if (!payload.silent) {
					_itemStore.emitChange();
				}
			});

			break;

		case _constants2['default'].ITEM_STORE.NAVIGATE:
			navigate(payload.data.folder, function () {
				if (!payload.silent) {
					_itemStore.emitChange();
				}
			});

			break;

		case _constants2['default'].ITEM_STORE.UPDATE:
			update(payload.data.id, payload.data.updates);

			if (!payload.silent) {
				_itemStore.emitChange();
			}

			break;

		case _constants2['default'].ITEM_STORE.PAGE:
			page(function () {
				if (!payload.silent) {
					_itemStore.emitChange();
				}
			});

			break;

		case _constants2['default'].ITEM_STORE.SORT:
			sort(payload.data.name, function () {
				if (!payload.silent) {
					_itemStore.emitChange();
				}
			});

			break;
	}

	return true; // No errors. Needed by promise in Dispatcher.
});

exports['default'] = _itemStore;
module.exports = exports['default'];

},{"../action/galleryActions":4,"../constants":9,"../dispatcher/galleryDispatcher":11,"events":1,"jquery":"jquery"}]},{},[12])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9jbGFzc25hbWVzL2luZGV4LmpzIiwiL1VzZXJzL3NodXRjaGluc29uL0RvY3VtZW50cy9TaXRlcy80L2Fzc2V0LWdhbGxlcnktZmllbGQvcHVibGljL3NyYy9hY3Rpb24vZWRpdG9yQWN0aW9ucy5qcyIsIi9Vc2Vycy9zaHV0Y2hpbnNvbi9Eb2N1bWVudHMvU2l0ZXMvNC9hc3NldC1nYWxsZXJ5LWZpZWxkL3B1YmxpYy9zcmMvYWN0aW9uL2dhbGxlcnlBY3Rpb25zLmpzIiwiL1VzZXJzL3NodXRjaGluc29uL0RvY3VtZW50cy9TaXRlcy80L2Fzc2V0LWdhbGxlcnktZmllbGQvcHVibGljL3NyYy9jb21wb25lbnQvZWRpdG9yLmpzIiwiL1VzZXJzL3NodXRjaGluc29uL0RvY3VtZW50cy9TaXRlcy80L2Fzc2V0LWdhbGxlcnktZmllbGQvcHVibGljL3NyYy9jb21wb25lbnQvZ2FsbGVyeS5qcyIsIi9Vc2Vycy9zaHV0Y2hpbnNvbi9Eb2N1bWVudHMvU2l0ZXMvNC9hc3NldC1nYWxsZXJ5LWZpZWxkL3B1YmxpYy9zcmMvY29tcG9uZW50L2lucHV0RmllbGQuanMiLCIvVXNlcnMvc2h1dGNoaW5zb24vRG9jdW1lbnRzL1NpdGVzLzQvYXNzZXQtZ2FsbGVyeS1maWVsZC9wdWJsaWMvc3JjL2NvbXBvbmVudC9pdGVtLmpzIiwiL1VzZXJzL3NodXRjaGluc29uL0RvY3VtZW50cy9TaXRlcy80L2Fzc2V0LWdhbGxlcnktZmllbGQvcHVibGljL3NyYy9jb25zdGFudHMuanMiLCIvVXNlcnMvc2h1dGNoaW5zb24vRG9jdW1lbnRzL1NpdGVzLzQvYXNzZXQtZ2FsbGVyeS1maWVsZC9wdWJsaWMvc3JjL2Rpc3BhdGNoZXIvZWRpdG9yRGlzcGF0Y2hlci5qcyIsIi9Vc2Vycy9zaHV0Y2hpbnNvbi9Eb2N1bWVudHMvU2l0ZXMvNC9hc3NldC1nYWxsZXJ5LWZpZWxkL3B1YmxpYy9zcmMvZGlzcGF0Y2hlci9nYWxsZXJ5RGlzcGF0Y2hlci5qcyIsIi9Vc2Vycy9zaHV0Y2hpbnNvbi9Eb2N1bWVudHMvU2l0ZXMvNC9hc3NldC1nYWxsZXJ5LWZpZWxkL3B1YmxpYy9zcmMvbWFpbi5qcyIsIi9Vc2Vycy9zaHV0Y2hpbnNvbi9Eb2N1bWVudHMvU2l0ZXMvNC9hc3NldC1nYWxsZXJ5LWZpZWxkL3B1YmxpYy9zcmMvc3RvcmUvZWRpdG9yU3RvcmUuanMiLCIvVXNlcnMvc2h1dGNoaW5zb24vRG9jdW1lbnRzL1NpdGVzLzQvYXNzZXQtZ2FsbGVyeS1maWVsZC9wdWJsaWMvc3JjL3N0b3JlL2l0ZW1TdG9yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7OzBDQ2hENkIsZ0NBQWdDOzs7O3lCQUN2QyxjQUFjOzs7O0FBRXBDLElBQUksYUFBYSxHQUFHOztBQUVuQixPQUFNLEVBQUEsZ0JBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRTtBQUNwQiwwQ0FBaUIsUUFBUSxDQUFDO0FBQ3pCLFNBQU0sRUFBRSx1QkFBVSxNQUFNLENBQUMsTUFBTTtBQUMvQixPQUFJLEVBQUUsSUFBSTtBQUNWLFNBQU0sRUFBRSxNQUFNO0dBQ2QsQ0FBQyxDQUFDO0VBQ0g7O0FBRUQsT0FBTSxFQUFBLGdCQUFDLElBQUksRUFBRSxNQUFNLEVBQUU7QUFDcEIsMENBQWlCLFFBQVEsQ0FBQztBQUN6QixTQUFNLEVBQUUsdUJBQVUsTUFBTSxDQUFDLE1BQU07QUFDL0IsT0FBSSxFQUFFLElBQUk7QUFDVixTQUFNLEVBQUUsTUFBTTtHQUNkLENBQUMsQ0FBQztFQUNIOztBQUVELE1BQUssRUFBQSxlQUFDLE1BQU0sRUFBRTtBQUNiLDBDQUFpQixRQUFRLENBQUM7QUFDekIsU0FBTSxFQUFFLHVCQUFVLE1BQU0sQ0FBQyxLQUFLO0FBQzlCLFNBQU0sRUFBRSxNQUFNO0dBQ2QsQ0FBQyxDQUFDO0VBQ0g7O0NBRUQsQ0FBQTs7cUJBRWMsYUFBYTs7Ozs7Ozs7Ozs7OzJDQzlCRSxpQ0FBaUM7Ozs7eUJBQ3pDLGNBQWM7Ozs7QUFFcEMsSUFBSSxjQUFjLEdBQUc7Ozs7OztBQU1wQixjQUFhLEVBQUEsdUJBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRTtBQUMzQiwyQ0FBa0IsUUFBUSxDQUFDO0FBQzFCLFNBQU0sRUFBRSx1QkFBVSxVQUFVLENBQUMsSUFBSTtBQUNqQyxPQUFJLEVBQUUsSUFBSTtBQUNWLFNBQU0sRUFBRSxNQUFNO0dBQ2QsQ0FBQyxDQUFDO0VBQ0g7Ozs7Ozs7QUFPRCxPQUFNLEVBQUEsZ0JBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRTtBQUNwQiwyQ0FBa0IsUUFBUSxDQUFDO0FBQzFCLFNBQU0sRUFBRSx1QkFBVSxVQUFVLENBQUMsTUFBTTtBQUNuQyxPQUFJLEVBQUUsSUFBSTtBQUNWLFNBQU0sRUFBRSxNQUFNO0dBQ2QsQ0FBQyxDQUFDO0VBQ0g7Ozs7Ozs7OztBQVNELFFBQU8sRUFBQSxpQkFBQyxFQUFFLEVBQUUsTUFBTSxFQUFFO0FBQ25CLDJDQUFrQixRQUFRLENBQUM7QUFDMUIsU0FBTSxFQUFFLHVCQUFVLFVBQVUsQ0FBQyxPQUFPO0FBQ3BDLE9BQUksRUFBRTtBQUNMLE1BQUUsRUFBRSxFQUFFO0lBQ047QUFDRCxTQUFNLEVBQUUsTUFBTTtHQUNkLENBQUMsQ0FBQztFQUNIOzs7Ozs7OztBQVFELE9BQU0sRUFBQSxnQkFBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRTtBQUMzQiwyQ0FBa0IsUUFBUSxDQUFDO0FBQzFCLFNBQU0sRUFBRSx1QkFBVSxVQUFVLENBQUMsTUFBTTtBQUNuQyxPQUFJLEVBQUU7QUFDTCxNQUFFLEVBQUUsRUFBRTtBQUNOLFdBQU8sRUFBRSxPQUFPO0lBQ2hCO0FBQ0QsU0FBTSxFQUFFLE1BQU07R0FDZCxDQUFDLENBQUM7RUFDSDs7Ozs7Ozs7QUFRRCxTQUFRLEVBQUEsa0JBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRTtBQUN4QiwyQ0FBa0IsUUFBUSxDQUFDO0FBQzFCLFNBQU0sRUFBRSx1QkFBVSxVQUFVLENBQUMsUUFBUTtBQUNyQyxPQUFJLEVBQUU7QUFDTCxZQUFRLEVBQUUsTUFBTTtJQUNoQjtBQUNELFNBQU0sRUFBRSxNQUFNO0dBQ2QsQ0FBQyxDQUFDO0VBQ0g7Ozs7Ozs7QUFPRCxLQUFJLEVBQUEsY0FBQyxNQUFNLEVBQUU7QUFDWiwyQ0FBa0IsUUFBUSxDQUFDO0FBQzFCLFNBQU0sRUFBRSx1QkFBVSxVQUFVLENBQUMsSUFBSTtBQUNqQyxTQUFNLEVBQUUsTUFBTTtHQUNkLENBQUMsQ0FBQztFQUNIOzs7Ozs7O0FBT0QsS0FBSSxFQUFBLGNBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRTtBQUNsQiwyQ0FBa0IsUUFBUSxDQUFDO0FBQzFCLFNBQU0sRUFBRSx1QkFBVSxVQUFVLENBQUMsSUFBSTtBQUNqQyxPQUFJLEVBQUU7QUFDTCxVQUFNLEVBQUUsSUFBSTtJQUNaO0FBQ0QsU0FBTSxFQUFFLE1BQU07R0FDZCxDQUFDLENBQUM7RUFDSDtDQUNELENBQUM7O3FCQUVhLGNBQWM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O3FCQzVHWCxPQUFPOzs7OzBCQUNGLGNBQWM7Ozs7bUNBQ1gseUJBQXlCOzs7O2dDQUMzQixzQkFBc0I7Ozs7Ozs7Ozs7QUFROUMsU0FBUyxtQkFBbUIsR0FBRztBQUMzQixXQUFPO0FBQ0gsY0FBTSxFQUFFLDhCQUFZLE1BQU0sRUFBRTtLQUMvQixDQUFDO0NBQ0w7Ozs7Ozs7SUFNSyxNQUFNO2NBQU4sTUFBTTs7QUFFRyxhQUZULE1BQU0sQ0FFSSxLQUFLLEVBQUU7OEJBRmpCLE1BQU07O0FBR0osbUNBSEYsTUFBTSw2Q0FHRSxLQUFLLEVBQUU7OztBQUdiLFlBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7OztBQUd6Qyx5Q0FBYyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3ZFLHlDQUFjLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7O0FBRTdFLFlBQUksQ0FBQyxLQUFLLEdBQUcsbUJBQW1CLEVBQUUsQ0FBQztLQUN0Qzs7aUJBYkMsTUFBTTs7ZUFlVSw2QkFBRztBQUNqQiwwQ0FBWSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDaEQ7OztlQUVvQixnQ0FBRztBQUNwQiwwQ0FBWSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDbkQ7OztlQUVLLGtCQUFHO0FBQ0wsZ0JBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDOztBQUUvQyxtQkFDSTs7a0JBQUssU0FBUyxFQUFDLFFBQVE7Z0JBQ25COzs7QUFDSSw0QkFBSSxFQUFDLFFBQVE7QUFDYixpQ0FBUyxFQUFDLCtDQUErQztBQUN6RCwrQkFBTyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxBQUFDOztpQkFFM0I7Z0JBQ2I7OztvQkFDSTs7MEJBQUssU0FBUyxFQUFDLGdEQUFnRDt3QkFDM0Q7OzhCQUFLLFNBQVMsRUFBQyx3REFBd0Q7NEJBQ25FLDBDQUFLLFNBQVMsRUFBQyxtQkFBbUIsRUFBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxBQUFDLEdBQUc7eUJBQzdEO3dCQUNOOzs4QkFBSyxTQUFTLEVBQUMscURBQXFEOzRCQUNoRTs7a0NBQUssU0FBUyxFQUFDLGtDQUFrQztnQ0FDN0M7O3NDQUFLLFNBQVMsRUFBQyxnQkFBZ0I7b0NBQzNCOzswQ0FBTyxTQUFTLEVBQUMsTUFBTTs7cUNBQW1CO29DQUMxQzs7MENBQUssU0FBUyxFQUFDLGNBQWM7d0NBQ3pCOzs4Q0FBTSxTQUFTLEVBQUMsVUFBVTs0Q0FBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJO3lDQUFRO3FDQUN0RDtpQ0FDSjs2QkFDSjs0QkFDTjs7a0NBQUssU0FBUyxFQUFDLGdCQUFnQjtnQ0FDM0I7O3NDQUFPLFNBQVMsRUFBQyxNQUFNOztpQ0FBbUI7Z0NBQzFDOztzQ0FBSyxTQUFTLEVBQUMsY0FBYztvQ0FDekI7OzBDQUFNLFNBQVMsRUFBQyxVQUFVO3dDQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUk7cUNBQVE7aUNBQ3REOzZCQUNKOzRCQUNOOztrQ0FBSyxTQUFTLEVBQUMsZ0JBQWdCO2dDQUMzQjs7c0NBQU8sU0FBUyxFQUFDLE1BQU07O2lDQUFhO2dDQUNwQzs7c0NBQUssU0FBUyxFQUFDLGNBQWM7b0NBQ3pCOzswQ0FBTSxTQUFTLEVBQUMsVUFBVTt3Q0FDdEI7OzhDQUFHLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEFBQUMsRUFBQyxNQUFNLEVBQUMsUUFBUTs0Q0FBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHO3lDQUFLO3FDQUNwRTtpQ0FDTDs2QkFDSjs0QkFDTjs7a0NBQUssU0FBUyxFQUFDLDhCQUE4QjtnQ0FDekM7O3NDQUFPLFNBQVMsRUFBQyxNQUFNOztpQ0FBd0I7Z0NBQy9DOztzQ0FBSyxTQUFTLEVBQUMsY0FBYztvQ0FDekI7OzBDQUFNLFNBQVMsRUFBQyxVQUFVO3dDQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU87cUNBQVE7aUNBQ3pEOzZCQUNKOzRCQUNOOztrQ0FBSyxTQUFTLEVBQUMsOEJBQThCO2dDQUN6Qzs7c0NBQU8sU0FBUyxFQUFDLE1BQU07O2lDQUFzQjtnQ0FDN0M7O3NDQUFLLFNBQVMsRUFBQyxjQUFjO29DQUN6Qjs7MENBQU0sU0FBUyxFQUFDLFVBQVU7d0NBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVztxQ0FBUTtpQ0FDN0Q7NkJBQ0o7NEJBQ047O2tDQUFLLFNBQVMsRUFBQyxnQkFBZ0I7Z0NBQzNCOztzQ0FBTyxTQUFTLEVBQUMsTUFBTTs7aUNBQW9CO2dDQUMzQzs7c0NBQUssU0FBUyxFQUFDLGNBQWM7b0NBQ3pCOzswQ0FBTSxTQUFTLEVBQUMsVUFBVTt3Q0FBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEtBQUs7O3dDQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTTs7cUNBQVU7aUNBQ2hJOzZCQUNKO3lCQUNKO3FCQUNKO29CQUVMLFVBQVU7b0JBRVg7Ozt3QkFDSTs7OEJBQVEsSUFBSSxFQUFDLFFBQVEsRUFBQyxTQUFTLEVBQUMsaURBQWlEOzt5QkFBYzt3QkFDL0Y7OzhCQUFRLElBQUksRUFBQyxRQUFRLEVBQUMsU0FBUyxFQUFDLHFEQUFxRCxFQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQUFBQzs7eUJBQWlCO3FCQUMzSTtpQkFDSDthQUNMLENBQ1I7U0FDTDs7Ozs7Ozs7ZUFNcUIsa0NBQUc7OztBQUNyQixtQkFBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUMsR0FBRyxFQUFLO0FBQy9DLG9CQUFJLEtBQUssR0FBRyxNQUFLLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7O0FBRW5DLHVCQUNJOztzQkFBSyxTQUFTLEVBQUMsWUFBWSxFQUFDLEdBQUcsRUFBRSxHQUFHLEFBQUM7b0JBQ2pDOzswQkFBTyxTQUFTLEVBQUMsTUFBTTt3QkFBRSxLQUFLLENBQUMsSUFBSTtxQkFBUztvQkFDNUM7OzBCQUFLLFNBQVMsRUFBQyxjQUFjO3dCQUN6Qiw0REFBWSxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQUFBQyxFQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxBQUFDLEdBQUc7cUJBQ2xEO2lCQUNKLENBQ1Q7YUFDSixDQUFDLENBQUM7U0FDTjs7Ozs7Ozs7ZUFNTyxvQkFBRztBQUNQLGdCQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQztTQUN4Qzs7Ozs7Ozs7ZUFNUyxzQkFBRztBQUNULDZDQUFjLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxQixnQkFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDaEM7Ozs7Ozs7O2VBTVMsc0JBQUcsRUFFWjs7Ozs7Ozs7QUFBQTs7O2VBT1csd0JBQUc7QUFDWCw2Q0FBYyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0FBQ3RFLDZDQUFjLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7U0FDL0U7OztXQWxKQyxNQUFNO0dBQVMsbUJBQU0sU0FBUzs7QUFzSnBDLE1BQU0sQ0FBQyxTQUFTLEdBQUc7QUFDZixRQUFJLEVBQUUsbUJBQU0sU0FBUyxDQUFDLE1BQU07QUFDNUIsY0FBVSxFQUFFLG1CQUFNLFNBQVMsQ0FBQyxJQUFJO0NBQ25DLENBQUM7O3FCQUVhLE1BQU07Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7cUJDaExILE9BQU87Ozs7c0JBQ1gsUUFBUTs7OztzQkFDSCxVQUFVOzs7O29CQUNaLFFBQVE7Ozs7b0NBQ0UsMEJBQTBCOzs7OzhCQUMvQixvQkFBb0I7Ozs7Ozs7Ozs7QUFRMUMsU0FBUyxpQkFBaUIsR0FBRztBQUN6QixXQUFPO0FBQ0gsYUFBSyxFQUFFLDRCQUFVLE1BQU0sRUFBRTtLQUM1QixDQUFDO0NBQ0w7O0lBRUssT0FBTztjQUFQLE9BQU87O0FBRUUsYUFGVCxPQUFPLENBRUcsS0FBSyxFQUFFOzhCQUZqQixPQUFPOztBQUdMLG1DQUhGLE9BQU8sNkNBR0MsS0FBSyxFQUFFOztBQUViLFlBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDOzs7QUFHckQsWUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs7QUFFekMsMENBQWUsYUFBYSxDQUFDO0FBQ3pCLG9CQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7QUFDeEIsc0JBQVUsRUFBRSxLQUFLLENBQUMsVUFBVTtBQUM1QixzQkFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVO0FBQzVCLDBCQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWM7QUFDcEMsaUJBQUssRUFBRSxLQUFLLENBQUMsS0FBSztBQUNsQix5QkFBYSxFQUFFLEtBQUssQ0FBQyxhQUFhO0FBQ2xDLHVCQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7QUFDOUIsdUJBQVcsRUFBRSxLQUFLLENBQUMsV0FBVztBQUM5QiwrQkFBbUIsRUFBRSxLQUFLLENBQUMsbUJBQW1CO0FBQzlDLDZCQUFpQixFQUFFLEtBQUssQ0FBQyxpQkFBaUI7U0FDN0MsQ0FBQyxDQUFDOzs7QUFHSCxZQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUMzQixpQkFBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUN0QyxrREFBZSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ3pDO1NBQ0o7OztBQUdELFlBQUksQ0FBQyxLQUFLLEdBQUcsb0JBQUUsTUFBTSxDQUFDLGlCQUFpQixFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0tBQ3JGOztpQkFoQ0MsT0FBTzs7ZUFrQ1MsNkJBQUc7Ozs7O0FBS2pCLGdCQUFJLFFBQVEsR0FBRyx5QkFBRSxxQkFBcUIsQ0FBQztnQkFDbkMsS0FBSyxHQUFHLHlCQUFFLGtDQUFrQyxDQUFDO2dCQUM3QyxJQUFJLEdBQUcsSUFBSSxDQUFDOztBQUVoQixnQkFBSSxRQUFRLENBQUMsTUFBTSxFQUFFO0FBQ2pCLHdCQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxVQUFDLEtBQUssRUFBSztBQUM3Qix3QkFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRTtBQUMvRSwwREFBZSxJQUFJLEVBQUUsQ0FBQztxQkFDekI7aUJBQ0osQ0FBQyxDQUFDO2FBQ047O0FBRUQsaUJBQUssQ0FBQyxNQUFNLENBQUMsWUFBWTtBQUNyQixvQkFBSSxDQUFDLFVBQVUsQ0FBQyx5QkFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO2FBQ2xDLENBQUMsQ0FBQzs7QUFFSCx3Q0FBVSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDOUM7OztlQUVvQixnQ0FBRztBQUNwQix3Q0FBVSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDakQ7OztlQUVLLGtCQUFHO0FBQ0wsZ0JBQUksY0FBYyxHQUFHLG1CQUFNLE1BQU0sQ0FBQyxTQUFTLENBQUM7O0FBRTVDLGdCQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFO0FBQ3BCLG9CQUFJLGVBQWUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQzs7QUFFaEQsdUJBQ0k7O3NCQUFLLFNBQVMsRUFBQyxTQUFTO29CQUNuQixlQUFlO2lCQUNkLENBQ1I7YUFDTCxNQUFNO0FBQ0gsb0JBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0FBQ3JDLG9CQUFJLE1BQU0sR0FBRyxJQUFJLENBQUM7O0FBRWxCLG9CQUFJLDRCQUFVLFlBQVksRUFBRSxFQUFFO0FBQzFCLDBCQUFNLEdBQUc7OztBQUNMLGdDQUFJLEVBQUMsUUFBUTtBQUNiLHFDQUFTLEVBQUMsK0NBQStDO0FBQ3pELG1DQUFPLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEFBQUM7O3FCQUVuQyxDQUFDO2lCQUNiOztBQUVELG9CQUFJLEtBQUssR0FBRzs7c0JBQUssU0FBUyxFQUFDLHlDQUF5QyxFQUFDLEtBQUssRUFBRSxFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUMsQUFBQztvQkFDekY7OzBCQUFRLFNBQVMsRUFBQywwQkFBMEI7d0JBQ3hDOzs4QkFBUSxLQUFLLEVBQUMsT0FBTzs7eUJBRVo7d0JBQ1Q7OzhCQUFRLEtBQUssRUFBQyxTQUFTOzt5QkFFZDt3QkFDVDs7OEJBQVEsS0FBSyxFQUFDLE1BQU07O3lCQUVYO3FCQUNKO2lCQUNQLENBQUM7O0FBRVAsdUJBQ0k7O3NCQUFLLFNBQVMsRUFBQyxTQUFTO29CQUNwQjs7MEJBQUssU0FBUyxFQUFDLGlCQUFpQjt3QkFDM0IsTUFBTTt3QkFDTixLQUFLO3FCQUNKO29CQUNOOzswQkFBSyxTQUFTLEVBQUMsd0JBQXdCO3dCQUNsQyxLQUFLO3FCQUNKO2lCQUNKLENBQ1I7YUFDTDtTQUNKOzs7ZUFFYSwwQkFBRztBQUNiLGdCQUFJLFVBQVUsR0FBRyw0QkFBVSxhQUFhLEVBQUUsQ0FBQzs7QUFFM0MsOENBQWUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzFDOzs7ZUFFUyxvQkFBQyxNQUFNLEVBQUU7QUFDZiw4Q0FBZSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDL0I7Ozs7Ozs7O2VBTU8sb0JBQUc7QUFDUCxnQkFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7U0FDdEM7Ozs7Ozs7Ozs7ZUFRUyxvQkFBQyxTQUFTLEVBQUUsRUFBRSxFQUFFO0FBQ3RCLGdCQUFJLFFBQVEsR0FBRyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsQ0FBQzs7QUFFdEMsZ0JBQUksRUFBRSxLQUFLLEtBQUssQ0FBQyxFQUFFO0FBQ2Ysb0JBQUksV0FBVyxHQUFHLDRCQUFVLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQzs7QUFFeEMsb0JBQUksV0FBVyxLQUFLLEtBQUssQ0FBQyxFQUFFO0FBQ3hCLHdCQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO2lCQUNuRTthQUNKLE1BQU07QUFDSCxvQkFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUMzQjtTQUNKOzs7Ozs7OztlQU1pQiw4QkFBRztBQUNqQixnQkFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDOztBQUVmLGlCQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDO0FBQ3BDLGlCQUFLLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOztBQUU5QyxtQkFDSSxzREFBWSxLQUFLLENBQUksQ0FDdkI7U0FDTDs7Ozs7Ozs7ZUFNZ0IsNkJBQUc7OztBQUNoQixnQkFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDOztBQUVoQixtQkFBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUMsR0FBRyxFQUFLO0FBQzlDLG9CQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7b0JBQzVCLEtBQUssR0FBRyxFQUFFLENBQUM7O0FBRWYscUJBQUssQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztBQUNuQyxxQkFBSyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO0FBQ25CLHFCQUFLLENBQUMsVUFBVSxHQUFHLE1BQUssVUFBVSxDQUFDLElBQUksT0FBTSxDQUFDO0FBQzlDLHFCQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDekIscUJBQUssQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztBQUNyQixxQkFBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQ3ZCLHFCQUFLLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7O0FBRS9CLHVCQUNJLCtEQUFNLEdBQUcsRUFBRSxHQUFHLEFBQUMsSUFBSyxLQUFLLEVBQUksQ0FDL0I7YUFDTCxDQUFDLENBQUM7U0FDTjs7O1dBOUxDLE9BQU87R0FBUyxtQkFBTSxTQUFTOztxQkFpTXRCLE9BQU87Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O3FCQ3BOSixPQUFPOzs7O21DQUNDLHlCQUF5Qjs7OztJQUU3QyxVQUFVO1dBQVYsVUFBVTs7VUFBVixVQUFVO3dCQUFWLFVBQVU7OzZCQUFWLFVBQVU7OztjQUFWLFVBQVU7O1NBRVQsa0JBQUc7QUFDUixVQUNDLDRDQUFPLFNBQVMsRUFBQyxNQUFNLEVBQUMsSUFBSSxFQUFDLE1BQU0sRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEFBQUMsRUFBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEFBQUMsR0FBRyxDQUN0RztHQUNGOzs7Ozs7Ozs7U0FPVyxzQkFBQyxLQUFLLEVBQUU7QUFDbkIsb0NBQWMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7R0FDM0U7OztRQWZJLFVBQVU7R0FBUyxtQkFBTSxTQUFTOztxQkFtQnpCLFVBQVU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O3FCQ3RCUCxPQUFPOzs7O29DQUNFLDBCQUEwQjs7Ozt5QkFDL0IsY0FBYzs7OzswQkFDYixZQUFZOzs7O0lBRTdCLElBQUk7Y0FBSixJQUFJOzthQUFKLElBQUk7OEJBQUosSUFBSTs7bUNBQUosSUFBSTs7O2lCQUFKLElBQUk7O2VBRUEsa0JBQUc7QUFDTCxnQkFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRTtnQkFDM0IsbUJBQW1CLEdBQUcsaUJBQWlCO2dCQUN2QyxjQUFjLEdBQUcsNkJBQVc7QUFDeEIsc0JBQU0sRUFBRSxJQUFJO0FBQ1osd0JBQVEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxRQUFRO2FBQ3pDLENBQUMsQ0FBQzs7QUFFUCxnQkFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsRUFBRTtBQUNqQyxtQ0FBbUIsSUFBSSxRQUFRLENBQUM7YUFDbkM7O0FBRUQsZ0JBQUksUUFBUSxHQUFHLG9CQUFVLEVBRXhCLENBQUM7O0FBRUYsZ0JBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO0FBQzlCLHdCQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDN0M7O0FBRUQsbUJBQ0k7O2tCQUFLLFNBQVMsRUFBRSxjQUFjLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxBQUFDLEVBQUMsT0FBTyxFQUFFLFFBQVEsQUFBQztnQkFDdEU7O3NCQUFLLFNBQVMsRUFBRSxtQkFBbUIsQUFBQyxFQUFDLEtBQUssRUFBRSxNQUFNLEFBQUM7b0JBQy9DOzswQkFBSyxTQUFTLEVBQUMsZUFBZTt3QkFDMUI7QUFDSSxxQ0FBUyxFQUFDLHlFQUF5RTtBQUNuRixnQ0FBSSxFQUFDLFFBQVE7QUFDYixtQ0FBTyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxBQUFDLEdBQzdCO3dCQUNiO0FBQ0kscUNBQVMsRUFBQyxzRUFBc0U7QUFDaEYsZ0NBQUksRUFBQyxRQUFRO0FBQ2IsbUNBQU8sRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQUFBQyxHQUMzQjtxQkFDWDtpQkFDSjtnQkFDTjs7c0JBQUcsU0FBUyxFQUFDLGFBQWE7b0JBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLO2lCQUFLO2FBQy9DLENBQ1I7U0FDTDs7Ozs7Ozs7ZUFNUyxzQkFBRztBQUNULGdCQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUM5Qzs7Ozs7OztlQUthLDBCQUFHO0FBQ2IsOENBQWUsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDaEQ7Ozs7Ozs7ZUFLVyx3QkFBRzs7QUFFWCxnQkFBSSxPQUFPLENBQUMsOENBQThDLENBQUMsRUFBRTtBQUN6RCxrREFBZSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUN6QztTQUNKOzs7Ozs7OztlQU1VLHVCQUFHO0FBQ1YsZ0JBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO0FBQ3JELHVCQUFPLEVBQUMsZUFBZSxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLEVBQUMsQ0FBQzthQUMzRCxNQUFNO0FBQ0gsdUJBQU8sRUFBRSxDQUFDO2FBQ2I7U0FDSjs7Ozs7Ozs7ZUFNdUIsb0NBQUc7QUFDdkIsbUJBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyx1QkFBVSxjQUFjLENBQUMsZ0JBQWdCLElBQ25GLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEdBQUcsdUJBQVUsY0FBYyxDQUFDLGVBQWUsQ0FBQztTQUM1Rjs7O1dBdkZDLElBQUk7R0FBUyxtQkFBTSxTQUFTOztBQTBGbEMsSUFBSSxDQUFDLFNBQVMsR0FBRztBQUNiLGNBQVUsRUFBRSxtQkFBTSxTQUFTLENBQUMsTUFBTTtBQUNsQyxNQUFFLEVBQUUsbUJBQU0sU0FBUyxDQUFDLE1BQU07QUFDMUIsY0FBVSxFQUFFLG1CQUFNLFNBQVMsQ0FBQyxJQUFJO0FBQ2hDLFNBQUssRUFBRSxtQkFBTSxTQUFTLENBQUMsTUFBTTtBQUM3QixRQUFJLEVBQUUsbUJBQU0sU0FBUyxDQUFDLE1BQU07QUFDNUIsT0FBRyxFQUFFLG1CQUFNLFNBQVMsQ0FBQyxNQUFNO0NBQzlCLENBQUM7O3FCQUVhLElBQUk7Ozs7Ozs7OztBQ3hHbkIsSUFBTSxTQUFTLEdBQUc7QUFDakIsV0FBVSxFQUFFO0FBQ1gsTUFBSSxFQUFFLE1BQU07QUFDWixRQUFNLEVBQUUsUUFBUTtBQUNoQixRQUFNLEVBQUUsUUFBUTtBQUNoQixRQUFNLEVBQUUsUUFBUTtBQUNoQixTQUFPLEVBQUUsU0FBUztBQUNsQixVQUFRLEVBQUUsVUFBVTtBQUNwQixNQUFJLEVBQUUsTUFBTTtBQUNaLE1BQUksRUFBRSxNQUFNO0VBQ1o7QUFDRCxPQUFNLEVBQUU7QUFDUCxRQUFNLEVBQUUsUUFBUTtBQUNoQixRQUFNLEVBQUUsUUFBUTtBQUNoQixPQUFLLEVBQUUsT0FBTztFQUNkO0FBQ0QsZUFBYyxFQUFFO0FBQ2Ysa0JBQWdCLEVBQUUsR0FBRztBQUNyQixpQkFBZSxFQUFFLEdBQUc7RUFDcEI7Q0FDRCxDQUFDOztxQkFFYSxTQUFTOzs7Ozs7Ozs7O29CQ3RCQyxNQUFNOztBQUUvQixJQUFJLGlCQUFpQixHQUFHLHNCQUFnQixDQUFDOztxQkFFMUIsaUJBQWlCOzs7Ozs7Ozs7O29CQ0pQLE1BQU07O0FBRS9CLElBQUksa0JBQWtCLEdBQUcsc0JBQWdCLENBQUM7O3FCQUUzQixrQkFBa0I7Ozs7Ozs7O3NCQ0puQixRQUFROzs7O3FCQUNKLE9BQU87Ozs7Z0NBQ0wscUJBQXFCOzs7O0FBRXpDLHlCQUFFLGdCQUFnQixDQUFDLENBQUMsT0FBTyxDQUFDO0FBQzNCLFFBQU8sRUFBRSxpQkFBWTtBQUNwQixNQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7O0FBRWYsT0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFDN0QsT0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLDZCQUE2QixDQUFDLENBQUM7QUFDckUsT0FBSyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLCtCQUErQixDQUFDLENBQUM7QUFDekUsT0FBSyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLCtCQUErQixDQUFDLENBQUM7QUFDekUsT0FBSyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLG1DQUFtQyxDQUFDLENBQUM7QUFDakYsT0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLDBCQUEwQixDQUFDLENBQUM7O0FBRS9ELE9BQUssQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQzNFLE9BQUssQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQzNFLE9BQUssQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLHdDQUF3QyxDQUFDLENBQUM7QUFDM0YsT0FBSyxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsc0NBQXNDLENBQUMsQ0FBQztBQUN2RixPQUFLLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsa0NBQWtDLENBQUMsQ0FBQzs7QUFFL0UsTUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxLQUFLLENBQUMsR0FBRyxLQUFLLElBQUksRUFBRTtBQUM5QyxVQUFPO0dBQ1A7O0FBRUQscUJBQU0sTUFBTSxDQUNYLGdFQUFhLEtBQUssQ0FBSSxFQUN0QixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQ1AsQ0FBQztFQUNGO0NBQ0QsQ0FBQyxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OzBDQzlCMEIsZ0NBQWdDOzs7O21DQUNuQyx5QkFBeUI7Ozs7c0JBQzFCLFFBQVE7Ozs7eUJBQ1gsY0FBYzs7OztBQUVwQyxJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7O0FBRWpCLFNBQVMsTUFBTSxDQUFDLElBQUksRUFBRTtBQUNyQixLQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLFVBQUMsS0FBSyxFQUFLO0FBQUUsU0FBTyxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUM7RUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQzs7QUFFN0YsS0FBSSxXQUFXLEVBQUU7QUFDaEIsU0FBTztFQUNQOztBQUVELFFBQU8sQ0FBQyxJQUFJLENBQUM7QUFDWixNQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7QUFDZixPQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7RUFDakIsQ0FBQyxDQUFDO0NBQ0g7O0FBRUQsU0FBUyxNQUFNLENBQUMsSUFBSSxFQUFFO0FBQ3JCLE1BQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDM0MsTUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUU7QUFDbEMsVUFBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUNsQixTQUFNO0dBQ047RUFDRDtDQUNEOztBQUVELFNBQVMsS0FBSyxHQUFHO0FBQ2hCLFFBQU8sR0FBRyxFQUFFLENBQUM7Q0FDYjs7SUFFSyxXQUFXO1dBQVgsV0FBVzs7VUFBWCxXQUFXO3dCQUFYLFdBQVc7OzZCQUFYLFdBQVc7OztjQUFYLFdBQVc7Ozs7Ozs7U0FNVixrQkFBRztBQUNSLFVBQU8sT0FBTyxDQUFDO0dBQ2Y7Ozs7Ozs7O1NBTVMsc0JBQUc7QUFDWixPQUFJLENBQUMsSUFBSSxDQUFDLHVCQUFVLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztHQUNuQzs7Ozs7OztTQUtnQiwyQkFBQyxRQUFRLEVBQUU7QUFDM0IsT0FBSSxDQUFDLEVBQUUsQ0FBQyx1QkFBVSxNQUFNLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0dBQzNDOzs7Ozs7O1NBS21CLDhCQUFDLFFBQVEsRUFBRTtBQUM5QixPQUFJLENBQUMsY0FBYyxDQUFDLHVCQUFVLE1BQU0sQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7R0FDdkQ7OztRQTlCSSxXQUFXOzs7QUFrQ2pCLElBQUksWUFBWSxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7O0FBRXJDLHdDQUFpQixRQUFRLENBQUMsVUFBVSxPQUFPLEVBQUU7O0FBRTVDLFNBQU8sT0FBTyxDQUFDLE1BQU07QUFDcEIsT0FBSyx1QkFBVSxNQUFNLENBQUMsTUFBTTtBQUMzQixTQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDOztBQUVyQixPQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtBQUNwQixnQkFBWSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQzFCOztBQUVELFNBQU07O0FBQUEsQUFFUCxPQUFLLHVCQUFVLE1BQU0sQ0FBQyxNQUFNO0FBQzNCLFNBQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRXJCLE9BQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFO0FBQ3BCLGdCQUFZLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDMUI7O0FBRUQsU0FBTTs7QUFBQSxBQUVQLE9BQUssdUJBQVUsTUFBTSxDQUFDLEtBQUs7QUFDMUIsUUFBSyxFQUFFLENBQUM7O0FBRVIsT0FBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7QUFDcEIsZ0JBQVksQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUMxQjtBQUFBLEVBQ0Y7O0FBRUQsUUFBTyxJQUFJLENBQUM7Q0FFWixDQUFDLENBQUM7O3FCQUVZLFlBQVk7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzJDQ3RHRyxpQ0FBaUM7Ozs7b0NBQ3BDLDBCQUEwQjs7OztzQkFDNUIsUUFBUTs7OztzQkFDbkIsUUFBUTs7Ozt5QkFDQSxjQUFjOzs7O0FBRXBDLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztBQUNoQixJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUM7QUFDbEIsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDOzs7Ozs7OztBQVExQixTQUFTLElBQUksQ0FBQyxJQUFJLEVBQUU7QUFDbkIsV0FBVSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7QUFDcEIsV0FBVSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7QUFDdEIsV0FBVSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7QUFDMUIsV0FBVSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7O0FBRTdCLEtBQUksSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssSUFBSSxDQUFDLGNBQWMsRUFBRTtBQUM1RixVQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztFQUN6RDs7QUFFRCxPQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFDLEdBQUcsRUFBSztBQUM5QixZQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQzVCLENBQUMsQ0FBQztDQUNIOztBQUVELFNBQVMsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7QUFDN0IsS0FBSSxVQUFVLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRTtBQUN4RCxNQUFJLFVBQVUsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLElBQUksS0FBSyxFQUFFO0FBQ2hELGFBQVUsQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDO0dBQzlCLE1BQU07QUFDTixhQUFVLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztHQUM3QjtFQUNELE1BQU07QUFDTixZQUFVLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUNyQyxZQUFVLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztFQUM3Qjs7QUFFRCxTQUFRLElBQUksUUFBUSxFQUFFLENBQUM7Q0FDdkI7Ozs7Ozs7O0FBUUQsU0FBUyxNQUFNLENBQUMsUUFBUSxFQUFFO0FBQ3pCLEtBQUksVUFBVSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBQyxJQUFJLEVBQUs7QUFBRSxTQUFPLElBQUksQ0FBQyxFQUFFLEtBQUssUUFBUSxDQUFDLEVBQUUsQ0FBQztFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDOztBQUV6RixLQUFJLFVBQVUsRUFBRTtBQUNmLFNBQU87RUFDUDs7QUFFRCxPQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0NBQ3RCOzs7Ozs7Ozs7QUFTRCxTQUFTLE9BQU8sQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFO0FBQzlCLHFCQUFFLElBQUksQ0FBQztBQUNOLE9BQUssRUFBRSxVQUFVLENBQUMsVUFBVTtBQUM1QixRQUFNLEVBQUU7QUFDUCxPQUFJLEVBQUUsRUFBRTtHQUNSO0FBQ0QsWUFBVSxFQUFFLE1BQU07QUFDbEIsVUFBUSxFQUFFLEtBQUs7QUFDZixXQUFTLEVBQUUsaUJBQUMsSUFBSSxFQUFLO0FBQ3BCLE9BQUksU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDOzs7O0FBSW5CLFFBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDMUMsUUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRTtBQUN4QixjQUFTLEdBQUcsQ0FBQyxDQUFDO0FBQ2QsV0FBTTtLQUNOO0lBQ0Q7O0FBRUQsT0FBSSxTQUFTLEtBQUssQ0FBQyxDQUFDLEVBQUU7QUFDckIsV0FBTztJQUNQOztBQUVELFNBQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDOztBQUU1QixXQUFRLElBQUksUUFBUSxFQUFFLENBQUM7R0FDdkI7RUFDRCxDQUFDLENBQUM7Q0FDSDs7Ozs7Ozs7OztBQVVELFNBQVMsUUFBUSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUU7QUFDbkMsV0FBVSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7QUFDcEIsV0FBVSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUM7O0FBRWxDLEtBQUksSUFBSSxHQUFHO0FBQ1YsUUFBTSxFQUFFLFVBQVUsQ0FBQyxJQUFJLEVBQUU7QUFDekIsU0FBTyxFQUFFLFVBQVUsQ0FBQyxLQUFLO0VBQ3pCLENBQUM7O0FBRUYsRUFBQyxlQUFlLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFDLElBQUksRUFBSztBQUM3RyxNQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUNyQixPQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQzlCO0VBQ0QsQ0FBQyxDQUFDOztBQUVILHFCQUFFLElBQUksQ0FBQztBQUNOLE9BQUssRUFBRSxVQUFVLENBQUMsUUFBUTtBQUMxQixZQUFVLEVBQUUsTUFBTTtBQUNsQixRQUFNLEVBQUUsSUFBSTtBQUNaLFdBQVMsRUFBRSxpQkFBUyxJQUFJLEVBQUU7QUFDekIsU0FBTSxHQUFHLEVBQUUsQ0FBQzs7QUFFWixhQUFVLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7O0FBRTlCLE9BQUksT0FBTyxHQUFHLHlCQUFFLGtCQUFrQixDQUFDLENBQUM7O0FBRXBDLE9BQUksT0FBTyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7QUFDaEUsV0FBTyxDQUFDLE1BQU0sQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO0lBQzNEOztBQUVELE9BQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtBQUM3QixVQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztJQUM3Qzs7QUFFRCxVQUFPLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7O0FBRWhGLE9BQUksTUFBTSxLQUFLLFVBQVUsQ0FBQyxjQUFjLEVBQUU7QUFDekMsWUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxjQUFjLElBQUksVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7SUFDckU7O0FBRUQsaUJBQWMsR0FBRyxNQUFNLENBQUM7O0FBRXhCLE9BQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQUMsSUFBSSxFQUFLO0FBQzVCLHNDQUFlLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbEMsQ0FBQyxDQUFDOztBQUVILFdBQVEsSUFBSSxRQUFRLEVBQUUsQ0FBQztHQUN2QjtFQUNELENBQUMsQ0FBQTtDQUNGOztBQUVELFNBQVMsSUFBSSxDQUFDLFFBQVEsRUFBRTtBQUN2QixLQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRTs7QUFDckMsT0FBSSxJQUFJLEdBQUc7QUFDVixVQUFNLEVBQUUsVUFBVSxDQUFDLElBQUksRUFBRTtBQUN6QixXQUFPLEVBQUUsVUFBVSxDQUFDLEtBQUs7SUFDekIsQ0FBQzs7QUFFRixJQUFDLGVBQWUsRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLHFCQUFxQixFQUFFLG1CQUFtQixDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUMsSUFBSSxFQUFLO0FBQzdHLFFBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ3JCLFNBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDOUI7SUFDRCxDQUFDLENBQUM7O0FBRUgsdUJBQUUsSUFBSSxDQUFDO0FBQ04sU0FBSyxFQUFFLFVBQVUsQ0FBQyxRQUFRO0FBQzFCLGNBQVUsRUFBRSxNQUFNO0FBQ2xCLFVBQU0sRUFBRSxJQUFJO0FBQ1osYUFBUyxFQUFFLGlCQUFTLElBQUksRUFBRTtBQUN6QixTQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFDLElBQUksRUFBSztBQUM1Qix3Q0FBZSxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO01BQ2xDLENBQUMsQ0FBQzs7QUFFSCxhQUFRLElBQUksUUFBUSxFQUFFLENBQUM7S0FDdkI7SUFDRCxDQUFDLENBQUM7O0VBQ0g7Q0FDRDs7Ozs7Ozs7O0FBVUQsU0FBUyxNQUFNLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRTs7Q0FFN0I7O0lBRUssU0FBUztXQUFULFNBQVM7O1VBQVQsU0FBUzt3QkFBVCxTQUFTOzs2QkFBVCxTQUFTOzs7Y0FBVCxTQUFTOzs7Ozs7U0FLRix3QkFBRztBQUNkLFVBQU8sUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7R0FDM0I7Ozs7Ozs7U0FLWSx5QkFBRztBQUNmLFVBQU8sUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDO0dBQ3RCOzs7Ozs7OztTQU1LLGtCQUFHO0FBQ1IsVUFBTyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUNqQyxRQUFJLElBQUksR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ3pDLFFBQUksU0FBUyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUM7O0FBRW5ELFFBQUksU0FBUyxJQUFJLEtBQUssRUFBRTtBQUN2QixTQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDdEIsYUFBTyxDQUFDLENBQUMsQ0FBQztNQUNWOztBQUVELFNBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUN0QixhQUFPLENBQUMsQ0FBQztNQUNUOztBQUVELFlBQU8sQ0FBQyxDQUFBO0tBQ1I7O0FBRUQsUUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ3RCLFlBQU8sQ0FBQyxDQUFDLENBQUM7S0FDVjs7QUFFRCxRQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDdEIsWUFBTyxDQUFDLENBQUM7S0FDVDs7QUFFRCxXQUFPLENBQUMsQ0FBQTtJQUNSLENBQUMsQ0FBQztHQUNIOzs7Ozs7Ozs7U0FPTSxpQkFBQyxFQUFFLEVBQUU7QUFDWCxPQUFJLElBQUksR0FBRyxJQUFJLENBQUM7O0FBRWhCLFFBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDMUMsUUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRTtBQUN4QixTQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pCLFdBQU07S0FDTjtJQUNEOztBQUVELFVBQU8sSUFBSSxDQUFDO0dBQ1o7Ozs7Ozs7O1NBTVMsc0JBQUc7QUFDWixPQUFJLENBQUMsSUFBSSxDQUFDLHVCQUFVLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztHQUN2Qzs7Ozs7OztTQUtnQiwyQkFBQyxRQUFRLEVBQUU7QUFDM0IsT0FBSSxDQUFDLEVBQUUsQ0FBQyx1QkFBVSxVQUFVLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0dBQy9DOzs7Ozs7O1NBS21CLDhCQUFDLFFBQVEsRUFBRTtBQUM5QixPQUFJLENBQUMsY0FBYyxDQUFDLHVCQUFVLFVBQVUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7R0FDM0Q7OztRQXZGSSxTQUFTOzs7QUEwRmYsSUFBSSxVQUFVLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQzs7QUFFakMseUNBQWtCLFFBQVEsQ0FBQyxVQUFVLE9BQU8sRUFBRTtBQUM3QyxTQUFPLE9BQU8sQ0FBQyxNQUFNO0FBQ3BCLE9BQUssdUJBQVUsVUFBVSxDQUFDLElBQUk7QUFDN0IsT0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzs7QUFFbkIsT0FBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7QUFDcEIsY0FBVSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ3hCOztBQUVELFNBQU07O0FBQUEsQUFFUCxPQUFLLHVCQUFVLFVBQVUsQ0FBQyxNQUFNO0FBQy9CLFNBQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRXJCLE9BQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFO0FBQ3BCLGNBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUN4Qjs7QUFFRCxTQUFNOztBQUFBLEFBRVAsT0FBSyx1QkFBVSxVQUFVLENBQUMsT0FBTztBQUNoQyxVQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsWUFBTTtBQUM5QixRQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtBQUNwQixlQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7S0FDeEI7SUFDRCxDQUFDLENBQUM7O0FBRUgsU0FBTTs7QUFBQSxBQUVQLE9BQUssdUJBQVUsVUFBVSxDQUFDLFFBQVE7QUFDakMsV0FBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFlBQU07QUFDbkMsUUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7QUFDcEIsZUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDO0tBQ3hCO0lBQ0QsQ0FBQyxDQUFDOztBQUVILFNBQU07O0FBQUEsQUFFUCxPQUFLLHVCQUFVLFVBQVUsQ0FBQyxNQUFNO0FBQy9CLFNBQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUU5QyxPQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtBQUNwQixjQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDeEI7O0FBRUQsU0FBTTs7QUFBQSxBQUVQLE9BQUssdUJBQVUsVUFBVSxDQUFDLElBQUk7QUFDN0IsT0FBSSxDQUFDLFlBQU07QUFDVixRQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtBQUNwQixlQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7S0FDeEI7SUFDRCxDQUFDLENBQUM7O0FBRUgsU0FBTTs7QUFBQSxBQUVQLE9BQUssdUJBQVUsVUFBVSxDQUFDLElBQUk7QUFDN0IsT0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFlBQU07QUFDN0IsUUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7QUFDcEIsZUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDO0tBQ3hCO0lBQ0QsQ0FBQyxDQUFDOztBQUVILFNBQU07QUFBQSxFQUNQOztBQUVELFFBQU8sSUFBSSxDQUFDO0NBQ1osQ0FBQyxDQUFDOztxQkFFWSxVQUFVIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIi8qIVxuICBDb3B5cmlnaHQgKGMpIDIwMTUgSmVkIFdhdHNvbi5cbiAgTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlIChNSVQpLCBzZWVcbiAgaHR0cDovL2plZHdhdHNvbi5naXRodWIuaW8vY2xhc3NuYW1lc1xuKi9cbi8qIGdsb2JhbCBkZWZpbmUgKi9cblxuKGZ1bmN0aW9uICgpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBoYXNPd24gPSB7fS5oYXNPd25Qcm9wZXJ0eTtcblxuXHRmdW5jdGlvbiBjbGFzc05hbWVzICgpIHtcblx0XHR2YXIgY2xhc3NlcyA9ICcnO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBhcmcgPSBhcmd1bWVudHNbaV07XG5cdFx0XHRpZiAoIWFyZykgY29udGludWU7XG5cblx0XHRcdHZhciBhcmdUeXBlID0gdHlwZW9mIGFyZztcblxuXHRcdFx0aWYgKGFyZ1R5cGUgPT09ICdzdHJpbmcnIHx8IGFyZ1R5cGUgPT09ICdudW1iZXInKSB7XG5cdFx0XHRcdGNsYXNzZXMgKz0gJyAnICsgYXJnO1xuXHRcdFx0fSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGFyZykpIHtcblx0XHRcdFx0Y2xhc3NlcyArPSAnICcgKyBjbGFzc05hbWVzLmFwcGx5KG51bGwsIGFyZyk7XG5cdFx0XHR9IGVsc2UgaWYgKGFyZ1R5cGUgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdGZvciAodmFyIGtleSBpbiBhcmcpIHtcblx0XHRcdFx0XHRpZiAoaGFzT3duLmNhbGwoYXJnLCBrZXkpICYmIGFyZ1trZXldKSB7XG5cdFx0XHRcdFx0XHRjbGFzc2VzICs9ICcgJyArIGtleTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gY2xhc3Nlcy5zdWJzdHIoMSk7XG5cdH1cblxuXHRpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGNsYXNzTmFtZXM7XG5cdH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZGVmaW5lLmFtZCA9PT0gJ29iamVjdCcgJiYgZGVmaW5lLmFtZCkge1xuXHRcdC8vIHJlZ2lzdGVyIGFzICdjbGFzc25hbWVzJywgY29uc2lzdGVudCB3aXRoIG5wbSBwYWNrYWdlIG5hbWVcblx0XHRkZWZpbmUoJ2NsYXNzbmFtZXMnLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gY2xhc3NOYW1lcztcblx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHR3aW5kb3cuY2xhc3NOYW1lcyA9IGNsYXNzTmFtZXM7XG5cdH1cbn0oKSk7XG4iLCJpbXBvcnQgZWRpdG9yRGlzcGF0Y2hlciBmcm9tICcuLi9kaXNwYXRjaGVyL2VkaXRvckRpc3BhdGNoZXInO1xuaW1wb3J0IENPTlNUQU5UUyBmcm9tICcuLi9jb25zdGFudHMnO1xuXG52YXIgZWRpdG9yQWN0aW9ucyA9IHtcblxuXHRjcmVhdGUoZGF0YSwgc2lsZW50KSB7XG5cdFx0ZWRpdG9yRGlzcGF0Y2hlci5kaXNwYXRjaCh7XG5cdFx0XHRhY3Rpb246IENPTlNUQU5UUy5FRElUT1IuQ1JFQVRFLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdHNpbGVudDogc2lsZW50XG5cdFx0fSk7XG5cdH0sXG5cblx0dXBkYXRlKGRhdGEsIHNpbGVudCkge1xuXHRcdGVkaXRvckRpc3BhdGNoZXIuZGlzcGF0Y2goe1xuXHRcdFx0YWN0aW9uOiBDT05TVEFOVFMuRURJVE9SLlVQREFURSxcblx0XHRcdGRhdGE6IGRhdGEsXG5cdFx0XHRzaWxlbnQ6IHNpbGVudFxuXHRcdH0pO1xuXHR9LFxuXG5cdGNsZWFyKHNpbGVudCkge1xuXHRcdGVkaXRvckRpc3BhdGNoZXIuZGlzcGF0Y2goe1xuXHRcdFx0YWN0aW9uOiBDT05TVEFOVFMuRURJVE9SLkNMRUFSLFxuXHRcdFx0c2lsZW50OiBzaWxlbnRcblx0XHR9KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IGVkaXRvckFjdGlvbnM7IiwiaW1wb3J0IGdhbGxlcnlEaXNwYXRjaGVyIGZyb20gJy4uL2Rpc3BhdGNoZXIvZ2FsbGVyeURpc3BhdGNoZXInO1xuaW1wb3J0IENPTlNUQU5UUyBmcm9tICcuLi9jb25zdGFudHMnO1xuXG52YXIgZ2FsbGVyeUFjdGlvbnMgPSB7XG5cblx0LyoqXG5cdCAqIEBmdW5jIHNldFN0b3JlUHJvcHNcblx0ICogQGRlc2MgSW5pdGlhbGlzZXMgdGhlIHN0b3JlXG5cdCAqL1xuXHRzZXRTdG9yZVByb3BzKGRhdGEsIHNpbGVudCkge1xuXHRcdGdhbGxlcnlEaXNwYXRjaGVyLmRpc3BhdGNoKHtcblx0XHRcdGFjdGlvbjogQ09OU1RBTlRTLklURU1fU1RPUkUuSU5JVCxcblx0XHRcdGRhdGE6IGRhdGEsXG5cdFx0XHRzaWxlbnQ6IHNpbGVudFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBAZnVuYyBjcmVhdGVcblx0ICogQHBhcmFtIHtvYmplY3R9IGRhdGFcblx0ICogQGRlc2MgQ3JlYXRlcyBhIGdhbGxlcnkgaXRlbS5cblx0ICovXG5cdGNyZWF0ZShkYXRhLCBzaWxlbnQpIHtcblx0XHRnYWxsZXJ5RGlzcGF0Y2hlci5kaXNwYXRjaCh7XG5cdFx0XHRhY3Rpb246IENPTlNUQU5UUy5JVEVNX1NUT1JFLkNSRUFURSxcblx0XHRcdGRhdGE6IGRhdGEsXG5cdFx0XHRzaWxlbnQ6IHNpbGVudFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBAZnVuYyBkZXN0cm95XG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBpZFxuXHQgKiBAcGFyYW0ge3N0cmluZ30gZGVsZXRlX3VybFxuXHQgKiBAcGFyYW0ge2Jvb2x9IHNpbGVudFxuXHQgKiBAZGVzYyBkZXN0cm95cyBhIGdhbGxlcnkgaXRlbS5cblx0ICovXG5cdGRlc3Ryb3koaWQsIHNpbGVudCkge1xuXHRcdGdhbGxlcnlEaXNwYXRjaGVyLmRpc3BhdGNoKHtcblx0XHRcdGFjdGlvbjogQ09OU1RBTlRTLklURU1fU1RPUkUuREVTVFJPWSxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0aWQ6IGlkXG5cdFx0XHR9LFxuXHRcdFx0c2lsZW50OiBzaWxlbnRcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogQGZ1bmMgdXBkYXRlXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBpZFxuXHQgKiBAcGFyYW0ge3N0cmluZ30ga2V5XG5cdCAqIEBkZXNjIFVwZGF0ZXMgYSBnYWxsZXJ5IGl0ZW0uXG5cdCAqL1xuXHR1cGRhdGUoaWQsIHVwZGF0ZXMsIHNpbGVudCkge1xuXHRcdGdhbGxlcnlEaXNwYXRjaGVyLmRpc3BhdGNoKHtcblx0XHRcdGFjdGlvbjogQ09OU1RBTlRTLklURU1fU1RPUkUuVVBEQVRFLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRpZDogaWQsXG5cdFx0XHRcdHVwZGF0ZXM6IHVwZGF0ZXNcblx0XHRcdH0sXG5cdFx0XHRzaWxlbnQ6IHNpbGVudFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBOYXZpZ2F0ZXMgdG8gYSBuZXcgZm9sZGVyLlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gZm9sZGVyXG5cdCAqIEBwYXJhbSB7Ym9vbH0gc2lsZW50XG5cdCAqL1xuXHRuYXZpZ2F0ZShmb2xkZXIsIHNpbGVudCkge1xuXHRcdGdhbGxlcnlEaXNwYXRjaGVyLmRpc3BhdGNoKHtcblx0XHRcdGFjdGlvbjogQ09OU1RBTlRTLklURU1fU1RPUkUuTkFWSUdBVEUsXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdCdmb2xkZXInOiBmb2xkZXJcblx0XHRcdH0sXG5cdFx0XHRzaWxlbnQ6IHNpbGVudFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBMb2FkcyBhbm90aGVyIHBhZ2Ugb2YgaXRlbXMgaW50byB0aGUgZ2FsbGVyeS5cblx0ICpcblx0ICogQHBhcmFtIHtib29sfSBzaWxlbnRcblx0ICovXG5cdHBhZ2Uoc2lsZW50KSB7XG5cdFx0Z2FsbGVyeURpc3BhdGNoZXIuZGlzcGF0Y2goe1xuXHRcdFx0YWN0aW9uOiBDT05TVEFOVFMuSVRFTV9TVE9SRS5QQUdFLFxuXHRcdFx0c2lsZW50OiBzaWxlbnRcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogU29ydHMgdGhlIGl0ZW1zIGluIHRoZSBnYWxsZXJ5LlxuXHQgKlxuXHQgKiBAcGFyYW0ge2Jvb2x9IHNpbGVudFxuXHQgKi9cblx0c29ydChuYW1lLCBzaWxlbnQpIHtcblx0XHRnYWxsZXJ5RGlzcGF0Y2hlci5kaXNwYXRjaCh7XG5cdFx0XHRhY3Rpb246IENPTlNUQU5UUy5JVEVNX1NUT1JFLlNPUlQsXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdCduYW1lJzogbmFtZVxuXHRcdFx0fSxcblx0XHRcdHNpbGVudDogc2lsZW50XG5cdFx0fSk7XG5cdH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGdhbGxlcnlBY3Rpb25zO1xuIiwiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCBJbnB1dEZpZWxkIGZyb20gJy4vaW5wdXRGaWVsZCc7XG5pbXBvcnQgZWRpdG9yQWN0aW9ucyBmcm9tICcuLi9hY3Rpb24vZWRpdG9yQWN0aW9ucyc7XG5pbXBvcnQgZWRpdG9yU3RvcmUgZnJvbSAnLi4vc3RvcmUvZWRpdG9yU3RvcmUnO1xuXG4vKipcbiAqIEBmdW5jIGdldEVkaXRvclN0b3JlU3RhdGVcbiAqIEBwcml2YXRlXG4gKiBAcmV0dXJuIHtvYmplY3R9XG4gKiBAZGVzYyBGYWN0b3J5IGZvciBnZXR0aW5nIHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBJdGVtU3RvcmUuXG4gKi9cbmZ1bmN0aW9uIGdldEVkaXRvclN0b3JlU3RhdGUoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZmllbGRzOiBlZGl0b3JTdG9yZS5nZXRBbGwoKVxuICAgIH07XG59XG5cbi8qKlxuICogQGZ1bmMgRWRpdG9yXG4gKiBAZGVzYyBVc2VkIHRvIGVkaXQgdGhlIHByb3BlcnRpZXMgb2YgYW4gSXRlbS5cbiAqL1xuY2xhc3MgRWRpdG9yIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuICAgIGNvbnN0cnVjdG9yKHByb3BzKSB7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcblxuICAgICAgICAvLyBNYW51YWxseSBiaW5kIHNvIGxpc3RlbmVycyBhcmUgcmVtb3ZlZCBjb3JyZWN0bHlcbiAgICAgICAgdGhpcy5vbkNoYW5nZSA9IHRoaXMub25DaGFuZ2UuYmluZCh0aGlzKTtcblxuICAgICAgICAvLyBQb3B1bGF0ZSB0aGUgc3RvcmUuXG4gICAgICAgIGVkaXRvckFjdGlvbnMuY3JlYXRlKHsgbmFtZTogJ3RpdGxlJywgdmFsdWU6IHByb3BzLml0ZW0udGl0bGUgfSwgdHJ1ZSk7XG4gICAgICAgIGVkaXRvckFjdGlvbnMuY3JlYXRlKHsgbmFtZTogJ2ZpbGVuYW1lJywgdmFsdWU6IHByb3BzLml0ZW0uZmlsZW5hbWUgfSwgdHJ1ZSk7XG5cbiAgICAgICAgdGhpcy5zdGF0ZSA9IGdldEVkaXRvclN0b3JlU3RhdGUoKTtcbiAgICB9XG5cbiAgICBjb21wb25lbnREaWRNb3VudCAoKSB7XG4gICAgICAgIGVkaXRvclN0b3JlLmFkZENoYW5nZUxpc3RlbmVyKHRoaXMub25DaGFuZ2UpO1xuICAgIH1cblxuICAgIGNvbXBvbmVudFdpbGxVbm1vdW50ICgpIHtcbiAgICAgICAgZWRpdG9yU3RvcmUucmVtb3ZlQ2hhbmdlTGlzdGVuZXIodGhpcy5vbkNoYW5nZSk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICB2YXIgdGV4dEZpZWxkcyA9IHRoaXMuZ2V0VGV4dEZpZWxkQ29tcG9uZW50cygpO1xuXG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0nZWRpdG9yJz5cbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIHR5cGU9J2J1dHRvbidcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPSdzcy11aS1idXR0b24gdWktY29ybmVyLWFsbCBmb250LWljb24tbGV2ZWwtdXAnXG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9e3RoaXMuaGFuZGxlQmFjay5iaW5kKHRoaXMpfT5cbiAgICAgICAgICAgICAgICAgICAgQmFjayB0byBnYWxsZXJ5XG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxmb3JtPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0nQ29tcG9zaXRlRmllbGQgY29tcG9zaXRlIGNtcy1maWxlLWluZm8gbm9sYWJlbCc+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0nQ29tcG9zaXRlRmllbGQgY29tcG9zaXRlIGNtcy1maWxlLWluZm8tcHJldmlldyBub2xhYmVsJz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW1nIGNsYXNzTmFtZT0ndGh1bWJuYWlsLXByZXZpZXcnIHNyYz17dGhpcy5wcm9wcy5pdGVtLnVybH0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9J0NvbXBvc2l0ZUZpZWxkIGNvbXBvc2l0ZSBjbXMtZmlsZS1pbmZvLWRhdGEgbm9sYWJlbCc+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9J0NvbXBvc2l0ZUZpZWxkIGNvbXBvc2l0ZSBub2xhYmVsJz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9J2ZpZWxkIHJlYWRvbmx5Jz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9J2xlZnQnPkZpbGUgdHlwZTo8L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9J21pZGRsZUNvbHVtbic+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSdyZWFkb25seSc+e3RoaXMucHJvcHMuaXRlbS50eXBlfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0nZmllbGQgcmVhZG9ubHknPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPSdsZWZ0Jz5GaWxlIHNpemU6PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9J21pZGRsZUNvbHVtbic+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9J3JlYWRvbmx5Jz57dGhpcy5wcm9wcy5pdGVtLnNpemV9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0nZmllbGQgcmVhZG9ubHknPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPSdsZWZ0Jz5VUkw6PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9J21pZGRsZUNvbHVtbic+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9J3JlYWRvbmx5Jz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPXt0aGlzLnByb3BzLml0ZW0udXJsfSB0YXJnZXQ9J19ibGFuayc+e3RoaXMucHJvcHMuaXRlbS51cmx9PC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0nZmllbGQgZGF0ZV9kaXNhYmxlZCByZWFkb25seSc+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9J2xlZnQnPkZpcnN0IHVwbG9hZGVkOjwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSdtaWRkbGVDb2x1bW4nPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSdyZWFkb25seSc+e3RoaXMucHJvcHMuaXRlbS5jcmVhdGVkfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9J2ZpZWxkIGRhdGVfZGlzYWJsZWQgcmVhZG9ubHknPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPSdsZWZ0Jz5MYXN0IGNoYW5nZWQ6PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9J21pZGRsZUNvbHVtbic+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9J3JlYWRvbmx5Jz57dGhpcy5wcm9wcy5pdGVtLmxhc3RVcGRhdGVkfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9J2ZpZWxkIHJlYWRvbmx5Jz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT0nbGVmdCc+RGltZW5zaW9uczo8L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0nbWlkZGxlQ29sdW1uJz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0ncmVhZG9ubHknPnt0aGlzLnByb3BzLml0ZW0uYXR0cmlidXRlcy5kaW1lbnNpb25zLndpZHRofSB4IHt0aGlzLnByb3BzLml0ZW0uYXR0cmlidXRlcy5kaW1lbnNpb25zLmhlaWdodH1weDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAge3RleHRGaWVsZHN9XG5cbiAgICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT0nc3VibWl0JyBjbGFzc05hbWU9XCJzcy11aS1idXR0b24gdWktY29ybmVyLWFsbCBmb250LWljb24tY2hlY2stbWFya1wiPlNhdmU8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT0nYnV0dG9uJyBjbGFzc05hbWU9XCJzcy11aS1idXR0b24gdWktY29ybmVyLWFsbCBmb250LWljb24tY2FuY2VsLWNpcmNsZWRcIiBvbkNsaWNrPXt0aGlzLmhhbmRsZUNhbmNlbC5iaW5kKHRoaXMpfSA+Q2FuY2VsPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZm9ybT5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBmdW5jIGdldFRleHRGaWVsZENvbXBvbmVudHNcbiAgICAgKiBAZGVzYyBHZW5lcmF0ZXMgdGhlIGVkaXRhYmxlIHRleHQgZmllbGQgY29tcG9uZW50cyBmb3IgdGhlIGZvcm0uXG4gICAgICovXG4gICAgZ2V0VGV4dEZpZWxkQ29tcG9uZW50cygpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuc3RhdGUuZmllbGRzKS5tYXAoKGtleSkgPT4ge1xuICAgICAgICAgICAgdmFyIGZpZWxkID0gdGhpcy5zdGF0ZS5maWVsZHNba2V5XTtcblxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0nZmllbGQgdGV4dCcga2V5PXtrZXl9PlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPSdsZWZ0Jz57ZmllbGQubmFtZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0nbWlkZGxlQ29sdW1uJz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxJbnB1dEZpZWxkIG5hbWU9e2ZpZWxkLm5hbWV9IHZhbHVlPXtmaWVsZC52YWx1ZX0gLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBmdW5jIG9uQ2hhbmdlXG4gICAgICogQGRlc2MgVXBkYXRlcyB0aGUgZWRpdG9yIHN0YXRlIHdoZW4gc29tZXRoaW5nIGNoYW5nZXMgaW4gdGhlIHN0b3JlLlxuICAgICAqL1xuICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKGdldEVkaXRvclN0b3JlU3RhdGUoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGZ1bmMgaGFuZGxlQmFja1xuICAgICAqIEBkZXNjIEhhbmRsZXMgY2xpY2tzIG9uIHRoZSBiYWNrIGJ1dHRvbi4gU3dpdGNoZXMgYmFjayB0byB0aGUgJ2dhbGxlcnknIHZpZXcuXG4gICAgICovXG4gICAgaGFuZGxlQmFjaygpIHtcbiAgICAgICAgZWRpdG9yQWN0aW9ucy5jbGVhcih0cnVlKTtcbiAgICAgICAgdGhpcy5wcm9wcy5zZXRFZGl0aW5nKGZhbHNlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZnVuYyBoYW5kbGVTYXZlXG4gICAgICogQGRlc2MgSGFuZGxlcyBjbGlja3Mgb24gdGhlIHNhdmUgYnV0dG9uXG4gICAgICovXG4gICAgaGFuZGxlU2F2ZSgpIHtcbiAgICAgICAgLy8gVE9ETzpcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZnVuYyBoYW5kbGVDYW5jZWxcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZXZlbnRcbiAgICAgKiBAZGVzYyBSZXNldHMgdGhlIGZvcm0gdG8gaXQncyBvcmlnaW9uYWwgc3RhdGUuXG4gICAgICovXG4gICAgaGFuZGxlQ2FuY2VsKCkge1xuICAgICAgICBlZGl0b3JBY3Rpb25zLnVwZGF0ZSh7IG5hbWU6ICd0aXRsZScsIHZhbHVlOiB0aGlzLnByb3BzLml0ZW0udGl0bGUgfSk7XG4gICAgICAgIGVkaXRvckFjdGlvbnMudXBkYXRlKHsgbmFtZTogJ2ZpbGVuYW1lJywgdmFsdWU6IHRoaXMucHJvcHMuaXRlbS5maWxlbmFtZSB9KTtcbiAgICB9XG5cbn1cblxuRWRpdG9yLnByb3BUeXBlcyA9IHtcbiAgICBpdGVtOiBSZWFjdC5Qcm9wVHlwZXMub2JqZWN0LFxuICAgIHNldEVkaXRpbmc6IFJlYWN0LlByb3BUeXBlcy5mdW5jXG59O1xuXG5leHBvcnQgZGVmYXVsdCBFZGl0b3I7XG4iLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0ICQgZnJvbSAnanF1ZXJ5JztcbmltcG9ydCBFZGl0b3IgZnJvbSAnLi9lZGl0b3InO1xuaW1wb3J0IEl0ZW0gZnJvbSAnLi9pdGVtJztcbmltcG9ydCBnYWxsZXJ5QWN0aW9ucyBmcm9tICcuLi9hY3Rpb24vZ2FsbGVyeUFjdGlvbnMnO1xuaW1wb3J0IGl0ZW1TdG9yZSBmcm9tICcuLi9zdG9yZS9pdGVtU3RvcmUnO1xuXG4vKipcbiAqIEBmdW5jIGdldEl0ZW1TdG9yZVN0YXRlXG4gKiBAcHJpdmF0ZVxuICogQHJldHVybiB7b2JqZWN0fVxuICogQGRlc2MgRmFjdG9yeSBmb3IgZ2V0dGluZyB0aGUgY3VycmVudCBzdGF0ZSBvZiB0aGUgSXRlbVN0b3JlLlxuICovXG5mdW5jdGlvbiBnZXRJdGVtU3RvcmVTdGF0ZSgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBpdGVtczogaXRlbVN0b3JlLmdldEFsbCgpXG4gICAgfTtcbn1cblxuY2xhc3MgR2FsbGVyeSBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cbiAgICBjb25zdHJ1Y3Rvcihwcm9wcykge1xuICAgICAgICBzdXBlcihwcm9wcyk7XG5cbiAgICAgICAgdmFyIGl0ZW1zID0gd2luZG93LlNTX0FTU0VUX0dBTExFUllbdGhpcy5wcm9wcy5uYW1lXTtcblxuICAgICAgICAvLyBNYW51YWxseSBiaW5kIHNvIGxpc3RlbmVycyBhcmUgcmVtb3ZlZCBjb3JyZWN0bHlcbiAgICAgICAgdGhpcy5vbkNoYW5nZSA9IHRoaXMub25DaGFuZ2UuYmluZCh0aGlzKTtcblxuICAgICAgICBnYWxsZXJ5QWN0aW9ucy5zZXRTdG9yZVByb3BzKHtcbiAgICAgICAgICAgIGRhdGFfdXJsOiBwcm9wcy5kYXRhX3VybCxcbiAgICAgICAgICAgIHVwZGF0ZV91cmw6IHByb3BzLnVwZGF0ZV91cmwsXG4gICAgICAgICAgICBkZWxldGVfdXJsOiBwcm9wcy5kZWxldGVfdXJsLFxuICAgICAgICAgICAgaW5pdGlhbF9mb2xkZXI6IHByb3BzLmluaXRpYWxfZm9sZGVyLFxuICAgICAgICAgICAgbGltaXQ6IHByb3BzLmxpbWl0LFxuICAgICAgICAgICAgZmlsdGVyX2ZvbGRlcjogcHJvcHMuZmlsdGVyX2ZvbGRlcixcbiAgICAgICAgICAgIGZpbHRlcl9uYW1lOiBwcm9wcy5maWx0ZXJfbmFtZSxcbiAgICAgICAgICAgIGZpbHRlcl90eXBlOiBwcm9wcy5maWx0ZXJfdHlwZSxcbiAgICAgICAgICAgIGZpbHRlcl9jcmVhdGVkX2Zyb206IHByb3BzLmZpbHRlcl9jcmVhdGVkX2Zyb20sXG4gICAgICAgICAgICBmaWx0ZXJfY3JlYXRlZF90bzogcHJvcHMuZmlsdGVyX2NyZWF0ZWRfdG9cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUG9wdWxhdGUgdGhlIHN0b3JlLlxuICAgICAgICBpZiAoaXRlbXMgJiYgaXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIGdhbGxlcnlBY3Rpb25zLmNyZWF0ZShpdGVtc1tpXSwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgdGhlIGluaXRpYWwgc3RhdGUgb2YgdGhlIGdhbGxlcnkuXG4gICAgICAgIHRoaXMuc3RhdGUgPSAkLmV4dGVuZChnZXRJdGVtU3RvcmVTdGF0ZSgpLCB7IGVkaXRpbmc6IGZhbHNlLCBjdXJyZW50SXRlbTogbnVsbCB9KTtcbiAgICB9XG5cbiAgICBjb21wb25lbnREaWRNb3VudCAoKSB7XG4gICAgICAgIC8vIEB0b2RvXG4gICAgICAgIC8vIGlmIHdlIHdhbnQgdG8gaG9vayBpbnRvIGRpcnR5IGNoZWNraW5nLCB3ZSBuZWVkIHRvIGZpbmQgYSB3YXkgb2YgcmVmcmVzaGluZ1xuICAgICAgICAvLyBhbGwgbG9hZGVkIGRhdGEgbm90IGp1c3QgdGhlIGZpcnN0IHBhZ2UgYWdhaW4uLi5cblxuICAgICAgICB2YXIgJGNvbnRlbnQgPSAkKCcuY21zLWNvbnRlbnQtZmllbGRzJyksXG4gICAgICAgICAgICAkc29ydCA9ICQoJy5nYWxsZXJ5X19oZWFkZXJfX3NvcnQgLmRyb3Bkb3duJyksXG4gICAgICAgICAgICBzZWxmID0gdGhpcztcblxuICAgICAgICBpZiAoJGNvbnRlbnQubGVuZ3RoKSB7XG4gICAgICAgICAgICAkY29udGVudC5vbignc2Nyb2xsJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCRjb250ZW50WzBdLnNjcm9sbEhlaWdodCAtICRjb250ZW50WzBdLnNjcm9sbFRvcCA9PT0gJGNvbnRlbnRbMF0uY2xpZW50SGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgICAgIGdhbGxlcnlBY3Rpb25zLnBhZ2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzb3J0LmNoYW5nZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmhhbmRsZVNvcnQoJCh0aGlzKS52YWwoKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0ZW1TdG9yZS5hZGRDaGFuZ2VMaXN0ZW5lcih0aGlzLm9uQ2hhbmdlKTtcbiAgICB9XG5cbiAgICBjb21wb25lbnRXaWxsVW5tb3VudCAoKSB7XG4gICAgICAgIGl0ZW1TdG9yZS5yZW1vdmVDaGFuZ2VMaXN0ZW5lcih0aGlzLm9uQ2hhbmdlKTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIHZhciBSZWFjdFRlc3RVdGlscyA9IFJlYWN0LmFkZG9ucy5UZXN0VXRpbHM7XG5cbiAgICAgICAgaWYgKHRoaXMuc3RhdGUuZWRpdGluZykge1xuICAgICAgICAgICAgbGV0IGVkaXRvckNvbXBvbmVudCA9IHRoaXMuZ2V0RWRpdG9yQ29tcG9uZW50KCk7XG5cbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9J2dhbGxlcnknPlxuICAgICAgICAgICAgICAgICAgICB7ZWRpdG9yQ29tcG9uZW50fVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBpdGVtcyA9IHRoaXMuZ2V0SXRlbUNvbXBvbmVudHMoKTtcbiAgICAgICAgICAgIGxldCBidXR0b24gPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAoaXRlbVN0b3JlLmhhc05hdmlnYXRlZCgpKSB7XG4gICAgICAgICAgICAgICAgYnV0dG9uID0gPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICB0eXBlPSdidXR0b24nXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT0nc3MtdWktYnV0dG9uIHVpLWNvcm5lci1hbGwgZm9udC1pY29uLWxldmVsLXVwJ1xuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXt0aGlzLmhhbmRsZU5hdmlnYXRlLmJpbmQodGhpcyl9PlxuICAgICAgICAgICAgICAgICAgICBCYWNrXG4gICAgICAgICAgICAgICAgPC9idXR0b24+O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc29ydHMgPSA8ZGl2IGNsYXNzTmFtZT1cImdhbGxlcnlfX2hlYWRlcl9fc29ydCBmaWVsZGhvbGRlci1zbWFsbFwiIHN0eWxlPXt7d2lkdGg6ICcxNjBweCd9fT5cbiAgICAgICAgICAgICAgICA8c2VsZWN0IGNsYXNzTmFtZT1cImRyb3Bkb3duIG5vLWNoYW5nZS10cmFja1wiPlxuICAgICAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwidGl0bGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWVcbiAgICAgICAgICAgICAgICAgICAgPC9vcHRpb24+XG4gICAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJjcmVhdGVkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVkXG4gICAgICAgICAgICAgICAgICAgIDwvb3B0aW9uPlxuICAgICAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwidHlwZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZVxuICAgICAgICAgICAgICAgICAgICA8L29wdGlvbj5cbiAgICAgICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgIDwvZGl2PjtcblxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0nZ2FsbGVyeSc+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ2FsbGVyeV9faGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICB7YnV0dG9ufVxuICAgICAgICAgICAgICAgICAgICAgICAge3NvcnRzfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9J2dhbGxlcnlfX2hlYWRlcl9faXRlbXMnPlxuICAgICAgICAgICAgICAgICAgICAgICAge2l0ZW1zfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBoYW5kbGVOYXZpZ2F0ZSgpIHtcbiAgICAgICAgbGV0IG5hdmlnYXRpb24gPSBpdGVtU3RvcmUucG9wTmF2aWdhdGlvbigpO1xuXG4gICAgICAgIGdhbGxlcnlBY3Rpb25zLm5hdmlnYXRlKG5hdmlnYXRpb25bMV0pO1xuICAgIH1cblxuICAgIGhhbmRsZVNvcnQoc29ydEJ5KSB7XG4gICAgICAgIGdhbGxlcnlBY3Rpb25zLnNvcnQoc29ydEJ5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZnVuYyBvbkNoYW5nZVxuICAgICAqIEBkZXNjIFVwZGF0ZXMgdGhlIGdhbGxlcnkgc3RhdGUgd2hlbiBzb21ldGhpbmcgY2hhbmdlcyBpbiB0aGUgc3RvcmUuXG4gICAgICovXG4gICAgb25DaGFuZ2UoKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoZ2V0SXRlbVN0b3JlU3RhdGUoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGZ1bmMgc2V0RWRpdGluZ1xuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNFZGl0aW5nXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtpZF1cbiAgICAgKiBAZGVzYyBTd2l0Y2hlcyBiZXR3ZWVuIGVkaXRpbmcgYW5kIGdhbGxlcnkgc3RhdGVzLlxuICAgICAqL1xuICAgIHNldEVkaXRpbmcoaXNFZGl0aW5nLCBpZCkge1xuICAgICAgICB2YXIgbmV3U3RhdGUgPSB7IGVkaXRpbmc6IGlzRWRpdGluZyB9O1xuXG4gICAgICAgIGlmIChpZCAhPT0gdm9pZCAwKSB7XG4gICAgICAgICAgICBsZXQgY3VycmVudEl0ZW0gPSBpdGVtU3RvcmUuZ2V0QnlJZChpZCk7XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50SXRlbSAhPT0gdm9pZCAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSgkLmV4dGVuZChuZXdTdGF0ZSwgeyBjdXJyZW50SXRlbTogY3VycmVudEl0ZW0gfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShuZXdTdGF0ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZnVuYyBnZXRFZGl0b3JDb21wb25lbnRcbiAgICAgKiBAZGVzYyBHZW5lcmF0ZXMgdGhlIGVkaXRvciBjb21wb25lbnQuXG4gICAgICovXG4gICAgZ2V0RWRpdG9yQ29tcG9uZW50KCkge1xuICAgICAgICB2YXIgcHJvcHMgPSB7fTtcblxuICAgICAgICBwcm9wcy5pdGVtID0gdGhpcy5zdGF0ZS5jdXJyZW50SXRlbTtcbiAgICAgICAgcHJvcHMuc2V0RWRpdGluZyA9IHRoaXMuc2V0RWRpdGluZy5iaW5kKHRoaXMpO1xuXG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICA8RWRpdG9yIHsuLi5wcm9wc30gLz5cbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZnVuYyBnZXRJdGVtQ29tcG9uZW50c1xuICAgICAqIEBkZXNjIEdlbmVyYXRlcyB0aGUgaXRlbSBjb21wb25lbnRzIHdoaWNoIHBvcHVsYXRlIHRoZSBnYWxsZXJ5LlxuICAgICAqL1xuICAgIGdldEl0ZW1Db21wb25lbnRzKCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuc3RhdGUuaXRlbXMpLm1hcCgoa2V5KSA9PiB7XG4gICAgICAgICAgICB2YXIgaXRlbSA9IHNlbGYuc3RhdGUuaXRlbXNba2V5XSxcbiAgICAgICAgICAgICAgICBwcm9wcyA9IHt9O1xuXG4gICAgICAgICAgICBwcm9wcy5hdHRyaWJ1dGVzID0gaXRlbS5hdHRyaWJ1dGVzO1xuICAgICAgICAgICAgcHJvcHMuaWQgPSBpdGVtLmlkO1xuICAgICAgICAgICAgcHJvcHMuc2V0RWRpdGluZyA9IHRoaXMuc2V0RWRpdGluZy5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgcHJvcHMudGl0bGUgPSBpdGVtLnRpdGxlO1xuICAgICAgICAgICAgcHJvcHMudXJsID0gaXRlbS51cmw7XG4gICAgICAgICAgICBwcm9wcy50eXBlID0gaXRlbS50eXBlO1xuICAgICAgICAgICAgcHJvcHMuZmlsZW5hbWUgPSBpdGVtLmZpbGVuYW1lO1xuXG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxJdGVtIGtleT17a2V5fSB7Li4ucHJvcHN9IC8+XG4gICAgICAgICAgICApO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEdhbGxlcnk7XG4iLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IGVkaXRvckFjdGlvbnMgZnJvbSAnLi4vYWN0aW9uL2VkaXRvckFjdGlvbnMnO1xuXG5jbGFzcyBJbnB1dEZpZWxkIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRyZW5kZXIoKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxpbnB1dCBjbGFzc05hbWU9J3RleHQnIHR5cGU9J3RleHQnIHZhbHVlPXt0aGlzLnByb3BzLnZhbHVlfSBvbkNoYW5nZT17dGhpcy5oYW5kbGVDaGFuZ2UuYmluZCh0aGlzKX0gLz5cblx0XHQpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBmdW5jIGhhbmRsZUNoYW5nZVxuXHQgKiBAcGFyYW0ge29iamVjdH0gZXZlbnRcblx0ICogQGRlc2MgSGFuZGxlcyB0aGUgY2hhbmdlIGV2ZW50cyBvbiBpbnB1dCBmaWVsZHMuXG5cdCAqL1xuXHRoYW5kbGVDaGFuZ2UoZXZlbnQpIHtcblx0XHRlZGl0b3JBY3Rpb25zLnVwZGF0ZSh7IG5hbWU6IHRoaXMucHJvcHMubmFtZSwgdmFsdWU6IGV2ZW50LnRhcmdldC52YWx1ZSB9KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IElucHV0RmllbGQ7XG4iLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IGdhbGxlcnlBY3Rpb25zIGZyb20gJy4uL2FjdGlvbi9nYWxsZXJ5QWN0aW9ucyc7XG5pbXBvcnQgQ09OU1RBTlRTIGZyb20gJy4uL2NvbnN0YW50cyc7XG5pbXBvcnQgY2xhc3NOYW1lcyBmcm9tICdjbGFzc25hbWVzJztcblxuY2xhc3MgSXRlbSBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIHZhciBzdHlsZXMgPSB0aGlzLmdldEltYWdlVVJMKCksXG4gICAgICAgICAgICB0aHVtYm5haWxDbGFzc05hbWVzID0gJ2l0ZW1fX3RodW1ibmFpbCcsXG4gICAgICAgICAgICBpdGVtQ2xhc3NOYW1lcyA9IGNsYXNzTmFtZXMoe1xuICAgICAgICAgICAgICAgICdpdGVtJzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAnZm9sZGVyJzogdGhpcy5wcm9wcy50eXBlID09PSAnZm9sZGVyJ1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHRoaXMuaW1hZ2VMYXJnZXJUaGFuVGh1bWJuYWlsKCkpIHtcbiAgICAgICAgICAgIHRodW1ibmFpbENsYXNzTmFtZXMgKz0gJyBsYXJnZSc7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbmF2aWdhdGUgPSBmdW5jdGlvbigpe1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHRoaXMucHJvcHMudHlwZSA9PT0gJ2ZvbGRlcicpIHtcbiAgICAgICAgICAgIG5hdmlnYXRlID0gdGhpcy5oYW5kbGVOYXZpZ2F0ZS5iaW5kKHRoaXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtpdGVtQ2xhc3NOYW1lcyArICcgJyArIHRoaXMucHJvcHMudHlwZX0gb25DbGljaz17bmF2aWdhdGV9PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXt0aHVtYm5haWxDbGFzc05hbWVzfSBzdHlsZT17c3R5bGVzfT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9J2l0ZW1fX2FjdGlvbnMnPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT0naXRlbV9fYWN0aW9uc19fYWN0aW9uIGl0ZW1fX2FjdGlvbnNfX2FjdGlvbi0tcmVtb3ZlIFsgZm9udC1pY29uLXRyYXNoIF0nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT0nYnV0dG9uJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9e3RoaXMuaGFuZGxlRGVsZXRlLmJpbmQodGhpcyl9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT0naXRlbV9fYWN0aW9uc19fYWN0aW9uIGl0ZW1fX2FjdGlvbnNfX2FjdGlvbi0tZWRpdCBbIGZvbnQtaWNvbi1lZGl0IF0nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT0nYnV0dG9uJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9e3RoaXMuaGFuZGxlRWRpdC5iaW5kKHRoaXMpfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSdpdGVtX190aXRsZSc+e3RoaXMucHJvcHMudGl0bGV9PC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGZ1bmMgaGFuZGxlRWRpdFxuICAgICAqIEBkZXNjIEV2ZW50IGhhbmRsZXIgZm9yIHRoZSAnZWRpdCcgYnV0dG9uLlxuICAgICAqL1xuICAgIGhhbmRsZUVkaXQoKSB7XG4gICAgICAgIHRoaXMucHJvcHMuc2V0RWRpdGluZyh0cnVlLCB0aGlzLnByb3BzLmlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFdmVudCBoYW5kbGVyIGZvciB0aGUgJ2VkaXQnIGJ1dHRvbi5cbiAgICAgKi9cbiAgICBoYW5kbGVOYXZpZ2F0ZSgpIHtcbiAgICAgICAgZ2FsbGVyeUFjdGlvbnMubmF2aWdhdGUodGhpcy5wcm9wcy5maWxlbmFtZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXZlbnQgaGFuZGxlciBmb3IgdGhlICdyZW1vdmUnIGJ1dHRvbi5cbiAgICAgKi9cbiAgICBoYW5kbGVEZWxldGUoKSB7XG4gICAgICAgIC8vVE9ETyBpbnRlcm5hdGlvbmFsaXNlIGNvbmZpcm1hdGlvbiBtZXNzYWdlIHdpdGggdHJhbnNpZmV4IGlmL3doZW4gbWVyZ2VkIGludG8gY29yZVxuICAgICAgICBpZiAoY29uZmlybSgnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSB0aGlzIHJlY29yZD8nKSkge1xuICAgICAgICAgICAgZ2FsbGVyeUFjdGlvbnMuZGVzdHJveSh0aGlzLnByb3BzLmlkKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBmdW5jIGdldEltYWdlVVJMXG4gICAgICogQGRlc2MgUmV0dXJuIHRoZSBVUkwgb2YgdGhlIGltYWdlLCBkZXRlcm1pbmVkIGJ5IGl0J3MgdHlwZS4gXG4gICAgICovXG4gICAgZ2V0SW1hZ2VVUkwoKSB7XG4gICAgICAgIGlmICh0aGlzLnByb3BzLnR5cGUudG9Mb3dlckNhc2UoKS5pbmRleE9mKCdpbWFnZScpID4gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiB7YmFja2dyb3VuZEltYWdlOiAndXJsKCcgKyB0aGlzLnByb3BzLnVybCArICcpJ307XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZnVuYyBpbWFnZUxhcmdlclRoYW5UaHVtYm5haWxcbiAgICAgKiBAZGVzYyBDaGVjayBpZiBhbiBpbWFnZSBpcyBsYXJnZXIgdGhhbiB0aGUgdGh1bWJuYWlsIGNvbnRhaW5lci5cbiAgICAgKi9cbiAgICBpbWFnZUxhcmdlclRoYW5UaHVtYm5haWwoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnByb3BzLmF0dHJpYnV0ZXMuZGltZW5zaW9ucy5oZWlnaHQgPiBDT05TVEFOVFMuSVRFTV9DT01QT05FTlQuVEhVTUJOQUlMX0hFSUdIVCB8fCBcbiAgICAgICAgICAgICAgIHRoaXMucHJvcHMuYXR0cmlidXRlcy5kaW1lbnNpb25zLndpZHRoID4gQ09OU1RBTlRTLklURU1fQ09NUE9ORU5ULlRIVU1CTkFJTF9XSURUSDtcbiAgICB9XG59XG5cbkl0ZW0ucHJvcFR5cGVzID0ge1xuICAgIGF0dHJpYnV0ZXM6IFJlYWN0LlByb3BUeXBlcy5vYmplY3QsXG4gICAgaWQ6IFJlYWN0LlByb3BUeXBlcy5udW1iZXIsXG4gICAgc2V0RWRpdGluZzogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsXG4gICAgdGl0bGU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG4gICAgdHlwZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcbiAgICB1cmw6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmdcbn07XG5cbmV4cG9ydCBkZWZhdWx0IEl0ZW07XG4iLCJjb25zdCBDT05TVEFOVFMgPSB7XG5cdElURU1fU1RPUkU6IHtcblx0XHRJTklUOiAnaW5pdCcsXG5cdFx0Q0hBTkdFOiAnY2hhbmdlJyxcblx0XHRDUkVBVEU6ICdjcmVhdGUnLFxuXHRcdFVQREFURTogJ3VwZGF0ZScsXG5cdFx0REVTVFJPWTogJ2Rlc3Ryb3knLFxuXHRcdE5BVklHQVRFOiAnbmF2aWdhdGUnLFxuXHRcdFBBR0U6ICdwYWdlJyxcblx0XHRTT1JUOiAnc29ydCdcblx0fSxcblx0RURJVE9SOiB7XG5cdFx0Q0hBTkdFOiAnY2hhbmdlJyxcblx0XHRVUERBVEU6ICd1cGRhdGUnLFxuXHRcdENMRUFSOiAnY2xlYXInXG5cdH0sXG5cdElURU1fQ09NUE9ORU5UOiB7XG5cdFx0VEhVTUJOQUlMX0hFSUdIVDogMTUwLFxuXHRcdFRIVU1CTkFJTF9XSURUSDogMjAwXG5cdH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IENPTlNUQU5UUztcbiIsImltcG9ydCB7RGlzcGF0Y2hlcn0gZnJvbSAnZmx1eCc7XG5cbmxldCBfZWRpdG9yRGlzcGF0Y2hlciA9IG5ldyBEaXNwYXRjaGVyKCk7IC8vIFNpbmdsZXRvblxuXG5leHBvcnQgZGVmYXVsdCBfZWRpdG9yRGlzcGF0Y2hlcjtcbiIsImltcG9ydCB7RGlzcGF0Y2hlcn0gZnJvbSAnZmx1eCc7XG5cbmxldCBfZ2FsbGVyeURpc3BhdGNoZXIgPSBuZXcgRGlzcGF0Y2hlcigpOyAvLyBTaW5nbGV0b25cblxuZXhwb3J0IGRlZmF1bHQgX2dhbGxlcnlEaXNwYXRjaGVyO1xuIiwiaW1wb3J0ICQgZnJvbSAnanF1ZXJ5JztcbmltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgR2FsbGVyeSBmcm9tICcuL2NvbXBvbmVudC9nYWxsZXJ5JztcblxuJCgnLmFzc2V0LWdhbGxlcnknKS5lbnR3aW5lKHtcblx0J29uYWRkJzogZnVuY3Rpb24gKCkge1xuXHRcdHZhciBwcm9wcyA9IHt9O1xuXG5cdFx0cHJvcHMubmFtZSA9IHRoaXNbMF0uZ2V0QXR0cmlidXRlKCdkYXRhLWFzc2V0LWdhbGxlcnktbmFtZScpO1xuXHRcdHByb3BzLmRhdGFfdXJsID0gdGhpc1swXS5nZXRBdHRyaWJ1dGUoJ2RhdGEtYXNzZXQtZ2FsbGVyeS1kYXRhLXVybCcpO1xuXHRcdHByb3BzLnVwZGF0ZV91cmwgPSB0aGlzWzBdLmdldEF0dHJpYnV0ZSgnZGF0YS1hc3NldC1nYWxsZXJ5LXVwZGF0ZS11cmwnKTtcblx0XHRwcm9wcy5kZWxldGVfdXJsID0gdGhpc1swXS5nZXRBdHRyaWJ1dGUoJ2RhdGEtYXNzZXQtZ2FsbGVyeS1kZWxldGUtdXJsJyk7XG5cdFx0cHJvcHMuaW5pdGlhbF9mb2xkZXIgPSB0aGlzWzBdLmdldEF0dHJpYnV0ZSgnZGF0YS1hc3NldC1nYWxsZXJ5LWluaXRpYWwtZm9sZGVyJyk7XG5cdFx0cHJvcHMubGltaXQgPSB0aGlzWzBdLmdldEF0dHJpYnV0ZSgnZGF0YS1hc3NldC1nYWxsZXJ5LWxpbWl0Jyk7XG5cblx0XHRwcm9wcy5maWx0ZXJfbmFtZSA9IHRoaXNbMF0uZ2V0QXR0cmlidXRlKCdkYXRhLWFzc2V0LWdhbGxlcnktZmlsdGVyLW5hbWUnKTtcblx0XHRwcm9wcy5maWx0ZXJfdHlwZSA9IHRoaXNbMF0uZ2V0QXR0cmlidXRlKCdkYXRhLWFzc2V0LWdhbGxlcnktZmlsdGVyLXR5cGUnKTtcblx0XHRwcm9wcy5maWx0ZXJfY3JlYXRlZF9mcm9tID0gdGhpc1swXS5nZXRBdHRyaWJ1dGUoJ2RhdGEtYXNzZXQtZ2FsbGVyeS1maWx0ZXItY3JlYXRlZC1mcm9tJyk7XG5cdFx0cHJvcHMuZmlsdGVyX2NyZWF0ZWRfdG8gPSB0aGlzWzBdLmdldEF0dHJpYnV0ZSgnZGF0YS1hc3NldC1nYWxsZXJ5LWZpbHRlci1jcmVhdGVkLXRvJyk7XG5cdFx0cHJvcHMuZmlsdGVyX2ZvbGRlciA9IHRoaXNbMF0uZ2V0QXR0cmlidXRlKCdkYXRhLWFzc2V0LWdhbGxlcnktZmlsdGVyLWZvbGRlcicpO1xuXG5cdFx0aWYgKHByb3BzLm5hbWUgPT09IG51bGwgfHwgcHJvcHMudXJsID09PSBudWxsKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0UmVhY3QucmVuZGVyKFxuXHRcdFx0PEdhbGxlcnkgey4uLnByb3BzfSAvPixcblx0XHRcdHRoaXNbMF1cblx0XHQpO1xuXHR9XG59KTsiLCJpbXBvcnQgZWRpdG9yRGlzcGF0Y2hlciBmcm9tICcuLi9kaXNwYXRjaGVyL2VkaXRvckRpc3BhdGNoZXInO1xuaW1wb3J0IGVkaXRvckFjdGlvbnMgZnJvbSAnLi4vYWN0aW9uL2VkaXRvckFjdGlvbnMnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICdldmVudHMnO1xuaW1wb3J0IENPTlNUQU5UUyBmcm9tICcuLi9jb25zdGFudHMnO1xuXG52YXIgX2ZpZWxkcyA9IFtdO1xuXG5mdW5jdGlvbiBjcmVhdGUoZGF0YSkge1xuXHR2YXIgZmllbGRFeGlzdHMgPSBfZmllbGRzLmZpbHRlcigoZmllbGQpID0+IHsgcmV0dXJuIGZpZWxkLm5hbWUgPT09IGRhdGEubmFtZTsgfSkubGVuZ3RoID4gMDtcblxuXHRpZiAoZmllbGRFeGlzdHMpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRfZmllbGRzLnB1c2goe1xuXHRcdG5hbWU6IGRhdGEubmFtZSxcblx0XHR2YWx1ZTogZGF0YS52YWx1ZVxuXHR9KTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlKGRhdGEpIHtcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBfZmllbGRzLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0aWYgKF9maWVsZHNbaV0ubmFtZSA9PT0gZGF0YS5uYW1lKSB7XG5cdFx0XHRfZmllbGRzW2ldID0gZGF0YTtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiBjbGVhcigpIHtcblx0X2ZpZWxkcyA9IFtdO1xufVxuXG5jbGFzcyBFZGl0b3JTdG9yZSBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG5cblx0LyoqXG5cdCAqIEByZXR1cm4ge29iamVjdH1cblx0ICogQGRlc2MgR2V0cyB0aGUgZW50aXJlIGNvbGxlY3Rpb24gb2YgaXRlbXMuXG5cdCAqL1xuXHRnZXRBbGwoKSB7XG5cdFx0cmV0dXJuIF9maWVsZHM7XG5cdH1cblxuXHQvKipcblx0ICogQGZ1bmMgZW1pdENoYW5nZVxuXHQgKiBAZGVzYyBUcmlnZ2VyZWQgd2hlbiBzb21ldGhpbmcgY2hhbmdlcyBpbiB0aGUgc3RvcmUuXG5cdCAqL1xuXHRlbWl0Q2hhbmdlKCkge1xuXHRcdHRoaXMuZW1pdChDT05TVEFOVFMuRURJVE9SLkNIQU5HRSk7XG5cdH1cblxuXHQvKipcblx0ICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2tcblx0ICovXG5cdGFkZENoYW5nZUxpc3RlbmVyKGNhbGxiYWNrKSB7XG5cdFx0dGhpcy5vbihDT05TVEFOVFMuRURJVE9SLkNIQU5HRSwgY2FsbGJhY2spO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXG5cdCAqL1xuXHRyZW1vdmVDaGFuZ2VMaXN0ZW5lcihjYWxsYmFjaykge1xuXHRcdHRoaXMucmVtb3ZlTGlzdGVuZXIoQ09OU1RBTlRTLkVESVRPUi5DSEFOR0UsIGNhbGxiYWNrKTtcblx0fVxuXG59XG5cbmxldCBfZWRpdG9yU3RvcmUgPSBuZXcgRWRpdG9yU3RvcmUoKTsgLy8gU2luZ2xldG9uLlxuXG5lZGl0b3JEaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uIChwYXlsb2FkKSB7XG5cblx0c3dpdGNoKHBheWxvYWQuYWN0aW9uKSB7XG5cdFx0Y2FzZSBDT05TVEFOVFMuRURJVE9SLkNSRUFURTpcblx0XHRcdGNyZWF0ZShwYXlsb2FkLmRhdGEpO1xuXG5cdFx0XHRpZiAoIXBheWxvYWQuc2lsZW50KSB7XG5cdFx0XHRcdF9lZGl0b3JTdG9yZS5lbWl0Q2hhbmdlKCk7XG5cdFx0XHR9XG5cblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSBDT05TVEFOVFMuRURJVE9SLlVQREFURTpcblx0XHRcdHVwZGF0ZShwYXlsb2FkLmRhdGEpO1xuXG5cdFx0XHRpZiAoIXBheWxvYWQuc2lsZW50KSB7XG5cdFx0XHRcdF9lZGl0b3JTdG9yZS5lbWl0Q2hhbmdlKCk7XG5cdFx0XHR9XG5cblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSBDT05TVEFOVFMuRURJVE9SLkNMRUFSOlxuXHRcdFx0Y2xlYXIoKTtcblxuXHRcdFx0aWYgKCFwYXlsb2FkLnNpbGVudCkge1xuXHRcdFx0XHRfZWRpdG9yU3RvcmUuZW1pdENoYW5nZSgpO1xuXHRcdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRydWU7IC8vIE5vIGVycm9ycy4gTmVlZGVkIGJ5IHByb21pc2UgaW4gRGlzcGF0Y2hlci5cblxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IF9lZGl0b3JTdG9yZTtcbiIsImltcG9ydCBnYWxsZXJ5RGlzcGF0Y2hlciBmcm9tICcuLi9kaXNwYXRjaGVyL2dhbGxlcnlEaXNwYXRjaGVyJztcbmltcG9ydCBnYWxsZXJ5QWN0aW9ucyBmcm9tICcuLi9hY3Rpb24vZ2FsbGVyeUFjdGlvbnMnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICdldmVudHMnO1xuaW1wb3J0ICQgZnJvbSAnanF1ZXJ5JztcbmltcG9ydCBDT05TVEFOVFMgZnJvbSAnLi4vY29uc3RhbnRzJztcblxudmFyIF9pdGVtcyA9IFtdO1xudmFyIF9mb2xkZXJzID0gW107XG52YXIgX2N1cnJlbnRGb2xkZXIgPSBudWxsO1xuXG4vKipcbiAqIEBmdW5jIGluaXRcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge29iamVjdH0gZGF0YVxuICogQGRlc2MgU2V0cyBwcm9wZXJ0aWVzIG9uIHRoZSBzdG9yZS5cbiAqL1xuZnVuY3Rpb24gaW5pdChkYXRhKSB7XG5cdF9pdGVtU3RvcmUucGFnZSA9IDE7XG5cdF9pdGVtU3RvcmUubGltaXQgPSAxMDtcblx0X2l0ZW1TdG9yZS5zb3J0ID0gJ3RpdGxlJztcblx0X2l0ZW1TdG9yZS5kaXJlY3Rpb24gPSAnYXNjJztcblxuXHRpZiAoZGF0YS5maWx0ZXJfZm9sZGVyICYmIGRhdGEuaW5pdGlhbF9mb2xkZXIgJiYgZGF0YS5maWx0ZXJfZm9sZGVyICE9PSBkYXRhLmluaXRpYWxfZm9sZGVyKSB7XG5cdFx0X2ZvbGRlcnMucHVzaChbZGF0YS5maWx0ZXJfZm9sZGVyLCBkYXRhLmluaXRpYWxfZm9sZGVyXSk7XG5cdH1cblxuXHRPYmplY3Qua2V5cyhkYXRhKS5tYXAoKGtleSkgPT4ge1xuXHRcdF9pdGVtU3RvcmVba2V5XSA9IGRhdGFba2V5XTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNvcnQobmFtZSwgY2FsbGJhY2spIHtcblx0aWYgKF9pdGVtU3RvcmUuc29ydC50b0xvd2VyQ2FzZSgpID09IG5hbWUudG9Mb3dlckNhc2UoKSkge1xuXHRcdGlmIChfaXRlbVN0b3JlLmRpcmVjdGlvbi50b0xvd2VyQ2FzZSgpID09ICdhc2MnKSB7XG5cdFx0XHRfaXRlbVN0b3JlLmRpcmVjdGlvbiA9ICdkZXNjJztcblx0XHR9IGVsc2Uge1xuXHRcdFx0X2l0ZW1TdG9yZS5kaXJlY3Rpb24gPSAnYXNjJztcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0X2l0ZW1TdG9yZS5zb3J0ID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdF9pdGVtU3RvcmUuZGlyZWN0aW9uID0gJ2FzYyc7XG5cdH1cblxuXHRjYWxsYmFjayAmJiBjYWxsYmFjaygpO1xufVxuXG4vKipcbiAqIEBmdW5jIGNyZWF0ZVxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fSBpdGVtRGF0YVxuICogQGRlc2MgQWRkcyBhIGdhbGxlcnkgaXRlbSB0byB0aGUgc3RvcmUuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZShpdGVtRGF0YSkge1xuXHR2YXIgaXRlbUV4aXN0cyA9IF9pdGVtcy5maWx0ZXIoKGl0ZW0pID0+IHsgcmV0dXJuIGl0ZW0uaWQgPT09IGl0ZW1EYXRhLmlkOyB9KS5sZW5ndGggPiAwO1xuXG5cdGlmIChpdGVtRXhpc3RzKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0X2l0ZW1zLnB1c2goaXRlbURhdGEpO1xufVxuXG4vKipcbiAqIEBmdW5jIGRlc3Ryb3lcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge2ludH0gaWRcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAZGVzYyBSZW1vdmVzIGEgZ2FsbGVyeSBpdGVtIGZyb20gdGhlIHN0b3JlLlxuICovXG5mdW5jdGlvbiBkZXN0cm95KGlkLCBjYWxsYmFjaykge1xuXHQkLmFqYXgoeyAvLyBAdG9kbyBmaXggdGhpcyBqdW5rXG5cdFx0J3VybCc6IF9pdGVtU3RvcmUuZGVsZXRlX3VybCxcblx0XHQnZGF0YSc6IHtcblx0XHRcdCdpZCc6IGlkXG5cdFx0fSxcblx0XHQnZGF0YVR5cGUnOiAnanNvbicsXG5cdFx0J21ldGhvZCc6ICdHRVQnLFxuXHRcdCdzdWNjZXNzJzogKGRhdGEpID0+IHtcblx0XHRcdHZhciBpdGVtSW5kZXggPSAtMTtcblxuXHRcdFx0Ly8gR2V0IHRoZSBpbmRleCBvZiB0aGUgaXRlbSB3ZSBoYXZlIGRlbGV0ZWRcblx0XHRcdC8vIHNvIGl0IGNhbiBiZSByZW1vdmVkIGZyb20gdGhlIHN0b3JlLlxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBfaXRlbXMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRcdFx0aWYgKF9pdGVtc1tpXS5pZCA9PT0gaWQpIHtcblx0XHRcdFx0XHRpdGVtSW5kZXggPSBpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmIChpdGVtSW5kZXggPT09IC0xKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0X2l0ZW1zLnNwbGljZShpdGVtSW5kZXgsIDEpO1xuXG5cdFx0XHRjYWxsYmFjayAmJiBjYWxsYmFjaygpO1xuXHRcdH1cblx0fSk7XG59XG5cbi8qKlxuICogTmF2aWdhdGVzIHRvIGEgbmV3IGZvbGRlci5cbiAqXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBmb2xkZXJcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXG4gKi9cbmZ1bmN0aW9uIG5hdmlnYXRlKGZvbGRlciwgY2FsbGJhY2spIHtcblx0X2l0ZW1TdG9yZS5wYWdlID0gMTtcblx0X2l0ZW1TdG9yZS5maWx0ZXJfZm9sZGVyID0gZm9sZGVyO1xuXG5cdGxldCBkYXRhID0ge1xuXHRcdCdwYWdlJzogX2l0ZW1TdG9yZS5wYWdlKyssXG5cdFx0J2xpbWl0JzogX2l0ZW1TdG9yZS5saW1pdCxcblx0fTtcblxuXHRbJ2ZpbHRlcl9mb2xkZXInLCAnZmlsdGVyX25hbWUnLCAnZmlsdGVyX3R5cGUnLCAnZmlsdGVyX2NyZWF0ZWRfZnJvbScsICdmaWx0ZXJfY3JlYXRlZF90byddLmZvckVhY2goKHR5cGUpID0+IHtcblx0XHRpZiAoX2l0ZW1TdG9yZVt0eXBlXSkge1xuXHRcdFx0ZGF0YVt0eXBlXSA9IF9pdGVtU3RvcmVbdHlwZV07XG5cdFx0fVxuXHR9KTtcblxuXHQkLmFqYXgoe1xuXHRcdCd1cmwnOiBfaXRlbVN0b3JlLmRhdGFfdXJsLFxuXHRcdCdkYXRhVHlwZSc6ICdqc29uJyxcblx0XHQnZGF0YSc6IGRhdGEsXG5cdFx0J3N1Y2Nlc3MnOiBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRfaXRlbXMgPSBbXTtcblxuXHRcdFx0X2l0ZW1TdG9yZS5jb3VudCA9IGRhdGEuY291bnQ7XG5cblx0XHRcdGxldCAkc2VhcmNoID0gJCgnLmNtcy1zZWFyY2gtZm9ybScpO1xuXG5cdFx0XHRpZiAoJHNlYXJjaC5maW5kKCdbdHlwZT1oaWRkZW5dW25hbWU9XCJxW0ZvbGRlcl1cIl0nKS5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHQkc2VhcmNoLmFwcGVuZCgnPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwicVtGb2xkZXJdXCIgLz4nKTtcblx0XHRcdH1cblxuXHRcdFx0aWYoZm9sZGVyLnN1YnN0cigtMSkgPT09ICcvJykge1xuXHRcdFx0XHRmb2xkZXIgPSBmb2xkZXIuc3Vic3RyKDAsIGZvbGRlci5sZW5ndGggLSAxKTtcblx0XHRcdH1cblxuXHRcdFx0JHNlYXJjaC5maW5kKCdbdHlwZT1oaWRkZW5dW25hbWU9XCJxW0ZvbGRlcl1cIl0nKS52YWwoZW5jb2RlVVJJQ29tcG9uZW50KGZvbGRlcikpO1xuXG5cdFx0XHRpZiAoZm9sZGVyICE9PSBfaXRlbVN0b3JlLmluaXRpYWxfZm9sZGVyKSB7XG5cdFx0XHRcdF9mb2xkZXJzLnB1c2goW2ZvbGRlciwgX2N1cnJlbnRGb2xkZXIgfHwgX2l0ZW1TdG9yZS5pbml0aWFsX2ZvbGRlcl0pO1xuXHRcdFx0fVxuXG5cdFx0XHRfY3VycmVudEZvbGRlciA9IGZvbGRlcjtcblxuXHRcdFx0ZGF0YS5maWxlcy5mb3JFYWNoKChpdGVtKSA9PiB7XG5cdFx0XHRcdGdhbGxlcnlBY3Rpb25zLmNyZWF0ZShpdGVtLCB0cnVlKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRjYWxsYmFjayAmJiBjYWxsYmFjaygpO1xuXHRcdH1cblx0fSlcbn1cblxuZnVuY3Rpb24gcGFnZShjYWxsYmFjaykge1xuXHRpZiAoX2l0ZW1zLmxlbmd0aCA8IF9pdGVtU3RvcmUuY291bnQpIHtcblx0XHRsZXQgZGF0YSA9IHtcblx0XHRcdCdwYWdlJzogX2l0ZW1TdG9yZS5wYWdlKyssXG5cdFx0XHQnbGltaXQnOiBfaXRlbVN0b3JlLmxpbWl0LFxuXHRcdH07XG5cblx0XHRbJ2ZpbHRlcl9mb2xkZXInLCAnZmlsdGVyX25hbWUnLCAnZmlsdGVyX3R5cGUnLCAnZmlsdGVyX2NyZWF0ZWRfZnJvbScsICdmaWx0ZXJfY3JlYXRlZF90byddLmZvckVhY2goKHR5cGUpID0+IHtcblx0XHRcdGlmIChfaXRlbVN0b3JlW3R5cGVdKSB7XG5cdFx0XHRcdGRhdGFbdHlwZV0gPSBfaXRlbVN0b3JlW3R5cGVdO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0JC5hamF4KHtcblx0XHRcdCd1cmwnOiBfaXRlbVN0b3JlLmRhdGFfdXJsLFxuXHRcdFx0J2RhdGFUeXBlJzogJ2pzb24nLFxuXHRcdFx0J2RhdGEnOiBkYXRhLFxuXHRcdFx0J3N1Y2Nlc3MnOiBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdGRhdGEuZmlsZXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuXHRcdFx0XHRcdGdhbGxlcnlBY3Rpb25zLmNyZWF0ZShpdGVtLCB0cnVlKTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Y2FsbGJhY2sgJiYgY2FsbGJhY2soKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufVxuXG5cbi8qKlxuICogQGZ1bmMgdXBkYXRlXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IGlkXG4gKiBAcGFyYW0ge29iamVjdH0gaXRlbURhdGFcbiAqIEBkZXNjIFVwZGF0ZXMgYW4gaXRlbSBpbiB0aGUgc3RvcmUuXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZShpZCwgaXRlbURhdGEpIHtcblx0Ly8gVE9ETzpcbn1cblxuY2xhc3MgSXRlbVN0b3JlIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcblxuXHQvKipcblx0ICogQ2hlY2tzIGlmIHRoZSBnYWxsZXJ5IGhhcyBiZWVuIG5hdmlnYXRlZC5cblx0ICovXG5cdGhhc05hdmlnYXRlZCgpIHtcblx0XHRyZXR1cm4gX2ZvbGRlcnMubGVuZ3RoID4gMDtcblx0fVxuXG5cdC8qKlxuXHQgKiBHZXRzIHRoZSBmb2xkZXIgc3RhY2suXG5cdCAqL1xuXHRwb3BOYXZpZ2F0aW9uKCkge1xuXHRcdHJldHVybiBfZm9sZGVycy5wb3AoKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAcmV0dXJuIHtvYmplY3R9XG5cdCAqIEBkZXNjIEdldHMgdGhlIGVudGlyZSBjb2xsZWN0aW9uIG9mIGl0ZW1zLlxuXHQgKi9cblx0Z2V0QWxsKCkge1xuXHRcdHJldHVybiBfaXRlbXMuc29ydChmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRsZXQgc29ydCA9IF9pdGVtU3RvcmUuc29ydC50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0bGV0IGRpcmVjdGlvbiA9IF9pdGVtU3RvcmUuZGlyZWN0aW9uLnRvTG93ZXJDYXNlKCk7XG5cblx0XHRcdGlmIChkaXJlY3Rpb24gPT0gJ2FzYycpIHtcblx0XHRcdFx0aWYgKGFbc29ydF0gPCBiW3NvcnRdKSB7XG5cdFx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGFbc29ydF0gPiBiW3NvcnRdKSB7XG5cdFx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gMFxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoYVtzb3J0XSA+IGJbc29ydF0pIHtcblx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoYVtzb3J0XSA8IGJbc29ydF0pIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAwXG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogQGZ1bmMgZ2V0QnlJZFxuXHQgKiBAcGFyYW0ge3N0cmluZ30gaWRcblx0ICogQHJldHVybiB7b2JqZWN0fVxuXHQgKi9cblx0Z2V0QnlJZChpZCkge1xuXHRcdHZhciBpdGVtID0gbnVsbDtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgX2l0ZW1zLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0XHRpZiAoX2l0ZW1zW2ldLmlkID09PSBpZCkge1xuXHRcdFx0XHRpdGVtID0gX2l0ZW1zW2ldO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gaXRlbTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAZnVuYyBlbWl0Q2hhbmdlXG5cdCAqIEBkZXNjIFRyaWdnZXJlZCB3aGVuIHNvbWV0aGluZyBjaGFuZ2VzIGluIHRoZSBzdG9yZS5cblx0ICovXG5cdGVtaXRDaGFuZ2UoKSB7XG5cdFx0dGhpcy5lbWl0KENPTlNUQU5UUy5JVEVNX1NUT1JFLkNIQU5HRSk7XG5cdH1cblxuXHQvKipcblx0ICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2tcblx0ICovXG5cdGFkZENoYW5nZUxpc3RlbmVyKGNhbGxiYWNrKSB7XG5cdFx0dGhpcy5vbihDT05TVEFOVFMuSVRFTV9TVE9SRS5DSEFOR0UsIGNhbGxiYWNrKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja1xuXHQgKi9cblx0cmVtb3ZlQ2hhbmdlTGlzdGVuZXIoY2FsbGJhY2spIHtcblx0XHR0aGlzLnJlbW92ZUxpc3RlbmVyKENPTlNUQU5UUy5JVEVNX1NUT1JFLkNIQU5HRSwgY2FsbGJhY2spO1xuXHR9XG59XG5cbmxldCBfaXRlbVN0b3JlID0gbmV3IEl0ZW1TdG9yZSgpOyAvLyBTaW5nbGV0b25cblxuZ2FsbGVyeURpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24gKHBheWxvYWQpIHtcblx0c3dpdGNoKHBheWxvYWQuYWN0aW9uKSB7XG5cdFx0Y2FzZSBDT05TVEFOVFMuSVRFTV9TVE9SRS5JTklUOlxuXHRcdFx0aW5pdChwYXlsb2FkLmRhdGEpO1xuXG5cdFx0XHRpZiAoIXBheWxvYWQuc2lsZW50KSB7XG5cdFx0XHRcdF9pdGVtU3RvcmUuZW1pdENoYW5nZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHRicmVhaztcblxuXHRcdGNhc2UgQ09OU1RBTlRTLklURU1fU1RPUkUuQ1JFQVRFOlxuXHRcdFx0Y3JlYXRlKHBheWxvYWQuZGF0YSk7XG5cblx0XHRcdGlmICghcGF5bG9hZC5zaWxlbnQpIHtcblx0XHRcdFx0X2l0ZW1TdG9yZS5lbWl0Q2hhbmdlKCk7XG5cdFx0XHR9XG5cblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSBDT05TVEFOVFMuSVRFTV9TVE9SRS5ERVNUUk9ZOlxuXHRcdFx0ZGVzdHJveShwYXlsb2FkLmRhdGEuaWQsICgpID0+IHtcblx0XHRcdFx0aWYgKCFwYXlsb2FkLnNpbGVudCkge1xuXHRcdFx0XHRcdF9pdGVtU3RvcmUuZW1pdENoYW5nZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0YnJlYWs7XG5cblx0XHRjYXNlIENPTlNUQU5UUy5JVEVNX1NUT1JFLk5BVklHQVRFOlxuXHRcdFx0bmF2aWdhdGUocGF5bG9hZC5kYXRhLmZvbGRlciwgKCkgPT4ge1xuXHRcdFx0XHRpZiAoIXBheWxvYWQuc2lsZW50KSB7XG5cdFx0XHRcdFx0X2l0ZW1TdG9yZS5lbWl0Q2hhbmdlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRicmVhaztcblxuXHRcdGNhc2UgQ09OU1RBTlRTLklURU1fU1RPUkUuVVBEQVRFOlxuXHRcdFx0dXBkYXRlKHBheWxvYWQuZGF0YS5pZCwgcGF5bG9hZC5kYXRhLnVwZGF0ZXMpO1xuXG5cdFx0XHRpZiAoIXBheWxvYWQuc2lsZW50KSB7XG5cdFx0XHRcdF9pdGVtU3RvcmUuZW1pdENoYW5nZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHRicmVhaztcblxuXHRcdGNhc2UgQ09OU1RBTlRTLklURU1fU1RPUkUuUEFHRTpcblx0XHRcdHBhZ2UoKCkgPT4ge1xuXHRcdFx0XHRpZiAoIXBheWxvYWQuc2lsZW50KSB7XG5cdFx0XHRcdFx0X2l0ZW1TdG9yZS5lbWl0Q2hhbmdlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRicmVhaztcblxuXHRcdGNhc2UgQ09OU1RBTlRTLklURU1fU1RPUkUuU09SVDpcblx0XHRcdHNvcnQocGF5bG9hZC5kYXRhLm5hbWUsICgpID0+IHtcblx0XHRcdFx0aWYgKCFwYXlsb2FkLnNpbGVudCkge1xuXHRcdFx0XHRcdF9pdGVtU3RvcmUuZW1pdENoYW5nZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0YnJlYWs7XG5cdH1cblxuXHRyZXR1cm4gdHJ1ZTsgLy8gTm8gZXJyb3JzLiBOZWVkZWQgYnkgcHJvbWlzZSBpbiBEaXNwYXRjaGVyLlxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IF9pdGVtU3RvcmU7XG4iXX0=
