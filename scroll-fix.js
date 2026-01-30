// TikTok-style scroll navigation fix for MovieShows
(function () {
  "use strict";

  let initialized = false;
  let scrollContainer = null;
  let videoSlides = [];
  let currentIndex = -1;
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
      <button data-size="full">Full</button>
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
  }

  function setPlayerSize(size) {
    document.body.classList.remove(
      "player-small",
      "player-medium",
      "player-large",
      "player-full",
    );
    document.body.classList.add(`player-${size}`);

    const control = document.getElementById("player-size-control");
    if (control) {
      control.querySelectorAll("button").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.size === size);
      });
    }

    console.log("[MovieShows] Player size:", size);
  }

  function injectStyles() {
    if (document.getElementById("movieshows-custom-styles")) return;

    const style = document.createElement("style");
    style.id = "movieshows-custom-styles";
    style.textContent = `
      /* Player size control */
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

      /* ===== FIX: Add padding-top to push content down so player is visible ===== */

      /* Small - Add padding to push video into view */
      .player-small .snap-center {
        padding-top: 60px !important;
      }

      .player-small iframe[src*="youtube"] {
        height: 25vh !important;
        max-height: 200px !important;
        min-height: 150px !important;
      }

      /* Medium */
      .player-medium .snap-center {
        padding-top: 50px !important;
      }

      .player-medium iframe[src*="youtube"] {
        height: 35vh !important;
        max-height: 300px !important;
        min-height: 200px !important;
      }

      /* Large (default) */
      .player-large .snap-center {
        padding-top: 40px !important;
      }

      .player-large iframe[src*="youtube"] {
        height: 45vh !important;
        max-height: 400px !important;
        min-height: 280px !important;
      }

      /* Full - minimal padding, more video */
      .player-full .snap-center {
        padding-top: 30px !important;
      }

      .player-full iframe[src*="youtube"] {
        height: 60vh !important;
        max-height: 70vh !important;
        min-height: 400px !important;
      }

      /* ===== Ensure title/info section is always visible ===== */

      /* The info section at bottom-left */
      [class*="absolute"][class*="bottom-4"][class*="left-4"][class*="z-30"] {
        position: relative !important;
        bottom: auto !important;
        left: auto !important;
        padding: 12px 16px !important;
        background: linear-gradient(to top, rgba(0,0,0,0.9), transparent) !important;
        margin-top: -80px !important;
        z-index: 40 !important;
      }

      /* For Full mode - show a compact info bar */
      .player-full [class*="absolute"][class*="bottom-4"][class*="left-4"][class*="z-30"] {
        margin-top: -60px !important;
        padding: 8px 16px !important;
      }

      /* Title should always be visible */
      h2[class*="text-2xl"],
      .text-2xl.font-bold {
        font-size: 1.25rem !important;
        margin-bottom: 4px !important;
      }

      .player-full h2[class*="text-2xl"],
      .player-full .text-2xl.font-bold {
        font-size: 1.1rem !important;
      }

      /* Description text */
      [class*="line-clamp"] {
        -webkit-line-clamp: 3 !important;
        line-clamp: 3 !important;
        font-size: 0.85rem !important;
      }

      .player-full [class*="line-clamp"] {
        -webkit-line-clamp: 2 !important;
        line-clamp: 2 !important;
        font-size: 0.8rem !important;
      }

      .player-small [class*="line-clamp"] {
        -webkit-line-clamp: 4 !important;
        line-clamp: 4 !important;
      }

      /* Badge row */
      [class*="flex"][class*="items-center"][class*="gap-2"]:has([class*="IMDb"]),
      [class*="flex"][class*="items-center"][class*="gap-2"]:has([class*="bg-yellow"]) {
        flex-wrap: wrap !important;
        gap: 4px !important;
        margin-bottom: 4px !important;
      }

      /* Genre tags */
      [class*="flex"][class*="flex-wrap"][class*="gap-2"]:has([class*="rounded-full"]) {
        margin-top: 4px !important;
      }
    `;

    document.head.appendChild(style);
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
    const allButtons = document.querySelectorAll("button");
    for (const btn of allButtons) {
      if (btn.textContent?.includes("Play Queue")) {
        btn.click();
        return true;
      }
    }

    const greenPlayBtn = document.querySelector('button[class*="bg-green"]');
    if (greenPlayBtn) {
      greenPlayBtn.click();
      return true;
    }

    return false;
  }

  function getCurrentVisibleIndex() {
    if (!scrollContainer || videoSlides.length === 0) return 0;

    const slideHeight = scrollContainer.clientHeight;
    if (slideHeight <= 0) return 0;

    return Math.max(
      0,
      Math.min(
        videoSlides.length - 1,
        Math.round(scrollContainer.scrollTop / slideHeight),
      ),
    );
  }

  function scrollToSlide(index) {
    if (!scrollContainer || index < 0 || index >= videoSlides.length) return;

    const slideHeight = scrollContainer.clientHeight;
    scrollContainer.scrollTo({
      top: index * slideHeight,
      behavior: "smooth",
    });

    currentIndex = index;
    console.log("[MovieShows] Scrolled to video", index + 1);
  }

  function handleScroll() {
    if (isScrolling) return;

    const newIndex = getCurrentVisibleIndex();
    if (newIndex !== currentIndex) {
      currentIndex = newIndex;
    }
  }

  function handleWheel(e) {
    const target = e.target;

    if (
      target.closest("#player-size-control") ||
      target.closest('.overflow-y-auto:not([class*="snap-y"])') ||
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

    const actualIndex = getCurrentVisibleIndex();
    if (currentIndex === -1 || currentIndex !== actualIndex) {
      currentIndex = actualIndex;
    }

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
        setPlayerSize("full");
        localStorage.setItem("movieshows-player-size", "full");
        return;
    }

    if (direction === 0) return;

    e.preventDefault();

    const actualIndex = getCurrentVisibleIndex();
    if (currentIndex === -1 || currentIndex !== actualIndex) {
      currentIndex = actualIndex;
    }

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
      const actualIndex = getCurrentVisibleIndex();
      if (currentIndex === -1 || currentIndex !== actualIndex) {
        currentIndex = actualIndex;
      }

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
      setTimeout(init, 1000);
      return;
    }

    videoSlides = findVideoSlides();
    if (videoSlides.length === 0) {
      setTimeout(init, 1000);
      return;
    }

    console.log("[MovieShows] Found", videoSlides.length, "videos");

    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    currentIndex = getCurrentVisibleIndex();

    setTimeout(() => {
      if (!clickQueuePlayButton()) {
        setTimeout(clickQueuePlayButton, 2000);
      }
    }, 2000);

    initialized = true;
    console.log(
      "[MovieShows] Ready! Scroll: wheel/arrows/J/K | Size: 1/2/3/4 keys",
    );
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
