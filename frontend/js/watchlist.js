// Watchlist functionality
document.addEventListener('DOMContentLoaded', () => {
    const watchlistGrid = document.getElementById('watchlist-grid');
    const emptyState = document.getElementById('empty-state');

    // Get current profile from localStorage
    function getCurrentProfile() {
        const profileData = localStorage.getItem('vstream-current-profile');
        if (profileData) {
            try {
                const profile = JSON.parse(profileData);
                return profile.name || 'default';
            } catch (e) {
                return profileData || 'default';
            }
        }
        return 'default';
    }

    // Create a media card for watchlist items
    function createWatchlistCard(item) {
        const mediaType = item.media_type || item.type;
        const posterUrl = item.poster_path 
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : 'https://placehold.co/200x300/1a1d23/e50914?text=No+Poster';
        const detailsUrl = `/details/${mediaType}/${item.id}`;
        const title = item.title || item.name;

        return `
            <div class="relative group">
                <a href="${detailsUrl}" class="block">
                    <div class="w-full h-poster-h rounded-lg overflow-hidden shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                        <img src="${posterUrl}" alt="${title}" class="w-full h-full object-cover">
                    </div>
                    <h3 class="mt-2 text-sm font-semibold line-clamp-2 group-hover:text-brand-red transition-colors">${title}</h3>
                </a>
                <button 
                    onclick="removeFromWatchlist(${item.id}, event)" 
                    class="absolute top-2 right-2 bg-brand-red text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-700"
                    title="Remove from watchlist">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        `;
    }

    // Load watchlist from backend
    async function loadWatchlist() {
        const profile = getCurrentProfile();
        
        try {
            const response = await fetch(`/api/watchlist?profile=${encodeURIComponent(profile)}`);
            
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login.html';
                    return;
                }
                throw new Error('Failed to load watchlist');
            }

            const items = await response.json();
            
            if (items.length === 0) {
                watchlistGrid.classList.add('hidden');
                emptyState.classList.remove('hidden');
            } else {
                watchlistGrid.classList.remove('hidden');
                emptyState.classList.add('hidden');
                watchlistGrid.innerHTML = items.map(item => createWatchlistCard(item)).join('');
            }

        } catch (error) {
            console.error('Error loading watchlist:', error);
            watchlistGrid.innerHTML = '<p class="col-span-full text-center text-gray-400">Error loading watchlist.</p>';
        }
    }

    // Remove item from watchlist (global function)
    window.removeFromWatchlist = async function(itemId, event) {
        event.preventDefault();
        event.stopPropagation();
        
        const profile = getCurrentProfile();
        
        try {
            const response = await fetch(`/api/watchlist/${itemId}?profile=${encodeURIComponent(profile)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Reload watchlist
                loadWatchlist();
            } else {
                console.error('Failed to remove from watchlist');
            }

        } catch (error) {
            console.error('Error removing from watchlist:', error);
        }
    };

    // Load watchlist on page load
    loadWatchlist();
});
