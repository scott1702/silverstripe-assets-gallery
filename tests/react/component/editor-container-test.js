// jest.dontMock('../../../javascript/src/sections/editor/controller.js');
// 
// import React from 'react'
// import $ from 'jQuery';
// import ReactDOM from 'react-dom';
// import { Provider } from 'react-redux';
// import i18n from 'i18n';
// import ReactTestUtils from 'react-addons-test-utils';
// 
// const EditorContainer = require('../../../javascript/src/sections/editor/controller.js').EditorContainer;
// 
// describe('EditorContainer', function() {
// 
//     var props;
// 
//     beforeEach(function () {
//         props = {
//             file: {
//                 title: 'file1',
//                 attributes: {
//                     dimensions: {
//                         width: 10,
//                         height: 10
//                     }
//                 }
//             },
//             editorFields: [{
// 				label: 'label',
// 				name: 'name',
// 				value: 'value'
// 			}],
//             backend: {}
//         }
//     });
// 
//     describe('onFieldChange()', () => {
//         var editor, event = {};
//         
//         beforeEach(() => {
//             props.updateEditorField = jest.genMockFunction();
// 
//             editor = ReactTestUtils.renderIntoDocument(
//             	<EditorContainer {...props} />
//             );
//             
//             event.target = {
//                 name: 'name',
//                 value: 'value'
//             }
//         });
//         
//         it('should call props.updateEditorField with event name and value', () => {
//             editor.onFieldChange(event)
//             
//             expect(editor.props.updateEditorField).toBeCalledWith({
//                 name: 'name',
//                 value: 'value'
//             });
//         })
//     });
//     
//     // describe('onFileSave()', function () {
//     //     var editor;
//     //     
//     //     beforeEach(function () {
//     //         props.onFileSave = jest.genMockFunction();
//     //         
//     //         editor = ReactTestUtils.renderIntoDocument(
//     //         	<EditorContainer {...props} />
//     //         );
//     //     });
//     //     
//     //     it('should call props.onFileSave()', function () {
//     //         editor.onFileSave();
//     //         
//     //         expect(editor.props.onFileSave).toBeCalled();
//     //     });
//     // });
//     // 
//     // describe('onCancel()', function () {
//     //     var editor;
//     //     
//     //     beforeEach(function () {
//     //         props.onCancel = jest.genMockFunction();
//     //         
//     //         editor = ReactTestUtils.renderIntoDocument(
//     //             <EditorContainer {...props} />
//     //         );
//     //     });
//     //     
//     //     it('should call props.onCancel()', function () {
//     //         editor.onCancel();
//     //         
//     //         expect(editor.props.onCancel).toBeCalled();
//     //     });
//     // });
// });
