// TikTok-style scroll navigation fix for MovieShows
// This fixes the broken scroll functionality in the React app
(function () {
  "use strict";

  let initialized = false;
  let scrollContainer = null;
  let videoSlides = [];
  let currentIndex = 0;
  let isScrolling = false;
  let scrollTimeout = null;
  const SCROLL_COOLDOWN = 400;

  // Find the main scroll container with snap-y
  function findScrollContainer() {
    // The container has: overflow-y-scroll snap-y snap-proximity
    const containers = document.querySelectorAll(
      '[class*="overflow-y-scroll"]',
    );
    for (const container of containers) {
      if (container.className.includes("snap-y")) {
        return container;
      }
    }
    // Fallback: look for the container with snap-center children
    const snapCenterEl = document.querySelector('[class*="snap-center"]');
    if (snapCenterEl && snapCenterEl.parentElement) {
      return snapCenterEl.parentElement;
    }
    return null;
  }

  // Find all video slides (snap-center elements)
  function findVideoSlides() {
    if (!scrollContainer) return [];
    return Array.from(
      scrollContainer.querySelectorAll('[class*="snap-center"]'),
    );
  }

  // Get the currently visible slide based on scroll position
  function getCurrentVisibleIndex() {
    if (!scrollContainer || videoSlides.length === 0) return 0;

    const containerRect = scrollContainer.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    let closestIndex = 0;
    let closestDistance = Infinity;

    videoSlides.forEach((slide, index) => {
      const rect = slide.getBoundingClientRect();
      const slideCenter = rect.top + rect.height / 2;
      const distance = Math.abs(slideCenter - containerCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }

  // Scroll to a specific slide
  function scrollToSlide(index) {
    if (index < 0 || index >= videoSlides.length) return;

    const slide = videoSlides[index];
    if (slide) {
      slide.scrollIntoView({ behavior: "smooth", block: "center" });
      currentIndex = index;
      console.log(
        "[MovieShows] Scrolled to video",
        index + 1,
        "of",
        videoSlides.length,
      );
    }
  }

  // Handle scroll events on the container
  function handleScroll() {
    if (isScrolling) return;

    const newIndex = getCurrentVisibleIndex();
    if (newIndex !== currentIndex) {
      currentIndex = newIndex;
      // The scroll-snap already handles the visual snap
      // We just track the current index
    }
  }

  // Handle wheel events for controlled scrolling
  function handleWheel(e) {
    // Only handle if we're on the main container area
    const target = e.target;

    // Don't intercept scrolling in nested scrollable areas
    if (
      target.closest('.overflow-y-auto:not([class*="snap-y"])') ||
      target.closest('[class*="custom-scrollbar"]') ||
      target.closest("select")
    ) {
      return;
    }

    // Check if we're in the scroll container or its children
    if (!scrollContainer?.contains(target) && target !== scrollContainer) {
      // If not in scroll container, check if scrolling should go to it
      const containerRect = scrollContainer?.getBoundingClientRect();
      if (!containerRect) return;
    }

    if (isScrolling) {
      e.preventDefault();
      return;
    }

    // Determine scroll direction
    if (Math.abs(e.deltaY) < 10) return;

    const direction = e.deltaY > 0 ? 1 : -1;
    const newIndex = Math.max(
      0,
      Math.min(videoSlides.length - 1, currentIndex + direction),
    );

    if (newIndex !== currentIndex) {
      e.preventDefault();
      isScrolling = true;
      scrollToSlide(newIndex);

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, SCROLL_COOLDOWN);
    }
  }

  // Handle keyboard navigation
  function handleKeydown(e) {
    // Skip if typing in input
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.tagName === "SELECT"
    ) {
      return;
    }

    if (isScrolling) return;

    let direction = 0;
    switch (e.key) {
      case "ArrowDown":
      case "j":
      case "J":
      case "ArrowRight":
        direction = 1;
        break;
      case "ArrowUp":
      case "k":
      case "K":
      case "ArrowLeft":
        direction = -1;
        break;
      case "Home":
        if (videoSlides.length > 0) {
          e.preventDefault();
          scrollToSlide(0);
        }
        return;
      case "End":
        if (videoSlides.length > 0) {
          e.preventDefault();
          scrollToSlide(videoSlides.length - 1);
        }
        return;
    }

    if (direction === 0) return;

    const newIndex = Math.max(
      0,
      Math.min(videoSlides.length - 1, currentIndex + direction),
    );

    if (newIndex !== currentIndex) {
      e.preventDefault();
      isScrolling = true;
      scrollToSlide(newIndex);

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, SCROLL_COOLDOWN);
    }
  }

  // Touch handling
  let touchStartY = 0;
  let touchStartX = 0;
  let touchStartTime = 0;

  function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    touchStartTime = Date.now();
  }

  function handleTouchEnd(e) {
    if (isScrolling) return;

    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaY = touchStartY - touchEndY;
    const deltaX = touchStartX - touchEndX;
    const duration = Date.now() - touchStartTime;

    // Quick swipe detection
    const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX);
    const delta = isVerticalSwipe ? deltaY : deltaX;

    if (duration < 300 && Math.abs(delta) > 80) {
      const direction = delta > 0 ? 1 : -1;
      const newIndex = Math.max(
        0,
        Math.min(videoSlides.length - 1, currentIndex + direction),
      );

      if (newIndex !== currentIndex) {
        isScrolling = true;
        scrollToSlide(newIndex);

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          isScrolling = false;
        }, SCROLL_COOLDOWN);
      }
    }
  }

  // Use IntersectionObserver to track which video is visible
  function setupIntersectionObserver() {
    if (!scrollContainer || videoSlides.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const index = videoSlides.indexOf(entry.target);
            if (index !== -1 && index !== currentIndex) {
              currentIndex = index;
              console.log("[MovieShows] Video", index + 1, "now in view");
            }
          }
        });
      },
      {
        root: scrollContainer,
        threshold: 0.5,
      },
    );

    videoSlides.forEach((slide) => observer.observe(slide));

    return observer;
  }

  // Initialize everything
  function init() {
    if (initialized) return;

    console.log("[MovieShows] Looking for scroll container...");

    scrollContainer = findScrollContainer();
    if (!scrollContainer) {
      console.log("[MovieShows] Scroll container not found, retrying...");
      setTimeout(init, 1000);
      return;
    }

    videoSlides = findVideoSlides();
    if (videoSlides.length === 0) {
      console.log("[MovieShows] No video slides found, retrying...");
      setTimeout(init, 1000);
      return;
    }

    console.log("[MovieShows] Found", videoSlides.length, "videos");

    // Set up intersection observer
    setupIntersectionObserver();

    // Add event listeners
    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    // Track scroll on the container
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    // Get initial position
    currentIndex = getCurrentVisibleIndex();

    // Auto-scroll to first video if at top
    if (currentIndex === 0 && videoSlides.length > 0) {
      setTimeout(() => {
        const firstSlide = videoSlides[0];
        if (firstSlide) {
          // Make sure first video is fully in view
          firstSlide.scrollIntoView({ behavior: "auto", block: "center" });
        }
      }, 500);
    }

    initialized = true;
    console.log("[MovieShows] Scroll navigation ready!");
    console.log(
      "[MovieShows] Use: Mouse wheel, Arrow keys, J/K, Home/End, or swipe",
    );
  }

  // Watch for DOM changes (React updates)
  function setupMutationObserver() {
    const observer = new MutationObserver(() => {
      if (!initialized) {
        init();
      } else {
        // Update slides list if DOM changed
        const newSlides = findVideoSlides();
        if (newSlides.length !== videoSlides.length) {
          videoSlides = newSlides;
          setupIntersectionObserver();
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Start
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setupMutationObserver();
      setTimeout(init, 1500);
    });
  } else {
    setupMutationObserver();
    setTimeout(init, 1500);
  }
})();
