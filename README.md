
# MovieShows - Enhanced Video Streaming Platform

[Live Demo]([https://eltonaguiar.github.io/MOVIESHOWS2_CURSOR/](https://eltonaguiar.github.io/MOVIESHOWS3_ZED/))
## Known Issues

- **Scroll to next show**: Advancing to the next show in the queue does not always scroll the player into view as expected. This is a known bug and is being addressed.
- **CORS errors**: You may see CORS-related errors in the browser console (e.g., from doubleclick or YouTube ad resources). These are external and do not affect core app functionality.

A modern, feature-rich video streaming platform with an enhanced player, drag-and-drop queue management, and interactive browsing experience.

## Features

### 🎬 Large Video Player
- Full-width responsive video player with 16:9 aspect ratio
- Hover overlay with like and favorite controls
- Smooth transitions and modern UI

### ❤️ Like & Favorites System
- Like videos with a single click
- Save videos to favorites (temporarily stored in localStorage)
- Visual feedback for liked and favorited items
- Favorites counter in header

### 📋 Drag-and-Drop Queue Management
- Add videos to your queue from the browse panel
- Drag and drop to reorder queue items
- Visual feedback during dragging
- Play next video automatically when current video ends
- Remove items from queue easily

### 📚 Hideable Browse Panel
- Slide-out side panel for browsing content
- Search functionality to find specific movies/shows
- Filter by: All, Movies, TV Shows, Coming Soon
- Quick actions: Play, Like, Favorite, Add to Queue
- Responsive design for mobile devices

### 🎯 Additional Features
- Persistent state using localStorage
- Smooth animations and transitions
- Responsive design for all screen sizes
- Clean, modern UI with dark theme

## File Structure

```
MOVIESHOWS2/
├── index.html      # Main HTML structure
├── styles.css      # All styling and responsive design
├── script.js       # Application logic and interactivity
└── README.md       # This file
```

## Setup

1. Clone or download this repository
2. Open `index.html` in a web browser
3. No build process required - works directly in the browser

## Usage

### Playing Videos
- Click on any content item in the browse panel to play
- Or click the play button on a queue item

### Managing Queue
- Click the "➕" button on any content item to add to queue
- Drag queue items up/down to reorder
- Click "▶️" on a queue item to play it immediately
- Click "✕" to remove from queue

### Liking and Favoriting
- Click the "👍" button to like a video
- Click the "❤️" button to favorite a video
- Access favorites via the favorites button in the header

### Browsing Content
- Click "Browse" button to open the side panel
- Use search to find specific titles
- Use filters to narrow down content
- Click on any item to play or use action buttons

## Content Integration

### How Content is Loaded

The app automatically loads content from your scrapers via:

1. **Direct injection**: Set `window.MOVIESHOWS_CONTENT` before page load (array or object with `items`)
2. **JSON files**: Place your scraper output in any of these paths:
   - `./content.json`
   - `./data/content.json`
   - `./catalog.json`
   - (see `CONTENT_SOURCES` in `script.js` for full list)
3. **Query override**: Use `?source=/path/to/file.json` in URL

### Content Schema

Your scraper JSON should output an array (or object with `items`/`movies`/`tv` arrays):

```javascript
[
    {
        id: "unique-id",              // or tmdb_id, imdb_id, etc.
        title: "Movie Title",         // or name, primaryTitle
        type: "movies",               // or "tv", "movie", "show", "series"
        year: 2025,                   // or release_year, releaseYear
        thumbnail: "url-to-image",    // or poster, posterUrl, backdrop
        videoUrl: "url-to-video",     // or video_url, stream, trailerUrl
        description: "Plot summary",  // or overview, plot, summary
        comingSoon: false             // or coming_soon, upcoming
    }
]
```

**The app auto-normalizes** different field names from TMDB, IMDb, JustWatch, etc.

### Styling

All styles are in `styles.css`. Key CSS variables for easy theming:

```css
:root {
    --primary-color: #1a1a1a;
    --secondary-color: #2a2a2a;
    --accent-color: #e50914;
    --text-primary: #ffffff;
    --text-secondary: #b3b3b3;
}
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Future Enhancements

- Integration with video API (TMDB, etc.)
- User accounts and cloud storage
- Video quality selection
- Subtitles support
- Playback speed control
- Watch history

## License

This project is open source and available for use.

## Credits

Built with modern web technologies:
- Vanilla JavaScript (ES6+)
- CSS3 with Flexbox and Grid
- HTML5 Video API
- LocalStorage API
