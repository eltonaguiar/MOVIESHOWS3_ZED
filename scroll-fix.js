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

    // The Queue panel has items with play buttons (▷ triangle icons)
    // Look for the play button SVG or button near queue items

    // Find the Queue panel - it contains "Queue" text and has the playlist
    const queuePanel =
      document.querySelector('[class*="Queue"]') ||
      document
        .evaluate(
          "//div[contains(text(), 'Queue')]",
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        )
        .singleNodeValue?.closest('div[class*="fixed"]') ||
      document.querySelector('[class*="fixed"][class*="right-0"]');

    if (queuePanel) {
      console.log("[MovieShows] Found Queue panel");

      // Find play buttons (usually SVG triangles or buttons with play icon)
      // The play icon is typically a right-pointing triangle ▷
      const playButtons = queuePanel.querySelectorAll(
        'button, [role="button"], svg',
      );

      for (const btn of playButtons) {
        // Check if it's a play button by looking for triangle/play path or aria-label
        const isPlayButton =
          btn.querySelector('path[d*="M"]') || // SVG play icon
          btn.querySelector("polygon") || // Triangle
          btn.getAttribute("aria-label")?.toLowerCase().includes("play") ||
          btn.className?.includes("play");

        // Also check if parent is a button-like element
        const parent =
          btn.closest("button") ||
          btn.closest('[role="button"]') ||
          btn.closest('[class*="cursor-pointer"]');

        if (
          parent &&
          !parent.querySelector('[class*="trash"]') &&
          !parent.querySelector('[class*="delete"]')
        ) {
          // Skip if it's the main "Play Queue" button at bottom
          if (
            parent.textContent?.includes("Play Queue") ||
            parent.textContent?.includes("Shuffle")
          ) {
            continue;
          }

          // This might be the individual play button next to a queue item
          console.log("[MovieShows] Found potential play button, clicking...");
          parent.click();
          return true;
        }
      }
    }

    // Alternative: Find any element that looks like a play button near queue items
    // Queue items have poster images and play/delete buttons
    const queueItems = document.querySelectorAll(
      '[class*="draggable"], [class*="queue-item"], [class*="flex"][class*="gap"]',
    );

    for (const item of queueItems) {
      // Look for the small play button (not the big Play Queue button)
      const buttons = item.querySelectorAll(
        'button, [class*="cursor-pointer"]',
      );
      for (const btn of buttons) {
        // Check for play icon (triangle SVG)
        const svg = btn.querySelector("svg");
        if (svg) {
          const path = svg.querySelector("path");
          if (path) {
            const d = path.getAttribute("d") || "";
            // Play icons typically have a triangular path
            if (
              d.includes("M") &&
              (d.includes("l") || d.includes("L")) &&
              !d.includes("rect")
            ) {
              // Check it's not a trash/delete icon
              if (
                !btn.closest('[class*="trash"]') &&
                !btn.textContent?.includes("delete")
              ) {
                console.log(
                  "[MovieShows] Found play button via SVG, clicking...",
                );
                btn.click();
                return true;
              }
            }
          }
        }
      }
    }

    // Last resort: Find the "Play Queue" button and click it
    const playQueueBtn = document.evaluate(
      "//button[contains(., 'Play Queue')]",
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue;
    if (playQueueBtn) {
      console.log("[MovieShows] Found Play Queue button, clicking...");
      playQueueBtn.click();
      return true;
    }

    // Alternative: look for green "Play Queue" button
    const greenPlayBtn = document.querySelector('button[class*="bg-green"]');
    if (greenPlayBtn && greenPlayBtn.textContent?.includes("Play")) {
      console.log("[MovieShows] Found green Play button, clicking...");
      greenPlayBtn.click();
      return true;
    }

    return false;
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
    }
  }

  // Handle wheel events for controlled scrolling
  function handleWheel(e) {
    const target = e.target;

    // Don't intercept scrolling in nested scrollable areas (like the queue panel)
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

    // Make sure first video is in view
    if (currentIndex === 0 && videoSlides.length > 0) {
      setTimeout(() => {
        const firstSlide = videoSlides[0];
        if (firstSlide) {
          firstSlide.scrollIntoView({ behavior: "auto", block: "center" });
        }
      }, 300);
    }

    // Auto-click the Play button in the Queue to activate scrolling
    setTimeout(() => {
      if (clickQueuePlayButton()) {
        console.log("[MovieShows] Auto-activated queue playback");
      } else {
        console.log("[MovieShows] Could not find play button, trying again...");
        setTimeout(clickQueuePlayButton, 2000);
      }
    }, 1500);

    initialized = true;
    console.log("[MovieShows] Scroll navigation ready!");
    console.log(
      "[MovieShows] Use: Mouse wheel, Arrow keys (up/down), J/K, Home/End, or swipe",
    );
  }

  // Watch for DOM changes (React updates)
  function setupMutationObserver() {
    const observer = new MutationObserver(() => {
      if (!initialized) {
        init();
      } else {
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
