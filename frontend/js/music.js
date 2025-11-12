document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchInput = document.getElementById('music-search-input');
    const resultsList = document.getElementById('music-results-list');
    const resultsSection = document.getElementById('results-section');
    const emptyState = document.getElementById('empty-state');
    const player = document.getElementById('music-player');
    const playerContainer = document.getElementById('music-player-container');
    const playerTrackImage = document.getElementById('player-track-image');
    const playerTrackTitle = document.getElementById('player-track-title');
    const playerTrackArtist = document.getElementById('player-track-artist');
    const closePlayerBtn = document.getElementById('close-player');
    
    // Queue Elements
    const queuePanel = document.getElementById('queue-panel');
    const toggleQueueBtn = document.getElementById('toggle-queue-btn');
    const closeQueueBtn = document.getElementById('close-queue-btn');
    const clearQueueBtn = document.getElementById('clear-queue-btn');
    const queueList = document.getElementById('queue-list');
    const queueEmpty = document.getElementById('queue-empty');
    const queueCount = document.getElementById('queue-count');
    const queueBadge = document.getElementById('queue-badge');
    const queueNowPlaying = document.getElementById('queue-now-playing');
    const queueCurrentImage = document.getElementById('queue-current-image');
    const queueCurrentTitle = document.getElementById('queue-current-title');
    const queueCurrentArtist = document.getElementById('queue-current-artist');
    
    // Lyrics Elements
    const lyricsPanel = document.getElementById('lyrics-panel');
    const toggleLyricsBtn = document.getElementById('toggle-lyrics-btn');
    const closeLyricsBtn = document.getElementById('close-lyrics-btn');
    const lyricsTrackImage = document.getElementById('lyrics-track-image');
    const lyricsTrackTitle = document.getElementById('lyrics-track-title');
    const lyricsTrackArtist = document.getElementById('lyrics-track-artist');
    const lyricsLoading = document.getElementById('lyrics-loading');
    const lyricsText = document.getElementById('lyrics-text');
    const lyricsError = document.getElementById('lyrics-error');
    const mainContent = document.getElementById('main-content');

    // State
    let currentTrack = null;
    let musicQueue = [];
    let currentQueueIndex = -1;

    // Load queue from localStorage
    const loadQueue = () => {
        try {
            const saved = localStorage.getItem('heimdall-music-queue');
            if (saved) {
                musicQueue = JSON.parse(saved);
                updateQueueUI();
            }
        } catch (e) {
            console.error('Failed to load queue:', e);
        }
    };

    // Save queue to localStorage
    const saveQueue = () => {
        try {
            localStorage.setItem('heimdall-music-queue', JSON.stringify(musicQueue));
        } catch (e) {
            console.error('Failed to save queue:', e);
        }
    };

    // Set navbar profile image
    const setNavbarProfileImage = () => {
        const img = document.getElementById('nav-profile-img');
        if (!img) return;

        const raw = localStorage.getItem('vstream-current-profile');
        if (!raw) return;

        try {
            const profile = JSON.parse(raw);
            if (profile && profile.image) {
                img.src = profile.image;
                return;
            }
        } catch (e) {}

        const name = raw;
        if (typeof name === 'string' && name.length > 0) {
            const initial = name.charAt(0).toUpperCase();
            img.src = `https://placehold.co/40x40/e50914/white?text=${initial}`;
        }
    };

    setNavbarProfileImage();

    // Format duration
    const formatDuration = (seconds) => {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Debounce function
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };

    // Parse track info
    const parseTrackInfo = (youtubeTitle, channelName) => {
        let artist = channelName || 'Unknown Artist';
        let title = youtubeTitle;

        const cleanTitle = (str) => {
            return str
                .replace(/\(official\s*(video|audio|music\s*video|lyric\s*video)\)/gi, '')
                .replace(/\[official\s*(video|audio|music\s*video|lyric\s*video)\]/gi, '')
                .replace(/official\s*(video|audio|music\s*video|lyric\s*video)/gi, '')
                .replace(/\(lyric(s)?\s*video\)/gi, '')
                .replace(/\[lyric(s)?\s*video\]/gi, '')
                .replace(/lyric(s)?\s*video/gi, '')
                .replace(/\(.*?\d{4}.*?remaster(ed)?\)/gi, '')
                .replace(/\(.*?remaster(ed)?\)/gi, '')
                .replace(/\[.*?remaster(ed)?\]/gi, '')
                .replace(/\(.*?version\)/gi, '')
                .replace(/\[.*?version\]/gi, '')
                .replace(/\(.*?remix\)/gi, '')
                .replace(/\[.*?remix\]/gi, '')
                .replace(/\(.*?edit\)/gi, '')
                .replace(/\[.*?edit\]/gi, '')
                .replace(/【.*?】/g, '')
                .replace(/〈.*?〉/g, '')
                .replace(/\(ft\.?.*?\)/gi, '')
                .replace(/\[ft\.?.*?\]/gi, '')
                .replace(/feat\.?\s+.*/gi, '')
                .replace(/\s*-\s*topic$/gi, '')
                .replace(/\s+/g, ' ')
                .trim();
        };

        if (youtubeTitle.includes(' - ')) {
            const parts = youtubeTitle.split(' - ');
            if (parts.length >= 2) {
                artist = cleanTitle(parts[0]);
                title = cleanTitle(parts.slice(1).join(' - '));
            }
        } else if (youtubeTitle.includes(': ')) {
            const parts = youtubeTitle.split(': ');
            if (parts.length >= 2) {
                artist = cleanTitle(parts[0]);
                title = cleanTitle(parts.slice(1).join(': '));
            }
        } else if (youtubeTitle.toLowerCase().includes(' by ')) {
            const index = youtubeTitle.toLowerCase().indexOf(' by ');
            title = cleanTitle(youtubeTitle.substring(0, index));
            artist = cleanTitle(youtubeTitle.substring(index + 4));
        } else {
            title = cleanTitle(youtubeTitle);
        }

        artist = artist
            .replace(/VEVO$/i, '')
            .replace(/official$/i, '')
            .replace(/\s*-\s*topic$/i, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!artist || artist === 'Unknown Artist' || artist.length === 0) {
            artist = channelName || 'Unknown Artist';
        }

        return { artist, title };
    };

    // Search music
    async function searchMusic(query) {
        if (!query || query.trim().length < 2) {
            resultsSection.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        resultsList.innerHTML = `
            <div class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
            </div>
        `;

        try {
            const response = await fetch(`http://127.0.0.1:8000/api/music/search/${encodeURIComponent(query)}`);
            const results = await response.json();

            resultsList.innerHTML = '';

            if (results.length === 0) {
                resultsList.innerHTML = `
                    <div class="text-center py-12">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p class="text-gray-400 text-lg">No results found for "${query}"</p>
                        <p class="text-gray-500 text-sm mt-2">Try a different search term</p>
                    </div>
                `;
                return;
            }

            results.forEach(track => {
                const trackCard = document.createElement('div');
                trackCard.className = 'flex items-center p-4 bg-brand-gray rounded-xl hover:bg-brand-light-gray transition-all duration-200 group';
                
                const duration = track.duration ? formatDuration(track.duration) : '';
                
                trackCard.innerHTML = `
                    <img src="${track.image || 'https://placehold.co/80x80/1a1d23/666?text=No+Image'}" 
                         alt="${track.title}" 
                         class="w-20 h-20 rounded-lg object-cover shadow-md mr-4 flex-shrink-0">
                    <div class="flex-1 min-w-0 mr-4">
                        <h3 class="font-bold text-lg truncate group-hover:text-brand-red transition-colors duration-200">
                            ${track.title}
                        </h3>
                        <p class="text-sm text-gray-400 truncate">${track.artist}</p>
                        ${duration ? `<p class="text-xs text-gray-500 mt-1">${duration}</p>` : ''}
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="play-btn p-2 hover:bg-brand-light-gray rounded-lg transition-colors" title="Play now">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-500 group-hover:text-brand-red transition-colors duration-200" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                            </svg>
                        </button>
                        <button class="add-queue-btn p-2 hover:bg-brand-light-gray rounded-lg transition-colors" title="Add to queue">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500 hover:text-brand-red transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                `;
                
                const playBtn = trackCard.querySelector('.play-btn');
                const addQueueBtn = trackCard.querySelector('.add-queue-btn');
                
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    playTrack(track);
                });
                
                addQueueBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    addToQueue(track);
                });

                resultsList.appendChild(trackCard);
            });

        } catch (error) {
            console.error('Search failed:', error);
            resultsList.innerHTML = `
                <div class="text-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p class="text-red-400 text-lg">Error loading results</p>
                    <p class="text-gray-500 text-sm mt-2">Please try again later</p>
                </div>
            `;
        }
    }

    // Play track
    async function playTrack(track, fromQueue = false) {        
        currentTrack = track;
        
        playerTrackImage.src = track.image || 'https://placehold.co/80x80/1a1d23/666?text=No+Image';
        playerTrackTitle.textContent = track.title;
        playerTrackArtist.textContent = track.artist;
        playerContainer.classList.remove('hidden');
        
        // Update queue now playing
        if (queueNowPlaying) {
            queueCurrentImage.src = track.image || 'https://placehold.co/80x80/1a1d23/666?text=No+Image';
            queueCurrentTitle.textContent = track.title;
            queueCurrentArtist.textContent = track.artist;
            queueNowPlaying.classList.remove('hidden');
        }
        
        player.src = '';
        player.innerHTML = '<source src="" type="audio/mpeg">';
        
        try {
            const response = await fetch(
                `http://127.0.0.1:8000/api/music/stream?source=${track.source}&id=${encodeURIComponent(track.id)}`
            );
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            player.src = data.stream_url;
            player.play();

        } catch (error) {
            console.error('Failed to get stream URL:', error);
            
            playerTrackTitle.textContent = 'Error Playing Track';
            playerTrackArtist.textContent = error.message || 'Could not load audio stream';
            
            setTimeout(() => {
                playerContainer.classList.add('hidden');
            }, 3000);
        }
    }

    // Add to queue
    function addToQueue(track) {
        // Check if already in queue
        const exists = musicQueue.some(t => t.id === track.id);
        if (exists) {
            showNotification('Already in queue', 'warning');
            return;
        }

        musicQueue.push(track);
        saveQueue();
        updateQueueUI();
        showNotification('Added to queue', 'success');
    }

    // Remove from queue
    function removeFromQueue(index) {
        musicQueue.splice(index, 1);
        saveQueue();
        updateQueueUI();
    }

    // Clear queue
    function clearQueue() {
        if (musicQueue.length === 0) return;
        
        if (confirm('Clear entire queue?')) {
            musicQueue = [];
            currentQueueIndex = -1;
            saveQueue();
            updateQueueUI();
            showNotification('Queue cleared', 'info');
        }
    }

    // Play next in queue
    function playNext() {
        if (musicQueue.length === 0) {
            console.log('Queue is empty');
            return;
        }

        const nextTrack = musicQueue.shift(); // Remove first item
        saveQueue();
        updateQueueUI();
        playTrack(nextTrack, true);
    }

    // Update queue UI
    function updateQueueUI() {
        const count = musicQueue.length;
        queueCount.textContent = `(${count})`;
        
        if (count > 0) {
            queueBadge.textContent = count;
            queueBadge.classList.remove('hidden');
            queueList.classList.remove('hidden');
            queueEmpty.classList.add('hidden');
        } else {
            queueBadge.classList.add('hidden');
            queueList.classList.add('hidden');
            queueEmpty.classList.remove('hidden');
        }

        queueList.innerHTML = '';

        musicQueue.forEach((track, index) => {
            const queueItem = document.createElement('div');
            queueItem.className = 'flex items-center p-3 bg-brand-black rounded-lg hover:bg-brand-light-gray transition-all duration-200 cursor-pointer group queue-item-enter';
            
            queueItem.innerHTML = `
                <span class="text-gray-500 w-6 text-sm">${index + 1}</span>
                <img src="${track.image || 'https://placehold.co/40x40/1a1d23/666?text=No+Image'}" 
                     alt="${track.title}" 
                     class="w-10 h-10 rounded object-cover shadow-md mx-3">
                <div class="flex-1 min-w-0">
                    <h4 class="font-semibold text-sm truncate">${track.title}</h4>
                    <p class="text-xs text-gray-400 truncate">${track.artist}</p>
                </div>
                <button class="remove-queue-btn opacity-0 group-hover:opacity-100 p-2 hover:bg-brand-gray rounded transition-all" title="Remove">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 hover:text-brand-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            `;
            
            queueItem.addEventListener('click', (e) => {
                if (!e.target.closest('.remove-queue-btn')) {
                    // Play this track and remove all before it
                    const tracksToRemove = index;
                    musicQueue.splice(0, tracksToRemove);
                    playNext();
                }
            });
            
            const removeBtn = queueItem.querySelector('.remove-queue-btn');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeFromQueue(index);
            });

            queueList.appendChild(queueItem);
        });
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const colors = {
            success: 'bg-green-600',
            warning: 'bg-yellow-600',
            info: 'bg-blue-600',
            error: 'bg-red-600'
        };
        
        notification.className = `fixed bottom-24 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(20px)';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    // Toggle queue panel
    function toggleQueuePanel() {
        const isHidden = queuePanel.classList.contains('hidden');
        
        if (isHidden) {
            closeLyricsPanel(); // Close lyrics if open
            queuePanel.classList.remove('hidden');
            if (window.innerWidth >= 768) {
                mainContent.style.marginRight = '400px';
            }
        } else {
            queuePanel.classList.add('hidden');
            mainContent.style.marginRight = '0';
        }
    }

    // Close queue panel
    function closeQueuePanel() {
        queuePanel.classList.add('hidden');
        mainContent.style.marginRight = '0';
    }

    // Fetch lyrics
    async function fetchLyrics(artist, title) {
        lyricsLoading.classList.remove('hidden');
        lyricsText.classList.add('hidden');
        lyricsError.classList.add('hidden');

        console.log(`Fetching lyrics for: "${artist}" - "${title}"`);

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/api/music/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`
            );

            if (response.status === 404) {
                throw new Error('Lyrics not found');
            }
            
            if (response.status === 504) {
                throw new Error('Lyrics service timed out');
            }
            
            if (!response.ok) {
                throw new Error(`Failed to fetch lyrics (${response.status})`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (data.lyrics) {
                displayLyrics(data.lyrics);
            } else {
                throw new Error('No lyrics in response');
            }

        } catch (error) {
            console.error('Failed to fetch lyrics:', error);
            lyricsLoading.classList.add('hidden');
            lyricsError.classList.remove('hidden');
            
            const errorMsg = lyricsError.querySelector('p.text-gray-400');
            const errorDetail = lyricsError.querySelector('p.text-gray-500');
            
            if (error.message.includes('timeout') || error.message.includes('504')) {
                if (errorMsg) errorMsg.textContent = 'Lyrics service is slow';
                if (errorDetail) errorDetail.textContent = 'The lyrics service is taking too long. Try again later.';
            } else if (error.message.includes('not found') || error.message.includes('404')) {
                if (errorMsg) errorMsg.textContent = 'Lyrics not available';
                if (errorDetail) errorDetail.textContent = 'We couldn\'t find lyrics for this track';
            } else {
                if (errorMsg) errorMsg.textContent = 'Error loading lyrics';
                if (errorDetail) errorDetail.textContent = error.message || 'Please try again later';
            }
        }
    }

    // Display lyrics
    function displayLyrics(lyricsString) {
        lyricsLoading.classList.add('hidden');
        lyricsText.classList.remove('hidden');
        lyricsText.innerHTML = '';

        const lines = lyricsString.split('\n');
        
        lines.forEach(line => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'lyrics-line text-white';
            lineDiv.textContent = line || '\u00A0';
            lyricsText.appendChild(lineDiv);
        });
    }

    // Toggle lyrics panel
    function toggleLyricsPanel() {
        if (!currentTrack) return;

        const isHidden = lyricsPanel.classList.contains('hidden');
        
        if (isHidden) {
            closeQueuePanel(); // Close queue if open
            lyricsPanel.classList.remove('hidden');
            
            lyricsTrackImage.src = currentTrack.image || 'https://placehold.co/80x80/1a1d23/666?text=No+Image';
            lyricsTrackTitle.textContent = currentTrack.title;
            lyricsTrackArtist.textContent = currentTrack.artist;
            
            const { artist, title } = parseTrackInfo(currentTrack.title, currentTrack.artist);
            console.log(`Parsed: "${artist}" - "${title}"`);
            fetchLyrics(artist, title);
            
            if (window.innerWidth >= 768) {
                mainContent.style.marginRight = '400px';
            }
        } else {
            lyricsPanel.classList.add('hidden');
            mainContent.style.marginRight = '0';
        }
    }

    // Close lyrics panel
    function closeLyricsPanel() {
        lyricsPanel.classList.add('hidden');
        mainContent.style.marginRight = '0';
    }

    // Event Listeners
    toggleQueueBtn.addEventListener('click', toggleQueuePanel);
    closeQueueBtn.addEventListener('click', closeQueuePanel);
    clearQueueBtn.addEventListener('click', clearQueue);
    
    toggleLyricsBtn.addEventListener('click', toggleLyricsPanel);
    closeLyricsBtn.addEventListener('click', closeLyricsPanel);

    closePlayerBtn.addEventListener('click', () => {
        player.pause();
        player.src = '';
        playerContainer.classList.add('hidden');
        closeLyricsPanel();
        closeQueuePanel();
        currentTrack = null;
    });

    // Auto-play next track when current ends
    player.addEventListener('ended', () => {
        console.log('Track ended, playing next in queue');
        playNext();
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        const anyPanelOpen = !queuePanel.classList.contains('hidden') || !lyricsPanel.classList.contains('hidden');
        if (window.innerWidth < 768 || !anyPanelOpen) {
            mainContent.style.marginRight = '0';
        } else if (anyPanelOpen) {
            mainContent.style.marginRight = '400px';
        }
    });

    // Search functionality
    const debouncedSearch = debounce(searchMusic, 500);

    searchInput.addEventListener('input', (event) => {
        debouncedSearch(event.target.value);
    });

    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            searchMusic(searchInput.value);
        }
    });

    // Initialize
    loadQueue();
});