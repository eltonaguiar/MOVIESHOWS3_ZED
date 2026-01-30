// TikTok-style scroll navigation fix for MovieShows
(function () {
  "use strict";

  let initialized = false;
  let scrollContainer = null;
  let videoSlides = [];
  let currentIndex = -1;
  let isScrolling = false;
  let scrollTimeout = null;
  let currentPlayerSize = "large";
  const SCROLL_COOLDOWN = 500;

  // Player size configurations - larger values for better visibility
  const PLAYER_SIZES = {
    small: { height: "30vh", minHeight: "200px", maxHeight: "280px" },
    medium: { height: "45vh", minHeight: "320px", maxHeight: "420px" },
    large: { height: "60vh", minHeight: "450px", maxHeight: "550px" },
    full: { height: "80vh", minHeight: "550px", maxHeight: "90vh" },
  };

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
    currentPlayerSize = size;

    // Update button states
    const control = document.getElementById("player-size-control");
    if (control) {
      control.querySelectorAll("button").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.size === size);
      });
    }

    // Set data attribute on body for CSS backup approach
    document.body.setAttribute("data-player-size", size);

    // Apply size to all iframes immediately via JavaScript
    applyPlayerSizeToAll();

    console.log("[MovieShows] Player size:", size);
  }

  function applyPlayerSizeToAll() {
    const config = PLAYER_SIZES[currentPlayerSize];
    if (!config) return;

    // Find ALL iframes on the page
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
      const src = iframe.src || "";
      if (src.includes("youtube")) {
        applyStyleToElement(iframe, config);

        // Walk up the DOM tree and style ALL parent containers
        let parent = iframe.parentElement;
        for (let i = 0; i < 10 && parent; i++) {
          const className = parent.className || "";

          // Target the main player container classes we found in the compiled code
          if (
            className.includes("relative") &&
            (className.includes("w-full") ||
              className.includes("bg-black") ||
              className.includes("shadow"))
          ) {
            applyStyleToElement(parent, config);
          }

          // Also catch any container with h-full that wraps the iframe
          if (className.includes("h-full") || className.includes("h-screen")) {
            applyStyleToElement(parent, config);
          }

          parent = parent.parentElement;
        }
      }
    });

    // Also directly target the player container by its distinctive class pattern
    const playerContainers = document.querySelectorAll(
      '[class*="relative"][class*="w-full"][class*="bg-black"]',
    );
    playerContainers.forEach((container) => {
      // Only apply to containers that likely hold the video
      if (
        container.querySelector("iframe") ||
        container.className.includes("shadow")
      ) {
        applyStyleToElement(container, config);
      }
    });
  }

  function applyStyleToElement(el, config) {
    el.style.setProperty("height", config.height, "important");
    el.style.setProperty("min-height", config.minHeight, "important");
    el.style.setProperty("max-height", config.maxHeight, "important");
    el.style.transition = "height 0.3s ease";
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
        padding: 4px 12px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 12px;
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

      /* CSS-based player sizing as backup - data attribute approach */
      body[data-player-size="small"] iframe[src*="youtube"],
      body[data-player-size="small"] [class*="relative"][class*="bg-black"] {
        height: 30vh !important;
        min-height: 200px !important;
        max-height: 280px !important;
      }

      body[data-player-size="medium"] iframe[src*="youtube"],
      body[data-player-size="medium"] [class*="relative"][class*="bg-black"] {
        height: 45vh !important;
        min-height: 320px !important;
        max-height: 420px !important;
      }

      body[data-player-size="large"] iframe[src*="youtube"],
      body[data-player-size="large"] [class*="relative"][class*="bg-black"] {
        height: 60vh !important;
        min-height: 450px !important;
        max-height: 550px !important;
      }

      body[data-player-size="full"] iframe[src*="youtube"],
      body[data-player-size="full"] [class*="relative"][class*="bg-black"] {
        height: 80vh !important;
        min-height: 550px !important;
        max-height: 90vh !important;
      }

      /* Ensure info section is visible */
      [class*="absolute"][class*="bottom-4"][class*="left-4"][class*="z-30"],
      [class*="absolute"][class*="bottom-"][class*="left-"][class*="flex-col"] {
        max-width: calc(100% - 120px) !important;
      }

      /* Title styling */
      h2[class*="text-2xl"],
      h2[class*="font-bold"] {
        text-shadow: 0 2px 4px rgba(0,0,0,0.8) !important;
      }

      /* Description */
      [class*="line-clamp"] {
        text-shadow: 0 1px 3px rgba(0,0,0,0.8) !important;
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

    // Re-apply player size after scroll (new iframe may have loaded)
    setTimeout(applyPlayerSizeToAll, 300);

    console.log("[MovieShows] Scrolled to video", index + 1);
  }

  function handleScroll() {
    if (isScrolling) return;

    const newIndex = getCurrentVisibleIndex();
    if (newIndex !== currentIndex) {
      currentIndex = newIndex;
      // Apply size to any new iframes
      setTimeout(applyPlayerSizeToAll, 100);
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

  // Watch for DOM changes and apply player size to new iframes
  function setupIframeObserver() {
    const observer = new MutationObserver((mutations) => {
      let hasNewNodes = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          hasNewNodes = true;
          break;
        }
      }
      if (hasNewNodes) {
        setTimeout(applyPlayerSizeToAll, 200);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    if (initialized) return;

    console.log("[MovieShows] Initializing...");

    injectStyles();
    createPlayerSizeControl();
    setupIframeObserver();

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

    // Apply initial player size
    const savedSize = localStorage.getItem("movieshows-player-size") || "large";
    setPlayerSize(savedSize);

    // Keep applying size periodically to catch new iframes
    setInterval(applyPlayerSizeToAll, 2000);

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
