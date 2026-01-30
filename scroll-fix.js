// TikTok-style scroll navigation fix for MovieShows
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

    // Apply size directly to iframes found on page
    applyPlayerSize(size);

    console.log("[MovieShows] Player size:", size);
  }

  function applyPlayerSize(size) {
    const heights = {
      small: "200px",
      medium: "300px",
      large: "400px",
      full: "70vh",
    };

    const height = heights[size] || heights.large;

    // Find all YouTube iframes and their containers
    const iframes = document.querySelectorAll('iframe[src*="youtube"]');
    iframes.forEach((iframe) => {
      iframe.style.height = height;
      iframe.style.maxHeight = height;

      // Also style parent containers
      let parent = iframe.parentElement;
      for (let i = 0; i < 5 && parent; i++) {
        if (
          parent.className &&
          (parent.className.includes("group/player") ||
            (parent.className.includes("relative") &&
              parent.className.includes("w-full")))
        ) {
          parent.style.height = height;
          parent.style.maxHeight = height;
          break;
        }
        parent = parent.parentElement;
      }
    });
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

      /* Fix title and description visibility */
      /* The title section that shows "Melania" etc */
      h2.text-2xl {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }

      /* Ensure the bottom info section is fully visible */
      .snap-center [class*="bottom-4"][class*="left-4"] {
        left: 16px !important;
        right: 350px !important;
        max-width: calc(100% - 380px) !important;
      }

      /* Make sure text isn't clipped */
      [class*="line-clamp"] {
        -webkit-line-clamp: 4 !important;
        line-clamp: 4 !important;
        display: -webkit-box !important;
        overflow: visible !important;
      }

      /* Ensure the info badges row is visible */
      [class*="flex"][class*="items-center"][class*="gap-2"]:has([class*="bg-yellow"]) {
        flex-wrap: wrap !important;
      }

      /* Player size CSS classes as backup */
      .player-small iframe[src*="youtube"] {
        height: 200px !important;
        max-height: 200px !important;
      }

      .player-medium iframe[src*="youtube"] {
        height: 300px !important;
        max-height: 300px !important;
      }

      .player-large iframe[src*="youtube"] {
        height: 400px !important;
        max-height: 400px !important;
      }

      .player-full iframe[src*="youtube"] {
        height: 70vh !important;
        max-height: 70vh !important;
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

    if (!scrollContainer || isScrolling) {
      if (isScrolling) e.preventDefault();
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
        // Re-apply player size after scroll
        const size = localStorage.getItem("movieshows-player-size") || "large";
        setTimeout(() => applyPlayerSize(size), 100);
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

  // Watch for new iframes being added and apply size
  function setupIframeObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          const size =
            localStorage.getItem("movieshows-player-size") || "large";
          setTimeout(() => applyPlayerSize(size), 200);
          break;
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
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

    // Setup observer to apply size when iframes load
    setupIframeObserver();

    // Apply initial player size
    const savedSize = localStorage.getItem("movieshows-player-size") || "large";
    setTimeout(() => applyPlayerSize(savedSize), 500);

    // Auto-click play queue
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
