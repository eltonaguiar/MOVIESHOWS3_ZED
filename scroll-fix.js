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
  const SCROLL_COOLDOWN = 500;

  // Find the main scroll container with snap-y
  function findScrollContainer() {
    const containers = document.querySelectorAll(
      '[class*="overflow-y-scroll"]',
    );
    for (const container of containers) {
      if (container.className.includes("snap-y")) {
        return container;
      }
    }
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

  // Find and click the Play button in the Queue panel (right side)
  function clickQueuePlayButton() {
    console.log("[MovieShows] Looking for Queue play button...");

    // Find the green "Play Queue" button
    const allButtons = document.querySelectorAll("button");
    for (const btn of allButtons) {
      if (btn.textContent?.includes("Play Queue")) {
        console.log("[MovieShows] Found Play Queue button, clicking...");
        btn.click();
        return true;
      }
    }

    // Alternative: look for green button with play icon
    const greenPlayBtn = document.querySelector('button[class*="bg-green"]');
    if (greenPlayBtn) {
      console.log("[MovieShows] Found green Play button, clicking...");
      greenPlayBtn.click();
      return true;
    }

    return false;
  }

  // Get the currently visible slide based on scroll position
  // This mirrors how the React app calculates the index
  function getCurrentVisibleIndex() {
    if (!scrollContainer || videoSlides.length === 0) return 0;

    const slideHeight = scrollContainer.clientHeight;
    if (slideHeight <= 0) return 0;

    // This matches the React calculation: Math.round(scrollTop / clientHeight)
    const index = Math.max(
      0,
      Math.min(
        videoSlides.length - 1,
        Math.round(scrollContainer.scrollTop / slideHeight),
      ),
    );
    return index;
  }

  // Scroll to a specific slide by setting scrollTop directly
  // This triggers the React scroll handler which updates the active video
  function scrollToSlide(index) {
    if (!scrollContainer || index < 0 || index >= videoSlides.length) return;

    const slideHeight = scrollContainer.clientHeight;
    const targetScrollTop = index * slideHeight;

    console.log(
      "[MovieShows] Scrolling to video",
      index + 1,
      "of",
      videoSlides.length,
    );

    // Use scrollTo with smooth behavior - this will trigger the React scroll handler
    scrollContainer.scrollTo({
      top: targetScrollTop,
      behavior: "smooth",
    });

    currentIndex = index;
  }

  // Handle scroll events on the container to track current position
  function handleScroll() {
    if (isScrolling) return;

    const newIndex = getCurrentVisibleIndex();
    if (newIndex !== currentIndex) {
      currentIndex = newIndex;
      console.log("[MovieShows] Now viewing video", currentIndex + 1);
    }
  }

  // Handle wheel events for controlled scrolling
  function handleWheel(e) {
    const target = e.target;

    // Don't intercept scrolling in the queue panel or other scrollable areas
    if (
      target.closest('.overflow-y-auto:not([class*="snap-y"])') ||
      target.closest('[class*="custom-scrollbar"]') ||
      target.closest('[class*="Queue"]') ||
      target.closest('[class*="fixed"][class*="right"]') ||
      target.closest("select")
    ) {
      return;
    }

    if (!scrollContainer) return;

    if (isScrolling) {
      e.preventDefault();
      return;
    }

    // Only respond to significant scroll
    if (Math.abs(e.deltaY) < 20) return;

    e.preventDefault();

    const direction = e.deltaY > 0 ? 1 : -1;
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
        // Re-sync current index after scroll completes
        currentIndex = getCurrentVisibleIndex();
      }, SCROLL_COOLDOWN);
    }
  }

  // Handle keyboard navigation
  function handleKeydown(e) {
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
        direction = 1;
        break;
      case "ArrowUp":
      case "k":
      case "K":
        direction = -1;
        break;
      case "Home":
        if (videoSlides.length > 0) {
          e.preventDefault();
          isScrolling = true;
          scrollToSlide(0);
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            isScrolling = false;
          }, SCROLL_COOLDOWN);
        }
        return;
      case "End":
        if (videoSlides.length > 0) {
          e.preventDefault();
          isScrolling = true;
          scrollToSlide(videoSlides.length - 1);
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            isScrolling = false;
          }, SCROLL_COOLDOWN);
        }
        return;
    }

    if (direction === 0) return;

    e.preventDefault();

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
        currentIndex = getCurrentVisibleIndex();
      }, SCROLL_COOLDOWN);
    }
  }

  // Touch handling
  let touchStartY = 0;
  let touchStartTime = 0;

  function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }

  function handleTouchEnd(e) {
    if (isScrolling) return;

    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchStartY - touchEndY;
    const duration = Date.now() - touchStartTime;

    // Quick swipe detection
    if (duration < 300 && Math.abs(deltaY) > 50) {
      const direction = deltaY > 0 ? 1 : -1;
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
          currentIndex = getCurrentVisibleIndex();
        }, SCROLL_COOLDOWN);
      }
    }
  }

  // Initialize everything
  function init() {
    if (initialized) return;

    console.log("[MovieShows] Initializing scroll fix...");

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

    console.log(
      "[MovieShows] Found scroll container and",
      videoSlides.length,
      "videos",
    );
    console.log("[MovieShows] Container height:", scrollContainer.clientHeight);

    // Add event listeners
    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    // Track native scroll on the container
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    // Get initial position
    currentIndex = getCurrentVisibleIndex();
    console.log("[MovieShows] Initial video index:", currentIndex);

    // Auto-click the Play Queue button to activate the player
    setTimeout(() => {
      if (clickQueuePlayButton()) {
        console.log("[MovieShows] Auto-started queue playback");
      } else {
        console.log("[MovieShows] Play Queue button not found, will retry...");
        // Retry after more time for React to render
        setTimeout(clickQueuePlayButton, 2000);
      }
    }, 2000);

    initialized = true;
    console.log("[MovieShows] Scroll navigation ready!");
    console.log(
      "[MovieShows] Controls: Mouse wheel, Arrow Up/Down, J/K, Home/End, or swipe",
    );
  }

  // Watch for DOM changes (React updates)
  function setupMutationObserver() {
    const observer = new MutationObserver(() => {
      if (!initialized) {
        init();
      } else if (scrollContainer) {
        const newSlides = findVideoSlides();
        if (newSlides.length !== videoSlides.length) {
          videoSlides = newSlides;
          console.log(
            "[MovieShows] Video list updated:",
            videoSlides.length,
            "videos",
          );
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
      setTimeout(init, 2000);
    });
  } else {
    setupMutationObserver();
    setTimeout(init, 2000);
  }
})();
