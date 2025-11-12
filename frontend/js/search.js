document.addEventListener('DOMContentLoaded', () => {
    const typeSelect = document.getElementById('filter-type');
    const genreSelect = document.getElementById('filter-genre');
    const yearSelect = document.getElementById('filter-year');
    const filterButton = document.getElementById('filter-button');
    const resultsGrid = document.getElementById('discover-results-grid');

    // Pagination state
    let currentPage = 1;
    let totalPages = 1;
    let isLoading = false;

    // --- We need this function again (copied from app.js) ---
    // (Ideally, this would be in a shared utils.js file)
    const createMediaCard = (item, mediaType) => {
        if (!item.poster_path) return ''; 
        const posterUrl = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
        // Link to details page instead of direct player
        const detailsUrl = `/details/${mediaType}/${item.id}`; 
        const title = item.title || item.name; 

        return `
            <a href="${detailsUrl}" class="flex-shrink-0 w-poster-w h-poster-h rounded-lg shadow-lg transform hover:scale-105 hover:z-10 transition-transform duration-300 cursor-pointer">
                <img src="${posterUrl}" alt="${title}" class="w-full h-full object-cover rounded-lg">
            </a>
        `;
    };

    // --- Populate Year Filter ---
    const populateYears = () => {
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= 1900; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
    };

    // --- Populate Genre Filter ---
    const populateGenres = async () => {
        const mediaType = typeSelect.value;
        try {
            const response = await fetch(`/api/genres/${mediaType}`);
            if (!response.ok) throw new Error('Failed to fetch genres');
            
            const genres = await response.json();
            
            // Clear existing options (except "All Genres")
            genreSelect.innerHTML = '<option value="">All Genres</option>'; 
            
            genres.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre.id;
                option.textContent = genre.name;
                genreSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating genres:', error);
        }
    };

    // --- Perform the Discover Search ---
    const performDiscoverSearch = async (append = false) => {
        if (isLoading) return;
        isLoading = true;

        const type = typeSelect.value;
        const genre = genreSelect.value;
        const year = yearSelect.value;

        // Build the query string
        const params = new URLSearchParams({
            type: type,
            sort: 'popularity.desc',
            page: currentPage.toString()
        });
        if (genre) params.append('genre', genre);
        if (year) params.append('year', year);

        // Show loading indicator
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.innerHTML = '<div class="spinner mx-auto"></div>';
        }

        if (!append) {
            resultsGrid.innerHTML = '<p class="col-span-full text-center">Loading...</p>';
        }

        try {
            const response = await fetch(`/api/discover?${params.toString()}`);
            if (!response.ok) throw new Error('Search failed');

            const data = await response.json();
            const results = data.results || [];
            
            totalPages = data.total_pages || 1;

            if (!append) {
                resultsGrid.innerHTML = ''; // Clear loading message
            }

            if (results.length === 0 && !append) {
                resultsGrid.innerHTML = '<p class="col-span-full text-center">No results found for these filters.</p>';
                hideLoadMoreButton();
                return;
            }

            results.forEach(item => {
                resultsGrid.innerHTML += createMediaCard(item, type);
            });

            // Show or hide the Load More button
            updateLoadMoreButton();

        } catch (error) {
            console.error('Error performing discover search:', error);
            if (!append) {
                resultsGrid.innerHTML = '<p class="col-span-full text-center">Error loading results.</p>';
            }
            hideLoadMoreButton();
        } finally {
            isLoading = false;
        }
    };

    // --- Update Load More Button Visibility ---
    const updateLoadMoreButton = () => {
        let loadMoreBtn = document.getElementById('load-more-btn');
        
        if (!loadMoreBtn) {
            // Create the button if it doesn't exist
            const container = resultsGrid.parentElement;
            const btnWrapper = document.createElement('div');
            btnWrapper.className = 'flex justify-center mt-8 mb-8';
            btnWrapper.innerHTML = `
                <button id="load-more-btn" class="px-8 py-3 bg-brand-red text-white text-lg font-bold rounded-lg shadow-lg hover:bg-f40612 transition duration-300 transform hover:scale-105">
                    Load More
                </button>
            `;
            container.appendChild(btnWrapper);
            loadMoreBtn = document.getElementById('load-more-btn');
            
            // Add event listener
            loadMoreBtn.addEventListener('click', () => {
                currentPage++;
                performDiscoverSearch(true);
            });
        }

        // Show/hide based on pagination
        if (currentPage >= totalPages) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
            loadMoreBtn.disabled = false;
            loadMoreBtn.textContent = 'Load More';
        }
    };

    const hideLoadMoreButton = () => {
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }
    };

    // --- Event Listeners ---
    typeSelect.addEventListener('change', populateGenres); // Update genres when type changes
    filterButton.addEventListener('click', () => {
        currentPage = 1; // Reset to page 1 on new search
        performDiscoverSearch(false);
    });

    // --- Initial Page Load ---
    populateYears();
    populateGenres(); // Populate genres for the default type (movies)
    performDiscoverSearch(false); // Perform an initial search on page load
});