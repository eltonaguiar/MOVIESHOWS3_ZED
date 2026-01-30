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

  // Player size configurations - pixel values for precise control
  let customPlayerHeight = 400; // Default height in pixels

  const PLAYER_PRESETS = {
    small: 250,
    medium: 350,
    large: 450,
    full: 600,
  };

  // ========== PLAYER SIZE CONTROL WITH DRAG HANDLE ==========

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
      <span style="color: #666; margin: 0 8px;">|</span>
      <span style="color: #888; font-size: 11px;">Height:</span>
      <button id="player-height-down">−</button>
      <span id="player-height-value" style="color: #0f0; font-size: 12px; min-width: 45px; text-align: center;">400px</span>
      <button id="player-height-up">+</button>
    `;

    document.body.appendChild(control);

    // Load saved height
    const savedHeight = localStorage.getItem("movieshows-player-height");
    if (savedHeight) {
      customPlayerHeight = parseInt(savedHeight, 10);
    }
    updateHeightDisplay();

    // Preset buttons
    control.querySelectorAll("button[data-size]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const size = btn.dataset.size;
        customPlayerHeight = PLAYER_PRESETS[size];
        localStorage.setItem("movieshows-player-height", customPlayerHeight);
        updateHeightDisplay();
        applyPlayerSizeToAll();

        // Update active state
        control
          .querySelectorAll("button[data-size]")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    // Height adjustment buttons
    document
      .getElementById("player-height-down")
      .addEventListener("click", () => {
        customPlayerHeight = Math.max(150, customPlayerHeight - 50);
        localStorage.setItem("movieshows-player-height", customPlayerHeight);
        updateHeightDisplay();
        applyPlayerSizeToAll();
        clearPresetActive();
      });

    document
      .getElementById("player-height-up")
      .addEventListener("click", () => {
        customPlayerHeight = Math.min(800, customPlayerHeight + 50);
        localStorage.setItem("movieshows-player-height", customPlayerHeight);
        updateHeightDisplay();
        applyPlayerSizeToAll();
        clearPresetActive();
      });
  }

  function updateHeightDisplay() {
    const display = document.getElementById("player-height-value");
    if (display) {
      display.textContent = customPlayerHeight + "px";
    }
  }

  function clearPresetActive() {
    const control = document.getElementById("player-size-control");
    if (control) {
      control
        .querySelectorAll("button[data-size]")
        .forEach((b) => b.classList.remove("active"));
    }
  }

  // ========== DRAG HANDLE FOR PLAYER RESIZE ==========

  let isDragging = false;
  let dragStartY = 0;
  let dragStartHeight = 0;

  function createDragHandle() {
    if (document.getElementById("player-drag-handle")) return;

    const handle = document.createElement("div");
    handle.id = "player-drag-handle";
    handle.innerHTML = `<span>⋯ Drag to resize player ⋯</span>`;
    document.body.appendChild(handle);

    handle.addEventListener("mousedown", startDrag);
    handle.addEventListener("touchstart", startDrag, { passive: false });

    document.addEventListener("mousemove", onDrag);
    document.addEventListener("touchmove", onDrag, { passive: false });

    document.addEventListener("mouseup", stopDrag);
    document.addEventListener("touchend", stopDrag);
  }

  function positionDragHandle() {
    const handle = document.getElementById("player-drag-handle");
    if (!handle) return;

    // Find the player area and position handle below it
    const iframe = document.querySelector('iframe[src*="youtube"]');
    if (iframe) {
      const rect = iframe.getBoundingClientRect();
      handle.style.top = rect.bottom - 5 + "px";
      handle.style.display = "flex";
    }
  }

  function startDrag(e) {
    e.preventDefault();
    isDragging = true;
    dragStartY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;
    dragStartHeight = customPlayerHeight;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  }

  function onDrag(e) {
    if (!isDragging) return;
    e.preventDefault();

    const currentY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;
    const delta = currentY - dragStartY;
    customPlayerHeight = Math.max(150, Math.min(800, dragStartHeight + delta));

    updateHeightDisplay();
    applyPlayerSizeToAll();
    positionDragHandle();
    clearPresetActive();
  }

  function stopDrag() {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem("movieshows-player-height", customPlayerHeight);
    }
  }

  // ========== TEXT POSITION DEBUG PANEL ==========

  let currentTextPosition = "A";

  const TEXT_POSITIONS = {
    A: { bottom: "180px", description: "180px from bottom" },
    B: { bottom: "200px", description: "200px from bottom" },
    C: { bottom: "220px", description: "220px from bottom" },
    D: { bottom: "160px", description: "160px from bottom" },
    E: { bottom: "140px", description: "140px from bottom" },
    F: { bottom: "250px", description: "250px from bottom" },
  };

  function createTextPositionDebug() {
    if (document.getElementById("text-position-debug")) return;

    const debug = document.createElement("div");
    debug.id = "text-position-debug";
    debug.innerHTML = `
      <span style="color: #888; font-size: 10px;">Text Pos:</span>
      <button data-pos="A" class="active">A</button>
      <button data-pos="B">B</button>
      <button data-pos="C">C</button>
      <button data-pos="D">D</button>
      <button data-pos="E">E</button>
      <button data-pos="F">F</button>
      <span id="text-pos-info" style="color: #0f0; font-size: 9px; margin-left: 5px;">180px</span>
    `;

    document.body.appendChild(debug);

    debug.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pos = btn.dataset.pos;
        setTextPosition(pos);
      });
    });
  }

  function setTextPosition(pos) {
    currentTextPosition = pos;
    const config = TEXT_POSITIONS[pos];

    // Update button states
    const debug = document.getElementById("text-position-debug");
    if (debug) {
      debug.querySelectorAll("button").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.pos === pos);
      });
      const info = debug.querySelector("#text-pos-info");
      if (info) info.textContent = config.description;
    }

    // Apply to info sections via JavaScript
    applyTextPosition(config.bottom);

    console.log("[MovieShows] Text position:", pos, config.description);
  }

  function applyTextPosition(bottomValue) {
    // Find the info container - it has class pattern like:
    // "absolute bottom-4 left-4 right-16 z-30 flex flex-col gap-2 pointer-events-none"

    let foundCount = 0;

    // Find all h2 elements (movie titles) and work up to find their container
    const titles = document.querySelectorAll("h2");
    titles.forEach((h2) => {
      // Find the nearest absolute positioned ancestor
      let container = h2.closest('[class*="absolute"]');
      if (container && container.className.includes("bottom-")) {
        // Don't mess with containers that have overflow-x (poster bar)
        if (!container.className.includes("overflow-x")) {
          container.style.setProperty("bottom", bottomValue, "important");
          foundCount++;
        }
      }
    });

    console.log(
      "[MovieShows] Text position applied to",
      foundCount,
      "containers, bottom:",
      bottomValue,
    );
  }

  function applyPlayerSizeToAll() {
    const heightPx = customPlayerHeight + "px";

    // Find ALL YouTube iframes on the page
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
      const src = iframe.src || "";
      if (src.includes("youtube")) {
        // Apply size to the iframe itself
        iframe.style.setProperty("height", heightPx, "important");
        iframe.style.setProperty("min-height", heightPx, "important");
        iframe.style.setProperty("max-height", heightPx, "important");

        // AGGRESSIVELY walk up the DOM tree and resize ALL parent containers
        // until we hit the main scroll container or body
        let parent = iframe.parentElement;
        let depth = 0;
        while (parent && depth < 15) {
          const className = parent.className || "";
          const tagName = parent.tagName.toLowerCase();

          // Stop at main layout containers
          if (
            className.includes("snap-y") ||
            className.includes("overflow-y-scroll") ||
            tagName === "body" ||
            tagName === "html"
          ) {
            break;
          }

          // Force height on this container (but don't change overflow - it breaks scrolling)
          parent.style.setProperty("height", heightPx, "important");
          parent.style.setProperty("min-height", heightPx, "important");
          parent.style.setProperty("max-height", "none", "important");

          parent = parent.parentElement;
          depth++;
        }
      }
    });

    // Update drag handle position
    positionDragHandle();

    console.log("[MovieShows] Player height set to:", heightPx);
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

      #player-height-down, #player-height-up {
        padding: 4px 10px !important;
        font-size: 16px !important;
        line-height: 1 !important;
      }

      /* Drag handle for player resize */
      #player-drag-handle {
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9998;
        display: none;
        align-items: center;
        justify-content: center;
        width: 200px;
        height: 20px;
        background: linear-gradient(to bottom, rgba(34, 197, 94, 0.8), rgba(34, 197, 94, 0.4));
        border-radius: 0 0 10px 10px;
        cursor: ns-resize;
        user-select: none;
        font-size: 10px;
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        transition: background 0.2s;
      }

      #player-drag-handle:hover {
        background: linear-gradient(to bottom, rgba(34, 197, 94, 1), rgba(34, 197, 94, 0.6));
      }

      #player-drag-handle:active {
        background: linear-gradient(to bottom, rgba(250, 204, 21, 1), rgba(250, 204, 21, 0.6));
      }

      /* Text position debug panel */
      #text-position-debug {
        position: fixed;
        bottom: 8px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(0, 0, 0, 0.95);
        padding: 6px 12px;
        border-radius: 20px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 200, 0, 0.4);
      }

      #text-position-debug button {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #aaa;
        padding: 3px 10px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 11px;
        font-weight: bold;
        transition: all 0.2s;
      }

      #text-position-debug button:hover {
        background: rgba(255, 200, 0, 0.3);
        color: white;
      }

      #text-position-debug button.active {
        background: #f59e0b;
        border-color: #f59e0b;
        color: black;
      }

      /* Title styling - ensure readability */
      h2 {
        text-shadow: 0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.7) !important;
      }

      /* Description - ensure readability */
      p {
        text-shadow: 0 1px 6px rgba(0,0,0,0.9) !important;
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
    createDragHandle();
    createTextPositionDebug();
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

    // Apply initial player size from saved value or default
    const savedHeight = localStorage.getItem("movieshows-player-height");
    if (savedHeight) {
      customPlayerHeight = parseInt(savedHeight, 10);
      updateHeightDisplay();
    }

    // Delay initial apply to let iframe load
    setTimeout(() => {
      applyPlayerSizeToAll();
    }, 1000);

    // Apply initial text position
    setTextPosition("A");

    // Keep applying size and text position periodically to catch new content
    setInterval(() => {
      applyPlayerSizeToAll();
      applyTextPosition(TEXT_POSITIONS[currentTextPosition].bottom);
    }, 2000);

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
