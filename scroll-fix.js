// TikTok-style scroll navigation for MovieShows
(function () {
  "use strict";

  let isScrolling = false;
  let scrollTimeout;
  let currentIndex = 0;
  const SCROLL_COOLDOWN = 600; // ms between scrolls

  // Wait for the React app to fully render video items
  function waitForVideos() {
    return new Promise((resolve) => {
      let attempts = 0;
      const check = () => {
        attempts++;
        const items = findVideoItems();
        if (items.length > 0) {
          console.log(
            "[MovieShows] Found",
            items.length,
            "video items after",
            attempts,
            "attempts",
          );
          resolve(items);
        } else if (attempts < 60) {
          setTimeout(check, 500);
        } else {
          console.log("[MovieShows] Timeout waiting for videos");
          resolve([]);
        }
      };
      check();
    });
  }

  function findVideoItems() {
    // The app has video cards in a scrollable sidebar/list
    // Look for poster image containers that are clickable
    let items = [];

    // Try finding poster images with cursor-pointer
    const posters = document.querySelectorAll('img[src*="tmdb.org"]');
    posters.forEach((img) => {
      // Walk up to find the clickable container
      let el = img.parentElement;
      for (let i = 0; i < 5 && el; i++) {
        if (
          el.className &&
          (el.className.includes("cursor-pointer") ||
            el.className.includes("group") ||
            el.onclick !== null)
        ) {
          if (!items.includes(el)) {
            items.push(el);
          }
          break;
        }
        el = el.parentElement;
      }
    });

    // If that didn't work, try other selectors
    if (items.length === 0) {
      items = Array.from(
        document.querySelectorAll(
          '[class*="cursor-pointer"][class*="relative"][class*="overflow-hidden"]',
        ),
      );
    }

    if (items.length === 0) {
      items = Array.from(document.querySelectorAll('[class*="snap-center"]'));
    }

    // Filter to unique items and those that look like video cards
    const seen = new Set();
    items = items.filter((el) => {
      const key = el.innerHTML?.substring(0, 100);
      if (seen.has(key)) return false;
      seen.add(key);
      // Check if it has an image (poster)
      return el.querySelector("img") || el.tagName === "IMG";
    });

    return items;
  }

  function getCurrentIndex(items) {
    // Find the currently active/selected item by checking for visual indicators
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const classes = item.className || "";
      // Check for ring/border which indicates selection
      if (
        classes.includes("ring-2") ||
        classes.includes("ring-cyan") ||
        classes.includes("border-cyan") ||
        classes.includes("scale-105") ||
        classes.includes("border-2")
      ) {
        return i;
      }
    }
    return currentIndex;
  }

  function selectVideo(items, index) {
    if (index < 0 || index >= items.length) return false;

    const item = items[index];
    if (item) {
      currentIndex = index;

      // Scroll the item into view in its container
      item.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });

      // Simulate a click to select the video
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      item.dispatchEvent(clickEvent);

      console.log("[MovieShows] Selected video", index + 1, "of", items.length);
      return true;
    }
    return false;
  }

  function handleWheel(e) {
    // Don't intercept if inside a scrollable container that needs it
    const target = e.target;
    if (
      target.closest(
        '.overflow-y-auto, .overflow-x-auto, [class*="custom-scrollbar"]',
      )
    ) {
      return;
    }

    if (isScrolling) {
      e.preventDefault();
      return;
    }

    // Only trigger on significant scroll
    if (Math.abs(e.deltaY) < 20) return;

    const items = findVideoItems();
    if (items.length === 0) return;

    const current = getCurrentIndex(items);
    const direction = e.deltaY > 0 ? 1 : -1;
    const newIndex = Math.max(
      0,
      Math.min(items.length - 1, current + direction),
    );

    if (newIndex !== current) {
      e.preventDefault();
      isScrolling = true;
      selectVideo(items, newIndex);

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, SCROLL_COOLDOWN);
    }
  }

  function handleKeydown(e) {
    // Skip if user is typing in an input
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.tagName === "SELECT"
    )
      return;

    if (isScrolling) return;

    let direction = 0;
    if (e.key === "ArrowDown" || e.key === "j" || e.key === "J") {
      direction = 1;
    } else if (e.key === "ArrowUp" || e.key === "k" || e.key === "K") {
      direction = -1;
    } else if (e.key === "ArrowRight") {
      direction = 1;
    } else if (e.key === "ArrowLeft") {
      direction = -1;
    }

    if (direction === 0) return;

    const items = findVideoItems();
    if (items.length === 0) return;

    const current = getCurrentIndex(items);
    const newIndex = Math.max(
      0,
      Math.min(items.length - 1, current + direction),
    );

    if (newIndex !== current) {
      e.preventDefault();
      isScrolling = true;
      selectVideo(items, newIndex);

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, SCROLL_COOLDOWN);
    }
  }

  // Touch swipe support
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
    const touchDuration = Date.now() - touchStartTime;
    const deltaY = touchStartY - touchEndY;
    const deltaX = touchStartX - touchEndX;

    // Quick swipe detection (vertical or horizontal)
    const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX);
    const delta = isVerticalSwipe ? deltaY : deltaX;

    if (touchDuration < 400 && Math.abs(delta) > 50) {
      const items = findVideoItems();
      if (items.length === 0) return;

      const current = getCurrentIndex(items);
      const direction = delta > 0 ? 1 : -1;
      const newIndex = Math.max(
        0,
        Math.min(items.length - 1, current + direction),
      );

      if (newIndex !== current) {
        isScrolling = true;
        selectVideo(items, newIndex);

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          isScrolling = false;
        }, SCROLL_COOLDOWN);
      }
    }
  }

  async function init() {
    console.log("[MovieShows] Initializing scroll navigation...");

    const items = await waitForVideos();

    if (items.length === 0) {
      console.log("[MovieShows] No video items found, retrying in 2s...");
      setTimeout(init, 2000);
      return;
    }

    // Auto-select the first video on load if none is selected
    setTimeout(() => {
      const current = getCurrentIndex(items);
      if (current === 0) {
        console.log("[MovieShows] Auto-selecting first video...");
        selectVideo(items, 0);
      }
    }, 1000);

    // Add event listeners
    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    console.log("[MovieShows] Scroll navigation ready!");
    console.log(
      "[MovieShows] Controls: Mouse wheel, Arrow keys, J/K, or swipe",
    );
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    // Small delay to let React hydrate
    setTimeout(init, 1000);
  }
})();
