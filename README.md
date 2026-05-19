# NASA APOD Explorer

> **Project #38** from [100 JavaScript Projects](https://github.com/pradipchaudhary/100-js-projects) by [@pradipchaudhary](https://github.com/pradipchaudhary)

Explore NASA's **Astronomy Picture of the Day**. Every day since June 16, 1995, NASA has published one stunning image of our cosmos alongside a professional astronomer's explanation. This project lets you browse any date, get surprised by a random entry, and view high-definition versions of every image.

---

## Preview

![NASA APOD Explorer Screenshot](screenshot.png)

> *Pick any date between June 16, 1995 and today. Results are cached locally so repeat visits are instant.*

---

## Features

| Feature | Details |
|---|---|
| Date picker | Browse any APOD from 1995-06-16 to today |
| Random mode | "Surprise me" fetches a random entry |
| Video support | YouTube/Vimeo embeds render inline |
| HD viewer | Click any image or use the HD link to open full resolution |
| Local caching | Results cached in `localStorage` for 1 hour, no repeat API calls |
| Error handling | Friendly messages for invalid dates, rate limits, and network failures |
| Animated starfield | Canvas-based twinkling star background |
| Responsive | Works on mobile, tablet, and desktop |
| Unit tested | 30+ tests covering all utility functions and DOM behavior |

---

## JavaScript Concepts Covered

This project is a great exercise for the following concepts:

- **Fetch API and `async/await`** - calling NASA's REST API and handling the response
- **DOM Manipulation** - dynamically inserting image, video, title, and explanation
- **Error Handling** - `try/catch`, HTTP status checks, and user-facing error states
- **Date Handling** - validating ranges, formatting, and working with local vs. UTC time
- **`localStorage` caching** - storing API responses with a TTL to avoid rate limiting
- **Canvas API** - procedural starfield animation using `requestAnimationFrame`
- **Event Handling** - button clicks, keyboard shortcuts (`Enter` to load), and `onload`/`onerror` on images
- **Unit Testing** - Jest test suite covering pure functions and DOM behavior with jsdom

---

## Tech Stack

| Technology | Role |
|---|---|
| HTML5 | Semantic structure and layout |
| CSS3 | Custom properties, grid, animations, responsive design |
| Vanilla JavaScript (ES6+) | All app logic, no frameworks |
| [NASA APOD API](https://api.nasa.gov) | Source of all astronomy data |
| Google Fonts | `Syne` (headings) + `Space Mono` (body/mono) |
| Jest + jsdom | Unit testing |

---

## Project Structure

```
nasa-apod-explorer/
├── index.html          # App markup
├── style.css           # All styling (pink/purple space theme)
├── index.js            # App logic: fetch, render, cache, starfield
├── tests/
│   └── apod.test.js    # Unit tests (Jest + jsdom)
├── package.json        # Dev dependencies (jest, jest-environment-jsdom)
└── README.md           # This file
```

---

## Running the Tests

### Install dependencies

```bash
npm install
```

### Run the test suite

```bash
npx jest
```

### Run with coverage report

```bash
npx jest --coverage
```

### Expected output

```
PASS tests/apod.test.js
  getTodayString
    - returns a string in YYYY-MM-DD format
    - year is current year
    - month is between 01 and 12
    - day is between 01 and 31
  isValidDate
    - accepts the first APOD date (1995-06-16)
    - accepts today
    - accepts a known historical date
    - rejects a date before APOD launched (1995-06-15)
    - rejects a future date
    - rejects an empty string
    - rejects a non-date string
  formatDate
    - returns a non-empty string
    - includes the year
    - includes the full month name
    - includes the day number
    - includes the weekday name
    - noon anchor prevents off-by-one timezone errors
  buildEmbedUrl
    - converts watch?v= URL to embed URL
    - converts youtu.be short URL to embed URL
    - leaves a plain image URL unchanged
    - leaves an already-embedded URL unchanged
  setCache and getCache
    - setCache stores data retrievable by getCache
    - getCache returns null for a key that was never set
    - getCache returns null after cache entry expires
    - getCache removes the expired key from localStorage
    - getCache returns null for corrupted JSON
    - different dates are cached independently
    - setCache overwrites existing entry for same date
  setState (DOM)
    - loading state shows loading and hides others
    - result state shows result and hides others
    - error state shows error and hides others
    - idle/unknown state hides all panels
  renderAPOD (DOM)
    - sets the result title text
    - sets the explanation text
    - sets stat-type to Image for image media
    - sets stat-type to Video for video media
    - shows HD link when hdurl is present
    - hides HD link when hdurl is absent
    - sets correct href on HD link
    - shows image and hides video wrap for image media
    - shows video wrap and hides image for video media
    - sets YouTube embed URL on the iframe
    - shows copyright when present
    - shows empty copyright when absent
    - stat-hd is Yes when hdurl is present
    - stat-hd is No when hdurl is absent

Tests: 43 passed, 43 total
```

---

## What the Tests Cover

| Group | What is tested |
|---|---|
| `getTodayString` | Format, year, month range, day range |
| `isValidDate` | Boundary dates, future dates, empty/invalid input |
| `formatDate` | Year, month name, day, weekday, timezone safety |
| `buildEmbedUrl` | YouTube watch URL, youtu.be short URL, non-YouTube URLs |
| `setCache / getCache` | Round-trip storage, missing keys, TTL expiry, key removal, corrupt JSON, independent keys, overwrite |
| `setState` | All four states (loading, result, error, idle) show/hide correct panels |
| `renderAPOD` | Title, explanation, copyright, stat cards, HD link visibility and href, image vs. video media switching, embed URL conversion |

---

---

## Setup and Usage

**No build step. No dependencies. Just open it.**

```bash
# Clone the full 100-projects repo
git clone https://github.com/pradipchaudhary/100-js-projects.git

# Navigate to this project
cd 100-js-projects/XX-nasa-apod-explorer

# Open in browser
open index.html
# or just double-click index.html
```

### Get Your Own API Key (Recommended)

The app ships with NASA's `DEMO_KEY`, which is rate-limited to **30 requests/hour** per IP. For unrestricted access:

1. Visit [https://api.nasa.gov](https://api.nasa.gov) and click **Generate API Key** (free, instant)
2. Open `index.js` and replace line 12:
   ```js
   // Before
   const API_KEY = "DEMO_KEY";

   // After
   const API_KEY = "YOUR_KEY_HERE";
   ```

---

## API Reference

This project uses NASA's free **APOD API**:

```
GET https://api.nasa.gov/planetary/apod
```

| Parameter | Type | Description |
|---|---|---|
| `api_key` | string | Your NASA API key (or `DEMO_KEY`) |
| `date` | string | `YYYY-MM-DD` - specific date to fetch |
| `count` | number | Returns N random entries (used for "Surprise me") |
| `thumbs` | boolean | Returns video thumbnail URLs when available |

**Example response:**
```json
{
  "date": "2024-03-15",
  "title": "The Milky Way Over the Alps",
  "explanation": "What's happening in the sky? ...",
  "url": "https://apod.nasa.gov/apod/image/...",
  "hdurl": "https://apod.nasa.gov/apod/image/...hd.jpg",
  "media_type": "image",
  "copyright": "Photographer Name"
}
```

## Contributing

This project is part of [@pradipchaudhary](https://github.com/pradipchaudhary)'s [100 JavaScript Projects](https://github.com/pradipchaudhary/100-js-projects) repository.

---

## License

MIT License, free to use, modify, and distribute. See the [LICENSE](https://github.com/pradipchaudhary/100-js-projects/blob/main/LICENSE) file.

---

## Acknowledgements

- **[NASA Open APIs](https://api.nasa.gov)** - for making astronomy data free and accessible
- **[@pradipchaudhary](https://github.com/pradipchaudhary)** - for curating the [100 JS Projects](https://github.com/pradipchaudhary/100-js-projects) collection that inspired this build

---

<div align="center">

**[Star the repo](https://github.com/pradipchaudhary/100-js-projects)** · **[Fork it](https://github.com/pradipchaudhary/100-js-projects/fork)** · **[Report a bug](https://github.com/pradipchaudhary/100-js-projects/issues)**

*Part of [100 JavaScript Projects](https://github.com/pradipchaudhary/100-js-projects) - build real things, learn real skills.*

</div>
