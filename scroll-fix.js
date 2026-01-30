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

  // Find and click the "Next Up" button on a slide to queue the video
  function activateVideo(slide) {
    if (!slide) return false;

    // Look for the "Next Up" button (has text "Next Up" and a queue icon)
    const buttons = slide.querySelectorAll("button");
    for (const btn of buttons) {
      const text = btn.textContent?.trim().toLowerCase();
      if (text === "next up" || text === "in queue") {
        console.log("[MovieShows] Found Next Up button, clicking...");
        btn.click();
        return true;
      }
    }

    // Alternative: look for any clickable element that might trigger the video
    const clickable = slide.querySelector('[class*="cursor-pointer"]');
    if (clickable) {
      console.log("[MovieShows] Found clickable element, clicking...");
      clickable.click();
      return true;
    }

    return false;
  }

  // Simulate clicking on a poster thumbnail to select a video
  function clickPosterThumbnail(index = 0) {
    // Find the horizontal poster strip/carousel
    const posterContainers = document.querySelectorAll(
      '[class*="flex-shrink-0"][class*="cursor-pointer"]',
    );
    if (posterContainers.length > index) {
      console.log("[MovieShows] Clicking poster thumbnail", index);
      posterContainers[index].click();
      return true;
    }

    // Alternative: find poster images in a scrollable row
    const posters = document.querySelectorAll(
      '[class*="aspect-"][class*="rounded"][class*="cursor-pointer"]',
    );
    if (posters.length > index) {
      console.log("[MovieShows] Clicking poster", index);
      posters[index].click();
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

    // Don't intercept scrolling in nested scrollable areas
    if (
      target.closest('.overflow-y-auto:not([class*="snap-y"])') ||
      target.closest('[class*="custom-scrollbar"]') ||
      target.closest("select")
    ) {
      return;
    }

    if (!scrollContainer?.contains(target) && target !== scrollContainer) {
      const containerRect = scrollContainer?.getBoundingClientRect();
      if (!containerRect) return;
    }

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

  // Auto-play first video by clicking the "Next Up" then triggering play
  function autoPlayFirstVideo() {
    console.log("[MovieShows] Attempting to auto-activate first video...");

    // First, try clicking a poster thumbnail to select a video
    if (clickPosterThumbnail(0)) {
      console.log("[MovieShows] Clicked first poster thumbnail");

      // After a short delay, find and click the play area or Next Up button
      setTimeout(() => {
        if (videoSlides.length > 0) {
          const firstSlide = videoSlides[0];

          // Try to find the main video/play area and click it
          const videoArea =
            firstSlide.querySelector("iframe") ||
            firstSlide.querySelector('[class*="aspect-video"]') ||
            firstSlide.querySelector('[class*="w-full"][class*="h-full"]');
          if (videoArea) {
            console.log("[MovieShows] Found video area");
            // Don't click iframe directly, look for a play button or overlay
            const playButton =
              firstSlide.querySelector('button[class*="play"]') ||
              firstSlide.querySelector('[class*="play"]');
            if (playButton) {
              playButton.click();
            }
          }

          // Also try clicking the "Next Up" button if it exists
          activateVideo(firstSlide);
        }
      }, 500);

      return true;
    }

    // Alternative: if no poster thumbnails, try clicking directly on the first slide
    if (videoSlides.length > 0) {
      activateVideo(videoSlides[0]);
      return true;
    }

    return false;
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

    // Auto-activate first video after a delay
    setTimeout(autoPlayFirstVideo, 1000);

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
