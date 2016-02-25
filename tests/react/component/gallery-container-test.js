jest.dontMock('../../../javascript/src/sections/gallery/controller.js');

import React from 'react'
import $ from 'jQuery';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import i18n from 'i18n';
import ReactTestUtils from 'react-addons-test-utils';

const GalleryContainer = require('../../../javascript/src/sections/gallery/controller.js').GalleryContainer;
// GalleryContainer.sorters = [];

describe('GalleryContainer', function() {

    var props;

    beforeEach(function () {
        props = {
            backend: {},
            actions: {},
            gallery: {
                parentFolderID: null,
                selectedFiles: [],
                files: []
            }
        };
    });
    
    describe('handleSort()', () => {
        var gallery;

        beforeEach(function () {
            props.actions.sortFiles = jest.genMockFunction();

            gallery = ReactTestUtils.renderIntoDocument(
                <GalleryContainer {...props} />
            );
        });

        it('should call props.actions.sortFiles()', function () {
            gallery.handleSort();
            
            expect(props.actions.sortFiles).toBeCalled();
        });
    });
    
    describe('getNoItemsNotice()', () => {

        it('should return the no items notice if there are no files', function () {
            props.gallery.count = 0;

            const gallery = ReactTestUtils.renderIntoDocument(
                <GalleryContainer {...props} />
            );

            expect(getNoItemsNotice()).toContain('gallery__no-item-notice');
        });
        
        it('should return null if there is at least one file', function () {
            props.gallery.count = 1;

            const gallery = ReactTestUtils.renderIntoDocument(
                <GalleryContainer {...props} />
            );

            expect(getNoItemsNotice()).toBe(null);
        });
    });

    // describe('getBackButton()', function () {
    //     var gallery;
    // 
    //     beforeEach(function () {
    //         props.backend = {
    //             on: function () {},
    //             search: function () {}
    //         };
    // 
    //         gallery = ReactTestUtils.renderIntoDocument(
    //             <GalleryComponent {...props} />
    //         );
    //     });
    // 
    //     it('should not return a back button it we\'re at the top level', function () {
    //         expect(gallery.getBackButton()).toBe(null);
    //     });
    // 
    //     it('should return a back button if we\'re in a folder.', function () {
    //         var button;
    // 
    //         gallery.folders.push('Uploads');
    // 
    //         button = gallery.getBackButton();
    // 
    //         expect(button).not.toBe(null);
    //         expect(button.type).toBe('button');
    //         expect(button.ref).toBe('backButton')
    //     });
    // });

    describe('getMoreButton()', function () {

    });

    describe('getMoreButton()', function () {

    });

    describe('onCancel()', function () {

    });

    describe('onCancel()', function () {

    });

    describe('onFileDelete()', function () {

    });

    describe('onFileEdit()', function () {

    });

    describe('onFileNavigate()', function () {

    });

    describe('onNavigate()', function () {

    });

    describe('onMoreClick()', function () {

    });

    describe('onBackClick()', function () {

    });

    describe('onFileSave()', function () {

    });
});
