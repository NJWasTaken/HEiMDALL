document.addEventListener('DOMContentLoaded', () => {
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

    let currentTrack = null;

    // Set navbar profile image from localStorage
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
        } catch (e) {
            // not JSON – fall through to treat as plain name
        }

        const name = raw;
        if (typeof name === 'string' && name.length > 0) {
            const initial = name.charAt(0).toUpperCase();
            img.src = `https://placehold.co/40x40/e50914/white?text=${initial}`;
        }
    };

    setNavbarProfileImage();

    // Format duration from seconds to MM:SS
    const formatDuration = (seconds) => {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Debounce function to limit API calls
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    };

    // IMPROVED: Extract clean artist and title from YouTube video title
    const parseTrackInfo = (youtubeTitle, channelName) => {
        let artist = channelName || 'Unknown Artist';
        let title = youtubeTitle;

        // Clean up the title first - remove common suffixes
        const cleanTitle = (str) => {
            return str
                .replace(/\(official\s*(video|audio|music\s*video|lyric\s*video)\)/gi, '')
                .replace(/\[official\s*(video|audio|music\s*video|lyric\s*video)\]/gi, '')
                .replace(/official\s*(video|audio|music\s*video|lyric\s*video)/gi, '')
                .replace(/\(lyric(s)?\s*video\)/gi, '')
                .replace(/\[lyric(s)?\s*video\]/gi, '')
                .replace(/lyric(s)?\s*video/gi, '')
                .replace(/\(.*?\d{4}.*?remaster(ed)?\)/gi, '') // Remove (2008 Remastered)
                .replace(/\(.*?remaster(ed)?\)/gi, '')
                .replace(/\[.*?remaster(ed)?\]/gi, '')
                .replace(/\(.*?version\)/gi, '')
                .replace(/\[.*?version\]/gi, '')
                .replace(/\(.*?remix\)/gi, '')
                .replace(/\[.*?remix\]/gi, '')
                .replace(/\(.*?edit\)/gi, '')
                .replace(/\[.*?edit\]/gi, '')
                .replace(/【.*?】/g, '')  // Japanese brackets
                .replace(/〈.*?〉/g, '')   // Japanese angle brackets
                .replace(/\(ft\.?.*?\)/gi, '')  // Remove (ft. Artist)
                .replace(/\[ft\.?.*?\]/gi, '')
                .replace(/feat\.?\s+.*/gi, '')  // Remove "feat. Artist"
                .replace(/\s*-\s*topic$/gi, '')  // Remove "- Topic"
                .replace(/\s+/g, ' ')     // Normalize whitespace
                .trim();
        };

        // Try to split by common delimiters
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
            // No delimiter found - just clean the title and use channel as artist
            title = cleanTitle(youtubeTitle);
        }

        // Clean up artist name
        artist = artist
            .replace(/VEVO$/i, '')
            .replace(/official$/i, '')
            .replace(/\s*-\s*topic$/i, '')
            .replace(/\s+/g, ' ')
            .trim();

        // If artist is still generic or empty, try to use channel name
        if (!artist || artist === 'Unknown Artist' || artist.length === 0) {
            artist = channelName || 'Unknown Artist';
        }

        return { artist, title };
    };

    // --- Function to search for music ---
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
                trackCard.className = 'flex items-center p-4 bg-brand-gray rounded-xl hover:bg-brand-light-gray transition-all duration-200 cursor-pointer group transform hover:scale-[1.02]';
                
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
                    <div class="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-500 group-hover:text-brand-red transition-colors duration-200" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                        </svg>
                    </div>
                `;
                
                trackCard.dataset.source = track.source;
                trackCard.dataset.id = track.id;
                trackCard.dataset.title = track.title;
                trackCard.dataset.artist = track.artist;
                trackCard.dataset.image = track.image;

                trackCard.addEventListener('click', () => {
                    playTrack(track);
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

    // --- Function to play a track ---
    async function playTrack(track) {        
        // Store current track for lyrics
        currentTrack = track;
        
        // Update player UI immediately
        playerTrackImage.src = track.image || 'https://placehold.co/80x80/1a1d23/666?text=No+Image';
        playerTrackTitle.textContent = track.title;
        playerTrackArtist.textContent = track.artist;
        playerContainer.classList.remove('hidden');
        
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

    // IMPROVED: Fetch lyrics with better error handling
    async function fetchLyrics(artist, title) {
        // Show loading state
        lyricsLoading.classList.remove('hidden');
        lyricsText.classList.add('hidden');
        lyricsError.classList.add('hidden');

        console.log(`Fetching lyrics for: "${artist}" - "${title}"`);

        try {
            // Use backend proxy to avoid CORS issues
            const response = await fetch(
                `http://127.0.0.1:8000/api/music/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`,
                { timeout: 15000 } // 15 second timeout on fetch
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
            
            // Update error message based on error type
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

    // Display lyrics in the panel
    function displayLyrics(lyricsString) {
        lyricsLoading.classList.add('hidden');
        lyricsText.classList.remove('hidden');
        lyricsText.innerHTML = '';

        // Split lyrics into lines
        const lines = lyricsString.split('\n');
        
        lines.forEach(line => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'lyrics-line text-white';
            lineDiv.textContent = line || '\u00A0'; // Use non-breaking space for empty lines
            lyricsText.appendChild(lineDiv);
        });
    }

    // Toggle lyrics panel
    function toggleLyricsPanel() {
        if (!currentTrack) return;

        const isHidden = lyricsPanel.classList.contains('hidden');
        
        if (isHidden) {
            // Show panel
            lyricsPanel.classList.remove('hidden');
            
            // Update track info in lyrics panel
            lyricsTrackImage.src = currentTrack.image || 'https://placehold.co/80x80/1a1d23/666?text=No+Image';
            lyricsTrackTitle.textContent = currentTrack.title;
            lyricsTrackArtist.textContent = currentTrack.artist;
            
            // Parse and fetch lyrics with better parsing
            const { artist, title } = parseTrackInfo(currentTrack.title, currentTrack.artist);
            console.log(`Parsed: "${artist}" - "${title}"`);
            fetchLyrics(artist, title);
            
            // On desktop, shrink main content
            if (window.innerWidth >= 768) {
                mainContent.style.marginRight = '400px';
            }
        } else {
            // Hide panel
            lyricsPanel.classList.add('hidden');
            mainContent.style.marginRight = '0';
        }
    }

    // Close lyrics panel
    function closeLyricsPanel() {
        lyricsPanel.classList.add('hidden');
        mainContent.style.marginRight = '0';
    }

    // Event Listeners for Lyrics
    toggleLyricsBtn.addEventListener('click', toggleLyricsPanel);
    closeLyricsBtn.addEventListener('click', closeLyricsPanel);

    // Close player button
    closePlayerBtn.addEventListener('click', () => {
        player.pause();
        player.src = '';
        playerContainer.classList.add('hidden');
        closeLyricsPanel(); // Also close lyrics when player closes
        currentTrack = null;
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth < 768 || lyricsPanel.classList.contains('hidden')) {
            mainContent.style.marginRight = '0';
        } else if (!lyricsPanel.classList.contains('hidden')) {
            mainContent.style.marginRight = '400px';
        }
    });

    // Create debounced search function
    const debouncedSearch = debounce(searchMusic, 500);

    // Search when user types (debounced)
    searchInput.addEventListener('input', (event) => {
        debouncedSearch(event.target.value);
    });

    // Also search when user presses 'Enter'
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            searchMusic(searchInput.value);
        }
    });
});