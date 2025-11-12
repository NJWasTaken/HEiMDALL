document.addEventListener('DOMContentLoaded', () => {
    
    // --- Existing Mobile Menu Logic ---
    const menuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (menuButton && mobileMenu) {
        menuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Prevents API calls on every keystroke
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    };

    // Set navbar profile image from localStorage (vstream-current-profile)
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
            // not JSON — fall through to treat as plain name
        }

        // fallback: if stored value is just a name string
        const name = raw;
        if (typeof name === 'string' && name.length > 0) {
            const initial = name.charAt(0).toUpperCase();
            img.src = `https://placehold.co/40x40/e50914/white?text=${initial}`;
        }
    };

    setNavbarProfileImage();

    // --- UPDATED: Function to build a movie/tv card ---
    // We now accept 'mediaType' to build the correct link
    const createMediaCard = (item, mediaType) => {
        if (!item.poster_path) return ''; 
        const posterUrl = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
        const detailsUrl = `/details/${mediaType}/${item.id}`;
        const title = item.title || item.name; 

        return `
            <a href="${detailsUrl}" class="flex-shrink-0 w-poster-w h-poster-h rounded-lg shadow-lg transform hover:scale-105 hover:z-10 transition-transform duration-300 cursor-pointer">
                <img src="${posterUrl}" alt="${title}" class="w-full h-full object-cover rounded-lg">
            </a>
        `;
    };

    const createSearchDropdownItem = (item) => {
        const mediaType = item.media_type;
        if (!mediaType || !item.poster_path) return '';

        // Use a smaller poster size (w92 is perfect for lists)
        const posterUrl = `https://image.tmdb.org/t/p/w92${item.poster_path}`;
        const detailsUrl = `/details/${mediaType}/${item.id}`;
        const title = item.title || item.name;
        
        const releaseDate = item.release_date || item.first_air_date;
        const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
        
        // Tailwind classes + the custom class from main.css for the img
        return `
            <a href="${detailsUrl}" 
               class="flex items-center p-2 bg-brand-gray rounded-lg hover:bg-brand-light-gray transition-colors duration-200">
                
                <img class="search-dropdown-item" src="${posterUrl}" alt="${title}"> 
                
                <div class="ml-4">
                    <p class="text-lg font-bold text-white line-clamp-1">${title}</p>
                    <p class="text-sm text-gray-400">${year} &bull; ${mediaType === 'tv' ? 'TV Show' : 'Movie'}</p>
                </div>
            </a>
        `;
    };

    // --- UPDATED: Function to fetch data and build a carousel ---
    // We now pass 'mediaType' to the card builder
    const fetchAndBuildCarousel = async (apiEndpoint, containerId, mediaType) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '<div class="w-full flex justify-center items-center py-12"><div class="spinner"></div></div>';

        try {
            const response = await fetch(apiEndpoint);
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login.html';
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const items = await response.json();

            container.innerHTML = '';
            
            // Populate carousel
            if (Array.isArray(items) && items.length > 0) {
                items.forEach(item => {
                    container.innerHTML += createMediaCard(item, mediaType);
                });
            } else {
                container.innerHTML = '<p class="text-gray-400">No titles found.</p>';
            }
            
            // Return first item for the hero section
            return Array.isArray(items) && items.length > 0 ? items[0] : null; 

        } catch (error) {
            console.error(`Error fetching ${apiEndpoint}:`, error);
            container.innerHTML = '<p class="text-gray-400">Could not load titles.</p>';
        }
    };

    // --- UPDATED: Function to update the Hero section ---
    // Now also accepts mediaType
    const updateHero = (item, mediaType) => {
        if (!item || !item.backdrop_path) return;

        const bgImage = document.getElementById('hero-bg-image');
        const titleEl = document.getElementById('hero-title');
        const description = document.getElementById('hero-description');
        const playLink = document.getElementById('hero-play-link');
        const infoLink = document.getElementById('hero-info-link');

        const backdropUrl = `https://image.tmdb.org/t/p/original${item.backdrop_path}`;
        const title = item.title || item.name; // Use title or name

        bgImage.src = backdropUrl;
        titleEl.textContent = title;
        description.textContent = item.overview;
        
        // Redirect to Vidrock directly
        if (mediaType === 'movie') {
            playLink.href = `https://vidrock.net/movie/${item.id}`;
        } else {
            // For TV shows, default to S1E1
            playLink.href = `https://vidrock.net/tv/${item.id}/1/1`;
        }
        playLink.target = '_blank'; // Open in new tab
        
        infoLink.href = `/details/${mediaType}/${item.id}`;
    };

    // --- UPDATED: Load all content when the page is ready ---
    const loadBrowseContent = async () => {
        // Fetch trending movies and use the first one for the hero
        const firstTrendingMovie = await fetchAndBuildCarousel(
            '/api/movies/trending', 
            'carousel-trending-movies', // Updated ID
            'movie' // mediaType
        );
        
        if (firstTrendingMovie) {
            updateHero(firstTrendingMovie, 'movie'); // Pass mediaType
        }

        // Fetch other movie carousels
        fetchAndBuildCarousel('/api/movies/top-rated', 'carousel-top-rated-movies', 'movie');
        fetchAndBuildCarousel('/api/movies/popular', 'carousel-popular-movies', 'movie');

        // --- NEW: Fetch TV carousels ---
        fetchAndBuildCarousel('/api/tv/trending', 'carousel-trending-tv', 'tv');
        fetchAndBuildCarousel('/api/tv/top-rated', 'carousel-top-rated-tv', 'tv');
        fetchAndBuildCarousel('/api/tv/popular', 'carousel-popular-tv', 'tv');
    };

    // Run the function to load all content (only on index page)
    if (document.getElementById('carousel-trending-movies')) {
        loadBrowseContent();
    }

    // --- MODIFIED: Search Feature Logic ---
    const searchOpenBtn = document.getElementById('search-open-button');
    const searchCloseBtn = document.getElementById('search-close-button');
    const searchOverlay = document.getElementById('search-overlay');
    const searchInput = document.getElementById('search-input');
    const searchResultsList = document.getElementById('search-results-list'); 
    const searchResultsHeading = document.getElementById('search-results-heading'); // May not exist on all pages

    // Function to perform the actual search
    const performSearch = async (query) => {
        // Clear list and hide heading if query is too short
        if (query.length < 2) {
            if (searchResultsList) searchResultsList.innerHTML = '';
            if (searchResultsHeading) searchResultsHeading.classList.add('hidden');
            return;
        }

        try {
            // Call our new backend search API
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                if (response.status === 401) window.location.href = '/login.html';
                throw new Error('Search failed');
            }
            const results = await response.json();
            
            if (searchResultsList) {
                searchResultsList.innerHTML = ''; // Clear previous results
                if (Array.isArray(results) && results.length > 0) {
                    if (searchResultsHeading) searchResultsHeading.classList.remove('hidden');
                    results.forEach(item => {
                        // MODIFIED: Use the new dropdown item function
                        searchResultsList.innerHTML += createSearchDropdownItem(item); 
                    });
                } else {
                    if (searchResultsHeading) searchResultsHeading.classList.remove('hidden');
                    searchResultsList.innerHTML = '<p class="text-gray-400 col-span-full text-center">No results found.</p>'; // MODIFIED
                }
            }

        } catch (error) {
            console.error('Error performing search:', error);
            if (searchResultsHeading) searchResultsHeading.classList.remove('hidden');
            if (searchResultsList) searchResultsList.innerHTML = '<p class="text-gray-400 col-span-full text-center">Error loading results.</p>'; // MODIFIED
        }
    };

    // Create a debounced version of the search function
    const debouncedSearch = debounce(performSearch, 300); // 300ms delay

    // Event Listeners for Search
    if (searchOpenBtn && searchOverlay) {
        searchOpenBtn.addEventListener('click', () => {
            searchOverlay.classList.remove('hidden');
            searchInput.focus(); // Automatically focus the input field
        });
    }

    if (searchCloseBtn && searchOverlay) {
        searchCloseBtn.addEventListener('click', () => {
            searchOverlay.classList.add('hidden');
            if (searchInput) searchInput.value = ''; // Clear input on close
            if (searchResultsList) searchResultsList.innerHTML = ''; // Clear results on close
            if (searchResultsHeading) searchResultsHeading.classList.add('hidden');
        });
    }

    if (searchInput) {
        // Listen for the 'input' event and call the debounced search
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }

    // Close search overlay with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchOverlay && !searchOverlay.classList.contains('hidden')) {
            searchOverlay.classList.add('hidden');
            if (searchInput) searchInput.value = '';
            if (searchResultsList) searchResultsList.innerHTML = '';
            if (searchResultsHeading) searchResultsHeading.classList.add('hidden');
        }
    });
});