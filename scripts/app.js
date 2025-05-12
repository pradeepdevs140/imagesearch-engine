// API Configuration
const API_KEY = 'IEFsqec85PXnvEPR5MdzT9fonXdgj3gjPFyJ7fPns2sFNDC6GOirMdIw'; // Replace with your actual Pexels API key
const BASE_URL = 'https://api.pexels.com/v1/';
let currentPage = 1;
let currentQuery = '';
let currentOrientation = '';
let currentSize = '';
let currentColor = '';
let totalResults = 0;
let currentImages = [];
let lightboxIndex = 0;

// DOM Elements
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchSuggestions = document.getElementById('search-suggestions');
const imageGrid = document.getElementById('image-grid');
const resultsInfo = document.getElementById('results-info');
const pagination = document.getElementById('pagination');
const loadingSpinner = document.getElementById('loading-spinner');
const orientationFilter = document.getElementById('orientation-filter');
const sizeFilter = document.getElementById('size-filter');
const colorFilter = document.getElementById('color-filter');
const applyFiltersBtn = document.getElementById('apply-filters');
const themeToggle = document.getElementById('theme-toggle');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Load default images
    fetchPopularImages();
    
    // Event listeners
    searchForm.addEventListener('submit', handleSearch);
    searchInput.addEventListener('input', handleInput);
    applyFiltersBtn.addEventListener('click', applyFilters);
    themeToggle.addEventListener('click', toggleTheme);
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
});

// Fetch popular images for the homepage
async function fetchPopularImages() {
    showLoading();
    try {
        const response = await fetch(`${BASE_URL}curated?per_page=30&page=1`, {
            headers: {
                Authorization: API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch images');
        }
        
        const data = await response.json();
        totalResults = data.total_results;
        currentImages = data.photos;
        displayImages(data.photos);
        updateResultsInfo(totalResults, 1);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Handle search form submission
function handleSearch(e) {
    e.preventDefault();
    const query = searchInput.value.trim();
    
    if (query) {
        currentQuery = query;
        currentPage = 1;
        searchImages(query);
        searchSuggestions.classList.remove('show');
    }
}

// Search images using the API
async function searchImages(query, page = 1) {
    showLoading();
    
    let url = `${BASE_URL}search?query=${encodeURIComponent(query)}&per_page=30&page=${page}`;
    
    // Add filters if they exist
    if (currentOrientation) url += `&orientation=${currentOrientation}`;
    if (currentSize) url += `&size=${currentSize}`;
    if (currentColor) url += `&color=${currentColor}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                Authorization: API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to search images');
        }
        
        const data = await response.json();
        totalResults = data.total_results;
        currentImages = data.photos;
        displayImages(data.photos);
        updateResultsInfo(totalResults, page);
        updatePagination();
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Display images in the grid
function displayImages(images) {
    if (!images || images.length === 0) {
        imageGrid.innerHTML = '<div class="no-results"><p>No images found. Try a different search term.</p></div>';
        return;
    }
    
    imageGrid.innerHTML = '';
    
    images.forEach((image, index) => {
        const imageCard = document.createElement('div');
        imageCard.className = 'image-card';
        imageCard.innerHTML = `
            <img src="${image.src.medium}" alt="${image.alt || 'Image from Pexels'}" data-src="${image.src.large}" data-index="${index}">
            <div class="image-overlay">
                <p class="photographer"><i class="fas fa-user"></i> ${image.photographer}</p>
            </div>
        `;
        
        // Add click event to open lightbox
        imageCard.querySelector('img').addEventListener('click', () => openLightbox(index));
        
        imageGrid.appendChild(imageCard);
    });
    
    // Initialize lazy loading
    initLazyLoading();
}

// Initialize lazy loading for images
function initLazyLoading() {
    const lazyImages = document.querySelectorAll('.image-card img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    }, { rootMargin: '200px' });
    
    lazyImages.forEach(img => imageObserver.observe(img));
}

// Update results information
function updateResultsInfo(total, currentPage) {
    const start = (currentPage - 1) * 30 + 1;
    const end = Math.min(currentPage * 30, total);
    
    resultsInfo.innerHTML = `
        Showing ${start}-${end} of ${total.toLocaleString()} results
        ${currentQuery ? `for <strong>"${currentQuery}"</strong>` : ''}
    `;
}

// Update pagination controls
function updatePagination() {
    if (totalResults <= 30) {
        pagination.innerHTML = '';
        return;
    }
    
    const totalPages = Math.ceil(totalResults / 30);
    const maxVisiblePages = 5;
    let startPage, endPage;
    
    if (totalPages <= maxVisiblePages) {
        startPage = 1;
        endPage = totalPages;
    } else {
        const maxPagesBeforeCurrent = Math.floor(maxVisiblePages / 2);
        const maxPagesAfterCurrent = Math.ceil(maxVisiblePages / 2) - 1;
        
        if (currentPage <= maxPagesBeforeCurrent) {
            startPage = 1;
            endPage = maxVisiblePages;
        } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
            startPage = totalPages - maxVisiblePages + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - maxPagesBeforeCurrent;
            endPage = currentPage + maxPagesAfterCurrent;
        }
    }
    
    const paginationHTML = [];
    
    // Previous button
    paginationHTML.push(`
        <button id="prev-page" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `);
    
    // First page and ellipsis if needed
    if (startPage > 1) {
        paginationHTML.push(`<button data-page="1">1</button>`);
        if (startPage > 2) {
            paginationHTML.push('<span>...</span>');
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML.push(`
            <button data-page="${i}" ${i === currentPage ? 'class="active"' : ''}>
                ${i}
            </button>
        `);
    }
    
    // Last page and ellipsis if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML.push('<span>...</span>');
        }
        paginationHTML.push(`<button data-page="${totalPages}">${totalPages}</button>`);
    }
    
    // Next button
    paginationHTML.push(`
        <button id="next-page" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `);
    
    pagination.innerHTML = paginationHTML.join('');
    
    // Add event listeners to pagination buttons
    document.querySelectorAll('[data-page]').forEach(button => {
        button.addEventListener('click', () => {
            const page = parseInt(button.dataset.page);
            currentPage = page;
            if (currentQuery) {
                searchImages(currentQuery, page);
            } else {
                fetchPopularImages(page);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
    
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            if (currentQuery) {
                searchImages(currentQuery, currentPage);
            } else {
                fetchPopularImages(currentPage);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    document.getElementById('next-page').addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            if (currentQuery) {
                searchImages(currentQuery, currentPage);
            } else {
                fetchPopularImages(currentPage);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

// Handle search input for suggestions
function handleInput() {
    const query = searchInput.value.trim();
    
    if (query.length > 2) {
        // In a real app, you would fetch suggestions from an API
        // For this example, we'll use a simple mock
        const mockSuggestions = [
            `${query} nature`,
            `${query} landscape`,
            `${query} portrait`,
            `${query} wallpaper`,
            `${query} background`
        ];
        
        showSuggestions(mockSuggestions);
    } else {
        searchSuggestions.classList.remove('show');
    }
}

// Show search suggestions
function showSuggestions(suggestions) {
    searchSuggestions.innerHTML = '';
    
    suggestions.forEach(suggestion => {
        const div = document.createElement('div');
        div.textContent = suggestion;
        div.addEventListener('click', () => {
            searchInput.value = suggestion;
            searchSuggestions.classList.remove('show');
            searchForm.dispatchEvent(new Event('submit'));
        });
        searchSuggestions.appendChild(div);
    });
    
    searchSuggestions.classList.add('show');
}

// Apply filters
function applyFilters() {
    currentOrientation = orientationFilter.value;
    currentSize = sizeFilter.value;
    currentColor = colorFilter.value;
    
    if (currentQuery) {
        currentPage = 1;
        searchImages(currentQuery);
    } else {
        currentPage = 1;
        fetchPopularImages();
    }
}

// Open lightbox with the selected image
function openLightbox(index) {
    lightboxIndex = index;
    const image = currentImages[index];
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const photographer = document.getElementById('image-photographer');
    const resolution = document.getElementById('image-resolution');
    const downloadLink = document.getElementById('download-link');
    const originalLink = document.getElementById('original-link');
    
    lightboxImage.src = image.src.large2x || image.src.large;
    lightboxImage.alt = image.alt || 'Image from Pexels';
    photographer.textContent = `Photo by ${image.photographer}`;
    resolution.textContent = `${image.width} × ${image.height}`;
    downloadLink.href = image.src.original;
    originalLink.href = image.url;
    
    lightbox.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Close lightbox
function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('show');
    document.body.style.overflow = '';
}

// Navigate between images in lightbox
function navigateLightbox(direction) {
    if (direction === 'prev' && lightboxIndex > 0) {
        lightboxIndex--;
    } else if (direction === 'next' && lightboxIndex < currentImages.length - 1) {
        lightboxIndex++;
    } else {
        return;
    }
    
    openLightbox(lightboxIndex);
}

// Show loading spinner
function showLoading() {
    loadingSpinner.classList.add('show');
}

// Hide loading spinner
function hideLoading() {
    loadingSpinner.classList.remove('show');
}

// Show error message
function showError(message) {
    imageGrid.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
        </div>
    `;
}

// Toggle dark/light theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

// Update theme toggle icon
function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}