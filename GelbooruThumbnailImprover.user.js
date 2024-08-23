
// ==UserScript==
// @name         Thumbnail Quality Enhancer for Gelbooru
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Enhance the quality of thumbnail images by loading full-size images instead.
// @author       Catto
// @match        https://gelbooru.com/*
// @grant        none
// ==/UserScript==
(function() {
    'use strict';
    // Function to replace thumbnails with full-size images
    function replaceWithFullSize() {
        // Select all img elements within elements with the class 'thumbnail-preview'
        document.querySelectorAll('.thumbnail-preview img').forEach(function(img) {
            let src = img.getAttribute('src');
            // Check if the src contains the thumbnail path
            if (src.includes('/thumbnails/') && src.includes('thumbnail')) {
                // Replace 'thumbnails/' with 'images/' and remove 'thumbnail' prefix
                let baseSrc = src.replace('/thumbnails/', '/images/').replace('thumbnail_', '');
                // Remove the .jpg extension from the baseSrc
                let base = baseSrc.substring(0, baseSrc.lastIndexOf('.'));
                // Possible extensions in the order of preference
                const extensions = ['.jpg', '.jpeg', '.gif', '.png'];
                // Function to test different image formats
                let tryLoadImage = function(extIndex) {
                    if (extIndex >= extensions.length) {
                        console.error("No valid image format found for: " + base);
                        return; // Stop if no valid format is found
                    }
                    // Create a new image element to test loading the actual image
                    let testImage = new Image();
                    testImage.onerror = function() {
                        // If the image fails to load, try the next extension
                        tryLoadImage(extIndex + 1);
                    };
                    testImage.onload = function() {
                        // If the image loads successfully, set it as the source
                        img.setAttribute('src', base + extensions[extIndex]);
                    };
                    // Attempt to set the image source with the current extension
                    testImage.src = base + extensions[extIndex];
                };
                // Start trying to load the image with the first extension
                tryLoadImage(0);
            }
        });
    }
    // Run the replace function when the window loads
    window.addEventListener('load', replaceWithFullSize);
})();
