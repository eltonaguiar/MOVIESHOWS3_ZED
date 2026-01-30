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
    if (document.getElementById("player-size-control")) return;

    const control = document.createElement("div");
    control.id = "player-size-control";
    control.innerHTML = `
      <span style="color: #888; font-size: 11px; margin-right: 8px;">Player:</span>
      <button data-size="small">S</button>
      <button data-size="medium">M</button>
      <button data-size="large" class="active">L</button>
      <button data-size="fullscreen">Full</button>
    `;

    document.body.appendChild(control);

    const savedSize = localStorage.getItem("movieshows-player-size") || "large";
    setPlayerSize(savedSize);

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
    document.body.classList.remove(
      "player-small",
      "player-medium",
      "player-large",
      "player-fullscreen",
    );
    document.body.classList.add(`player-${size}`);

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
      /* Player size control styling */
      #player-size-control {
        position: fixed;
        top: 8px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(0, 0, 0, 0.9);
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

      /* ===== SMALL PLAYER ===== */
      .player-small iframe[src*="youtube.com"],
      .player-small iframe[data-active="true"] {
        max-height: 25vh !important;
        height: 25vh !important;
      }

      .player-small .snap-center > div:first-child {
        max-height: 30vh !important;
      }

      .player-small [class*="group/player"] {
        max-height: 30vh !important;
      }

      /* ===== MEDIUM PLAYER ===== */
      .player-medium iframe[src*="youtube.com"],
      .player-medium iframe[data-active="true"] {
        max-height: 40vh !important;
        height: 40vh !important;
      }

      .player-medium .snap-center > div:first-child {
        max-height: 45vh !important;
      }

      .player-medium [class*="group/player"] {
        max-height: 45vh !important;
      }

      /* ===== LARGE PLAYER ===== */
      .player-large iframe[src*="youtube.com"],
      .player-large iframe[data-active="true"] {
        max-height: 55vh !important;
        height: 55vh !important;
      }

      .player-large .snap-center > div:first-child {
        max-height: 60vh !important;
      }

      .player-large [class*="group/player"] {
        max-height: 60vh !important;
      }

      /* ===== FULLSCREEN PLAYER ===== */
      .player-fullscreen iframe[src*="youtube.com"],
      .player-fullscreen iframe[data-active="true"] {
        max-height: 75vh !important;
        height: 75vh !important;
      }

      .player-fullscreen .snap-center > div:first-child {
        max-height: 80vh !important;
      }

      .player-fullscreen [class*="group/player"] {
        max-height: 80vh !important;
      }

      /* Fix the parent container that holds the iframe */
      .player-small [class*="relative"][class*="w-full"][class*="h-full"][class*="max-w"] {
        height: 25vh !important;
        max-height: 25vh !important;
      }

      .player-medium [class*="relative"][class*="w-full"][class*="h-full"][class*="max-w"] {
        height: 40vh !important;
        max-height: 40vh !important;
      }

      .player-large [class*="relative"][class*="w-full"][class*="h-full"][class*="max-w"] {
        height: 55vh !important;
        max-height: 55vh !important;
      }

      .player-fullscreen [class*="relative"][class*="w-full"][class*="h-full"][class*="max-w"] {
        height: 75vh !important;
        max-height: 75vh !important;
      }

      /* Target the snap-center slide's inner container */
      .player-small .snap-center [class*="absolute"][class*="inset-0"]:has(iframe) {
        height: 30vh !important;
        position: relative !important;
      }

      .player-medium .snap-center [class*="absolute"][class*="inset-0"]:has(iframe) {
        height: 45vh !important;
        position: relative !important;
      }

      .player-large .snap-center [class*="absolute"][class*="inset-0"]:has(iframe) {
        height: 60vh !important;
        position: relative !important;
      }

      .player-fullscreen .snap-center [class*="absolute"][class*="inset-0"]:has(iframe) {
        height: 80vh !important;
        position: relative !important;
      }

      /* Ensure info section doesn't overlap */
      [class*="absolute"][class*="bottom-4"][class*="left-4"][class*="z-30"] {
        position: relative !important;
        bottom: auto !important;
        left: auto !important;
        padding: 16px !important;
        margin-top: 10px !important;
      }

      /* Make snap-center slides flex column */
      .snap-center {
        display: flex !important;
        flex-direction: column !important;
        height: 100% !important;
      }

      .snap-center > div:first-child {
        flex-shrink: 0 !important;
      }

      /* Text should not overlap with poster row */
      [class*="line-clamp"] {
        -webkit-line-clamp: 3 !important;
      }

      /* Poster carousel at bottom */
      [class*="2026 HOT PICKS"],
      [class*="hot-picks"] {
        margin-top: auto !important;
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
      case "1":
        setPlayerSize("small");
        localStorage.setItem("movieshows-player-size", "small");
        return;
      case "2":
        setPlayerSize("medium");
        localStorage.setItem("movieshows-player-size", "medium");
        return;
      case "3":
        setPlayerSize("large");
        localStorage.setItem("movieshows-player-size", "large");
        return;
      case "4":
        setPlayerSize("fullscreen");
        localStorage.setItem("movieshows-player-size", "fullscreen");
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
    console.log("  - Player size: 1/2/3/4 keys or S/M/L/Full buttons");
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
