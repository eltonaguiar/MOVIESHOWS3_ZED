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

  // ========== PLAYER SIZE CONTROL ==========

  function createPlayerSizeControl() {
    // Check if already exists
    if (document.getElementById("player-size-control")) return;

    const control = document.createElement("div");
    control.id = "player-size-control";
    control.innerHTML = `
      <span style="color: #888; font-size: 11px; margin-right: 8px;">Player Size:</span>
      <button data-size="small">S</button>
      <button data-size="medium" class="active">M</button>
      <button data-size="large">L</button>
      <button data-size="fullscreen">XL</button>
    `;

    document.body.appendChild(control);

    // Load saved preference
    const savedSize =
      localStorage.getItem("movieshows-player-size") || "medium";
    setPlayerSize(savedSize);

    // Add click handlers
    control.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const size = btn.dataset.size;
        setPlayerSize(size);
        localStorage.setItem("movieshows-player-size", size);
      });
    });

    console.log("[MovieShows] Player size control added");
  }

  function setPlayerSize(size) {
    // Remove all size classes
    document.body.classList.remove(
      "player-small",
      "player-medium",
      "player-large",
      "player-fullscreen",
    );
    // Add the selected size class
    document.body.classList.add(`player-${size}`);

    // Update button states
    const control = document.getElementById("player-size-control");
    if (control) {
      control.querySelectorAll("button").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.size === size);
      });
    }

    console.log("[MovieShows] Player size set to:", size);
  }

  function injectStyles() {
    if (document.getElementById("movieshows-custom-styles")) return;

    const style = document.createElement("style");
    style.id = "movieshows-custom-styles";
    style.textContent = `
      /* Player size control button styling */
      #player-size-control {
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(0, 0, 0, 0.85);
        padding: 6px 14px;
        border-radius: 20px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
      }

      #player-size-control button {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #aaa;
        padding: 4px 10px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 11px;
        font-weight: bold;
        transition: all 0.2s;
      }

      #player-size-control button:hover {
        background: rgba(255, 255, 255, 0.2);
        color: white;
      }

      #player-size-control button.active {
        background: #22c55e;
        border-color: #22c55e;
        color: black;
      }

      /* Fix text overlap - ensure description area has proper layout */
      .player-small .snap-center > div:first-child {
        max-height: 35vh !important;
      }

      .player-medium .snap-center > div:first-child {
        max-height: 50vh !important;
      }

      .player-large .snap-center > div:first-child {
        max-height: 65vh !important;
      }

      .player-fullscreen .snap-center > div:first-child {
        max-height: 80vh !important;
      }

      /* Ensure the info section at bottom doesn't overlap */
      [class*="absolute"][class*="bottom-4"][class*="left-4"] {
        max-height: 35vh !important;
        overflow-y: auto !important;
        padding-bottom: 10px !important;
      }

      /* Make text more readable */
      [class*="line-clamp-3"] {
        -webkit-line-clamp: 4 !important;
        line-clamp: 4 !important;
      }

      /* Adjust for smaller player - move info up */
      .player-small [class*="absolute"][class*="bottom-4"][class*="left-4"] {
        bottom: 200px !important;
      }

      /* Adjust for larger player - keep info at bottom */
      .player-large [class*="absolute"][class*="bottom-4"][class*="left-4"],
      .player-fullscreen [class*="absolute"][class*="bottom-4"][class*="left-4"] {
        bottom: 80px !important;
        max-height: 25vh !important;
      }

      /* Poster carousel should not overlap */
      [class*="flex"][class*="gap-2"][class*="overflow-x"] {
        position: relative !important;
        z-index: 10 !important;
      }
    `;

    document.head.appendChild(style);
    console.log("[MovieShows] Custom styles injected");
  }

  // ========== SCROLL NAVIGATION ==========

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

  function findVideoSlides() {
    if (!scrollContainer) return [];
    return Array.from(
      scrollContainer.querySelectorAll('[class*="snap-center"]'),
    );
  }

  function clickQueuePlayButton() {
    console.log("[MovieShows] Looking for Queue play button...");

    const allButtons = document.querySelectorAll("button");
    for (const btn of allButtons) {
      if (btn.textContent?.includes("Play Queue")) {
        console.log("[MovieShows] Found Play Queue button, clicking...");
        btn.click();
        return true;
      }
    }

    const greenPlayBtn = document.querySelector('button[class*="bg-green"]');
    if (greenPlayBtn) {
      console.log("[MovieShows] Found green Play button, clicking...");
      greenPlayBtn.click();
      return true;
    }

    return false;
  }

  function getCurrentVisibleIndex() {
    if (!scrollContainer || videoSlides.length === 0) return 0;

    const slideHeight = scrollContainer.clientHeight;
    if (slideHeight <= 0) return 0;

    const index = Math.max(
      0,
      Math.min(
        videoSlides.length - 1,
        Math.round(scrollContainer.scrollTop / slideHeight),
      ),
    );
    return index;
  }

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

    scrollContainer.scrollTo({
      top: targetScrollTop,
      behavior: "smooth",
    });

    currentIndex = index;
  }

  function handleScroll() {
    if (isScrolling) return;

    const newIndex = getCurrentVisibleIndex();
    if (newIndex !== currentIndex) {
      currentIndex = newIndex;
      console.log("[MovieShows] Now viewing video", currentIndex + 1);
    }
  }

  function handleWheel(e) {
    const target = e.target;

    // Don't intercept scrolling in control areas
    if (
      target.closest("#player-size-control") ||
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
        currentIndex = getCurrentVisibleIndex();
      }, SCROLL_COOLDOWN);
    }
  }

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
      // Player size shortcuts
      case "1":
        if (!e.target.closest("input, textarea")) setPlayerSize("small");
        return;
      case "2":
        if (!e.target.closest("input, textarea")) setPlayerSize("medium");
        return;
      case "3":
        if (!e.target.closest("input, textarea")) setPlayerSize("large");
        return;
      case "4":
        if (!e.target.closest("input, textarea")) setPlayerSize("fullscreen");
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

  function init() {
    if (initialized) return;

    console.log("[MovieShows] Initializing...");

    // Inject styles and create player size control first
    injectStyles();
    createPlayerSizeControl();

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

    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    currentIndex = getCurrentVisibleIndex();

    setTimeout(() => {
      if (clickQueuePlayButton()) {
        console.log("[MovieShows] Auto-started queue playback");
      } else {
        setTimeout(clickQueuePlayButton, 2000);
      }
    }, 2000);

    initialized = true;
    console.log("[MovieShows] Ready! Controls:");
    console.log("  - Scroll: Mouse wheel, Arrow Up/Down, J/K, swipe");
    console.log("  - Player size: 1/2/3/4 keys or click S/M/L/XL buttons");
  }

  function setupMutationObserver() {
    const observer = new MutationObserver(() => {
      if (!initialized) {
        init();
      } else if (scrollContainer) {
        const newSlides = findVideoSlides();
        if (newSlides.length !== videoSlides.length) {
          videoSlides = newSlides;
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

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
