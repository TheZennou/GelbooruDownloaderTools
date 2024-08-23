// ==UserScript==
// @name         Gelbooru Improved Image Downloader with Custom Location
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Download Gelbooru images with separate tag files to a custom location
// @match        https://gelbooru.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// ==/UserScript==

(function() {
    'use strict';

    const API_KEY = 'YOUR_API_KEY_HERE'; // you don't have to fill this out if you don't want to.
    const USER_ID = 'YOUR_USER_ID_HERE'; // you don't have to fill this out if you don't want to.
    const API_BASE = 'https://gelbooru.com/index.php?page=dapi&s=post&q=index';

    let hoveredImageId = null;

    // Add settings to the top navigation
    function addSettingsToNavBar() {
        const topNav = document.querySelector('.topnav');
        if (topNav) {
            const settingsContainer = document.createElement('div');
            settingsContainer.style.display = 'inline-block';
            settingsContainer.style.marginLeft = '10px';
            settingsContainer.style.marginTop = '15px';

            // Download location input
            const locationInput = createInput('text', 'downloadLocation', 'Download Prefix');
            settingsContainer.appendChild(locationInput);

            // Single tag mode checkbox
            const singleTagModeCheckbox = createCheckbox('singleTagMode', 'Single Tag Mode');
            settingsContainer.appendChild(singleTagModeCheckbox);

            // Single tag input (hidden by default)
            const singleTagInput = createInput('text', 'singleTag', 'Single Tag');
            singleTagInput.style.display = 'none';
            settingsContainer.appendChild(singleTagInput);

            // Remove underscores checkbox
            const removeUnderscoresCheckbox = createCheckbox('removeUnderscores', 'Remove Underscores');
            settingsContainer.appendChild(removeUnderscoresCheckbox);

            topNav.insertBefore(settingsContainer, topNav.firstChild);

            // Event listener for single tag mode checkbox
            singleTagModeCheckbox.querySelector('input').addEventListener('change', function() {
                singleTagInput.style.display = this.checked ? 'inline-block' : 'none';
                saveSetting('gelbooruSingleTagMode', this.checked);
            });

            // Load saved values from Local Storage
            loadSavedSettings();
        }
    }

    function createInput(type, id, placeholder) {
        const input = document.createElement('input');
        input.type = type;
        input.id = id;
        input.placeholder = placeholder;
        input.style.padding = '5px';
        input.style.marginRight = '5px';
        return input;
    }

    function createCheckbox(id, labelText) {
        const container = document.createElement('div');
        container.style.display = 'inline-block';
        container.style.marginRight = '10px';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;

        const label = document.createElement('label');
        label.htmlFor = id;
        label.textContent = labelText;

        container.appendChild(checkbox);
        container.appendChild(label);

        return container;
    }

    function loadSavedSettings() {
        const downloadLocation = localStorage.getItem('gelbooruDownloadLocation');
        const singleTagMode = localStorage.getItem('gelbooruSingleTagMode') === 'true';
        const singleTag = localStorage.getItem('gelbooruSingleTag');
        const removeUnderscores = localStorage.getItem('gelbooruRemoveUnderscores') === 'true';

        if (downloadLocation) document.getElementById('downloadLocation').value = downloadLocation;
        document.getElementById('singleTagMode').checked = singleTagMode;
        if (singleTag) document.getElementById('singleTag').value = singleTag;
        document.getElementById('removeUnderscores').checked = removeUnderscores;

        // Show/hide single tag input based on saved setting
        document.getElementById('singleTag').style.display = singleTagMode ? 'inline-block' : 'none';
    }

    function saveSetting(key, value) {
        localStorage.setItem(key, value);
    }

    function getSettings() {
        return {
            downloadLocation: document.getElementById('downloadLocation').value,
            singleTagMode: document.getElementById('singleTagMode').checked,
            singleTag: document.getElementById('singleTag').value,
            removeUnderscores: document.getElementById('removeUnderscores').checked
        };
    }

    function getPostIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    function getImageDetailsFromAPI(id) {
        const url = `${API_BASE}&json=1&api_key=${API_KEY}&user_id=${USER_ID}&id=${id}`;

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function(response) {
                const data = JSON.parse(response.responseText);
                if (data && data.post && data.post[0]) {
                    downloadImageAndTags(data.post[0]);
                } else {
                    console.error('Failed to fetch image details');
                }
            },
            onerror: function(error) {
                console.error('API request failed:', error);
            }
        });
    }

    function downloadImageAndTags(imageData) {
        const settings = getSettings();
        const fileUrl = imageData.file_url;
        const fileExt = fileUrl.split('.').pop().split('?')[0];
        const baseFileName = `gelbooru_${imageData.id}`;
        const downloadLocation = settings.downloadLocation;

        // Download image
        GM_download({
            url: fileUrl,
            name: `${downloadLocation}/${baseFileName}.${fileExt}`,
            onload: function() {
                console.log('Image downloaded successfully');
            },
            onerror: function(error) {
                console.error('Image download failed:', error);
            }
        });

        // Create and download tags file
        let tags = settings.singleTagMode ? settings.singleTag : imageData.tags;
        if (settings.removeUnderscores) {
            tags = tags.replace(/_/g, ' ');
        }
        
        const tagsBlob = new Blob([tags], { type: 'text/plain' });
        const tagsUrl = URL.createObjectURL(tagsBlob);

        GM_download({
            url: tagsUrl,
            name: `${downloadLocation}/${baseFileName}.txt`,
            onload: function() {
                console.log('Tags file downloaded successfully');
                URL.revokeObjectURL(tagsUrl);
            },
            onerror: function(error) {
                console.error('Tags file download failed:', error);
                URL.revokeObjectURL(tagsUrl);
            }
        });
    }

    // Setup for browse page
    if (window.location.href.includes('page=post&s=list')) {
        document.addEventListener('mouseover', function(e) {
            const thumbnail = e.target.closest('.thumbnail-preview');
            if (thumbnail) {
                const link = thumbnail.querySelector('a');
                if (link) {
                    hoveredImageId = link.id.replace('p', '');
                }
            }
        });

        document.addEventListener('mouseout', function(e) {
            if (e.target.closest('.thumbnail-preview')) {
                hoveredImageId = null;
            }
        });
    }

    // Key press event listener
    document.addEventListener('keydown', function(e) {
        if (e.key === 'b') {
            let postId;
            if (window.location.href.includes('page=post&s=view')) {
                postId = getPostIdFromUrl();
            } else if (hoveredImageId) {
                postId = hoveredImageId;
            }

            if (postId) {
                getImageDetailsFromAPI(postId);
            } else {
                console.error('No image selected for download');
            }
        }
    });

    // Add settings to the navigation bar when the page loads
    window.addEventListener('load', addSettingsToNavBar);

    // Save settings when they change
    document.addEventListener('change', function(e) {
        if (e.target.closest('.topnav')) {
            const settings = getSettings();
            for (const [key, value] of Object.entries(settings)) {
                saveSetting(`gelbooru${key.charAt(0).toUpperCase() + key.slice(1)}`, value);
            }
        }
    });

    console.log('Gelbooru Improved Image Downloader is active. Set download location and hover over an image, then press "b" to download.');
})();
