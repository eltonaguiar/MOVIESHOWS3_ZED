// TikTok-style scroll navigation for MovieShows
(function() {
  'use strict';
  
  let isScrolling = false;
  let scrollTimeout;
  const SCROLL_COOLDOWN = 800; // ms between scrolls
  
  // Wait for app to load
  function waitForVideos() {
    return new Promise(resolve => {
      const check = () => {
        const videos = document.querySelectorAll('[class*="aspect-"][class*="video"], [class*="relative"][class*="w-full"][class*="h-full"], .video-container, [data-video], iframe[src*="youtube"]');
        const clickableItems = document.querySelectorAll('[class*="cursor-pointer"][class*="relative"]');
        if (videos.length > 0 || clickableItems.length > 0) {
          resolve();
        } else {
          setTimeout(check, 500);
        }
      };
      check();
    });
  }
  
  function findVideoItems() {
    // Look for the video thumbnails/cards in the sidebar or list
    let items = document.querySelectorAll('[class*="cursor-pointer"][class*="relative"][class*="overflow"]');
    if (items.length === 0) {
      items = document.querySelectorAll('[class*="aspect-"][class*="rounded"]');
    }
    if (items.length === 0) {
      items = document.querySelectorAll('[class*="group"][class*="cursor-pointer"]');
    }
    return Array.from(items);
  }
  
  function getCurrentIndex(items) {
    // Find the currently active/selected item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const classes = item.className || '';
      if (classes.includes('ring-') || classes.includes('border-cyan') || classes.includes('scale-') || 
          classes.includes('selected') || classes.includes('active') || classes.includes('border-2')) {
        return i;
      }
    }
    return 0;
  }
  
  function selectVideo(items, index) {
    if (index < 0 || index >= items.length) return;
    
    const item = items[index];
    if (item) {
      // Scroll the item into view
      item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Click the item to select it
      item.click();
    }
  }
  
  function handleWheel(e) {
    if (isScrolling) return;
    
    // Only trigger on significant scroll
    if (Math.abs(e.deltaY) < 30) return;
    
    const items = findVideoItems();
    if (items.length === 0) return;
    
    const currentIndex = getCurrentIndex(items);
    const direction = e.deltaY > 0 ? 1 : -1;
    const newIndex = Math.max(0, Math.min(items.length - 1, currentIndex + direction));
    
    if (newIndex !== currentIndex) {
      e.preventDefault();
      isScrolling = true;
      selectVideo(items, newIndex);
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, SCROLL_COOLDOWN);
    }
  }
  
  function handleKeydown(e) {
    if (isScrolling) return;
    
    // Skip if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    let direction = 0;
    if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
      direction = 1;
    } else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
      direction = -1;
    }
    
    if (direction === 0) return;
    
    const items = findVideoItems();
    if (items.length === 0) return;
    
    const currentIndex = getCurrentIndex(items);
    const newIndex = Math.max(0, Math.min(items.length - 1, currentIndex + direction));
    
    if (newIndex !== currentIndex) {
      e.preventDefault();
      isScrolling = true;
      selectVideo(items, newIndex);
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, SCROLL_COOLDOWN);
    }
  }
  
  // Touch swipe support
  let touchStartY = 0;
  let touchStartTime = 0;
  
  function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }
  
  function handleTouchEnd(e) {
    if (isScrolling) return;
    
    const touchEndY = e.changedTouches[0].clientY;
    const touchDuration = Date.now() - touchStartTime;
    const deltaY = touchStartY - touchEndY;
    
    // Quick swipe detection
    if (touchDuration < 500 && Math.abs(deltaY) > 50) {
      const items = findVideoItems();
      if (items.length === 0) return;
      
      const currentIndex = getCurrentIndex(items);
      const direction = deltaY > 0 ? 1 : -1;
      const newIndex = Math.max(0, Math.min(items.length - 1, currentIndex + direction));
      
      if (newIndex !== currentIndex) {
        isScrolling = true;
        selectVideo(items, newIndex);
        
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          isScrolling = false;
        }, SCROLL_COOLDOWN);
      }
    }
  }
  
  async function init() {
    await waitForVideos();
    console.log('[MovieShows Scroll] Initializing scroll navigation...');
    
    // Add wheel listener
    document.addEventListener('wheel', handleWheel, { passive: false });
    
    // Add keyboard listener
    document.addEventListener('keydown', handleKeydown);
    
    // Add touch listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    console.log('[MovieShows Scroll] Scroll navigation enabled! Use mouse wheel, arrow keys (up/down), J/K keys, or swipe to navigate.');
  }
  
  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
