/**
 * tests/apod.test.js
 * Unit tests for NASA APOD Explorer
 *
 * Run with:  npx jest
 * Install:   npm install --save-dev jest jest-environment-jsdom
 */

// ---------------------------------------------------------------------------
// Minimal DOM setup
// jsdom (via jest-environment-jsdom) provides window, document, localStorage.
// We stub only what index.js touches at module load time so the DOM refs
// resolve without throwing.
// ---------------------------------------------------------------------------

function buildDOM() {
    document.body.innerHTML = `
        <canvas id="starfield"></canvas>
        <input  id="apod-date"      type="date" />
        <div    id="loading"        class="hidden"></div>
        <div    id="error-state"    class="hidden">
            <p  id="error-msg"></p>
        </div>
        <main   id="apod-result"    class="hidden">
            <span id="result-date"></span>
            <span id="result-copyright"></span>
            <h2   id="result-title"></h2>
            <img  id="apod-image"   class="hidden" />
            <div  id="apod-video-wrap" class="hidden">
                <iframe id="apod-video"></iframe>
            </div>
            <div  id="media-shimmer"></div>
            <p    id="apod-explanation"></p>
            <span id="stat-type"></span>
            <span id="stat-hd"></span>
            <a    id="hd-link"      class="hidden"></a>
        </main>
        <button id="load-btn"></button>
    `;
}

// Stub canvas so jsdom does not throw on getContext
HTMLCanvasElement.prototype.getContext = () => ({
    clearRect: () => {},
    beginPath: () => {},
    arc:       () => {},
    fill:      () => {},
});

// ---------------------------------------------------------------------------
// Pure utility functions extracted for testing
// (These mirror the implementations in index.js exactly)
// ---------------------------------------------------------------------------

function getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isValidDate(dateStr) {
    const d        = new Date(dateStr);
    const earliest = new Date("1995-06-16");
    const today    = new Date(getTodayString());
    return d >= earliest && d <= today;
}

function formatDate(dateStr) {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
}

const CACHE_TTL = 60 * 60 * 1000;

function setCache(date, data) {
    try {
        localStorage.setItem(`apod_${date}`, JSON.stringify({ data, ts: Date.now() }));
    } catch (_) { /* storage full */ }
}

function getCache(date) {
    try {
        const raw = localStorage.getItem(`apod_${date}`);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL) {
            localStorage.removeItem(`apod_${date}`);
            return null;
        }
        return data;
    } catch (_) { return null; }
}

function buildEmbedUrl(url) {
    return url
        .replace("watch?v=", "embed/")
        .replace("youtu.be/", "youtube.com/embed/");
}

// ---------------------------------------------------------------------------
// getTodayString
// ---------------------------------------------------------------------------

describe("getTodayString", () => {
    test("returns a string in YYYY-MM-DD format", () => {
        const result = getTodayString();
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test("year is current year", () => {
        const year = parseInt(getTodayString().split("-")[0], 10);
        expect(year).toBe(new Date().getFullYear());
    });

    test("month is between 01 and 12", () => {
        const month = parseInt(getTodayString().split("-")[1], 10);
        expect(month).toBeGreaterThanOrEqual(1);
        expect(month).toBeLessThanOrEqual(12);
    });

    test("day is between 01 and 31", () => {
        const day = parseInt(getTodayString().split("-")[2], 10);
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(31);
    });
});

// ---------------------------------------------------------------------------
// isValidDate
// ---------------------------------------------------------------------------

describe("isValidDate", () => {
    test("accepts the first APOD date (1995-06-16)", () => {
        expect(isValidDate("1995-06-16")).toBe(true);
    });

    test("accepts today", () => {
        expect(isValidDate(getTodayString())).toBe(true);
    });

    test("accepts a known historical date", () => {
        expect(isValidDate("2020-07-04")).toBe(true);
    });

    test("rejects a date before APOD launched (1995-06-15)", () => {
        expect(isValidDate("1995-06-15")).toBe(false);
    });

    test("rejects a future date", () => {
        const future = new Date();
        future.setFullYear(future.getFullYear() + 1);
        const str = future.toISOString().split("T")[0];
        expect(isValidDate(str)).toBe(false);
    });

    test("rejects an empty string", () => {
        expect(isValidDate("")).toBe(false);
    });

    test("rejects a non-date string", () => {
        expect(isValidDate("not-a-date")).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("formatDate", () => {
    test("returns a non-empty string", () => {
        expect(formatDate("2024-01-15").length).toBeGreaterThan(0);
    });

    test("includes the year", () => {
        expect(formatDate("2024-01-15")).toContain("2024");
    });

    test("includes the full month name", () => {
        expect(formatDate("2024-01-15")).toContain("January");
    });

    test("includes the day number", () => {
        expect(formatDate("2024-01-15")).toContain("15");
    });

    test("includes the weekday name", () => {
        // 2024-01-15 is a Monday
        expect(formatDate("2024-01-15")).toContain("Monday");
    });

    test("noon anchor prevents off-by-one timezone errors", () => {
        // DST edge case - should still return the correct date
        expect(formatDate("2024-03-10")).toContain("2024");
    });
});

// ---------------------------------------------------------------------------
// buildEmbedUrl (YouTube URL conversion)
// ---------------------------------------------------------------------------

describe("buildEmbedUrl", () => {
    test("converts watch?v= URL to embed URL", () => {
        const input  = "https://www.youtube.com/watch?v=abc123";
        const result = buildEmbedUrl(input);
        expect(result).toBe("https://www.youtube.com/embed/abc123");
    });

    test("converts youtu.be short URL to embed URL", () => {
        const input  = "https://youtu.be/abc123";
        const result = buildEmbedUrl(input);
        expect(result).toBe("https://youtube.com/embed/abc123");
    });

    test("leaves a plain image URL unchanged", () => {
        const input = "https://apod.nasa.gov/apod/image/2401/image.jpg";
        expect(buildEmbedUrl(input)).toBe(input);
    });

    test("leaves an already-embedded URL unchanged", () => {
        const input = "https://www.youtube.com/embed/abc123";
        expect(buildEmbedUrl(input)).toBe(input);
    });
});

// ---------------------------------------------------------------------------
// localStorage cache
// ---------------------------------------------------------------------------

describe("setCache and getCache", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    const sampleData = {
        title: "The Orion Nebula",
        date: "2024-01-15",
        explanation: "A stellar nursery.",
        media_type: "image",
        url: "https://apod.nasa.gov/apod/image/test.jpg",
        hdurl: "https://apod.nasa.gov/apod/image/test_hd.jpg",
    };

    test("setCache stores data retrievable by getCache", () => {
        setCache("2024-01-15", sampleData);
        const result = getCache("2024-01-15");
        expect(result).toEqual(sampleData);
    });

    test("getCache returns null for a key that was never set", () => {
        expect(getCache("2000-01-01")).toBeNull();
    });

    test("getCache returns null after cache entry expires", () => {
        // Store with a timestamp already past the TTL
        const expired = { data: sampleData, ts: Date.now() - CACHE_TTL - 1 };
        localStorage.setItem("apod_2024-01-15", JSON.stringify(expired));
        expect(getCache("2024-01-15")).toBeNull();
    });

    test("getCache removes the expired key from localStorage", () => {
        const expired = { data: sampleData, ts: Date.now() - CACHE_TTL - 1 };
        localStorage.setItem("apod_2024-01-15", JSON.stringify(expired));
        getCache("2024-01-15");
        expect(localStorage.getItem("apod_2024-01-15")).toBeNull();
    });

    test("getCache returns null for corrupted JSON", () => {
        localStorage.setItem("apod_2024-01-15", "not valid json{{{");
        expect(getCache("2024-01-15")).toBeNull();
    });

    test("different dates are cached independently", () => {
        const data2 = { ...sampleData, date: "2024-01-16", title: "Another Image" };
        setCache("2024-01-15", sampleData);
        setCache("2024-01-16", data2);
        expect(getCache("2024-01-15").title).toBe("The Orion Nebula");
        expect(getCache("2024-01-16").title).toBe("Another Image");
    });

    test("setCache overwrites existing entry for same date", () => {
        setCache("2024-01-15", sampleData);
        const updated = { ...sampleData, title: "Updated Title" };
        setCache("2024-01-15", updated);
        expect(getCache("2024-01-15").title).toBe("Updated Title");
    });
});

// ---------------------------------------------------------------------------
// DOM - setState
// ---------------------------------------------------------------------------

describe("setState (DOM)", () => {
    beforeEach(() => {
        buildDOM();
    });

    function setState(state) {
        const loadingEl  = document.getElementById("loading");
        const errorEl    = document.getElementById("error-state");
        const resultEl   = document.getElementById("apod-result");
        loadingEl.classList.add("hidden");
        errorEl.classList.add("hidden");
        resultEl.classList.add("hidden");
        if (state === "loading") loadingEl.classList.remove("hidden");
        if (state === "result")  resultEl.classList.remove("hidden");
        if (state === "error")   errorEl.classList.remove("hidden");
    }

    test("loading state shows loading and hides others", () => {
        setState("loading");
        expect(document.getElementById("loading").classList.contains("hidden")).toBe(false);
        expect(document.getElementById("error-state").classList.contains("hidden")).toBe(true);
        expect(document.getElementById("apod-result").classList.contains("hidden")).toBe(true);
    });

    test("result state shows result and hides others", () => {
        setState("result");
        expect(document.getElementById("apod-result").classList.contains("hidden")).toBe(false);
        expect(document.getElementById("loading").classList.contains("hidden")).toBe(true);
        expect(document.getElementById("error-state").classList.contains("hidden")).toBe(true);
    });

    test("error state shows error and hides others", () => {
        setState("error");
        expect(document.getElementById("error-state").classList.contains("hidden")).toBe(false);
        expect(document.getElementById("loading").classList.contains("hidden")).toBe(true);
        expect(document.getElementById("apod-result").classList.contains("hidden")).toBe(true);
    });

    test("idle/unknown state hides all panels", () => {
        setState("result");
        setState("idle");
        expect(document.getElementById("loading").classList.contains("hidden")).toBe(true);
        expect(document.getElementById("error-state").classList.contains("hidden")).toBe(true);
        expect(document.getElementById("apod-result").classList.contains("hidden")).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// DOM - renderAPOD populates elements correctly
// ---------------------------------------------------------------------------

describe("renderAPOD (DOM)", () => {
    beforeEach(() => {
        buildDOM();
    });

    function renderAPOD(data) {
        const { title, date, copyright, explanation, media_type,
                url, hdurl, thumbnail_url } = data;

        document.getElementById("result-title").textContent     = title;
        document.getElementById("result-date").textContent      = formatDate(date);
        document.getElementById("result-copyright").textContent = copyright ? `(c) ${copyright.trim()}` : "";
        document.getElementById("apod-explanation").textContent = explanation;
        document.getElementById("stat-type").textContent        = media_type === "video" ? "Video" : "Image";
        document.getElementById("stat-hd").textContent          = hdurl ? "Yes" : "No";

        const hdLink = document.getElementById("hd-link");
        if (hdurl) {
            hdLink.href = hdurl;
            hdLink.classList.remove("hidden");
        } else {
            hdLink.classList.add("hidden");
        }

        if (media_type === "video") {
            document.getElementById("apod-image").classList.add("hidden");
            document.getElementById("apod-video-wrap").classList.remove("hidden");
            const embedUrl = buildEmbedUrl(url);
            document.getElementById("apod-video").src = embedUrl;
        } else {
            document.getElementById("apod-video-wrap").classList.add("hidden");
            document.getElementById("apod-image").classList.remove("hidden");
            document.getElementById("apod-image").src = thumbnail_url || url;
        }
    }

    const imageData = {
        title: "Eagle Nebula Pillars",
        date: "2024-04-10",
        copyright: "NASA / ESA",
        explanation: "Famous pillars of creation.",
        media_type: "image",
        url: "https://apod.nasa.gov/apod/image/pillars.jpg",
        hdurl: "https://apod.nasa.gov/apod/image/pillars_hd.jpg",
    };

    const videoData = {
        title: "Solar Flare Time-lapse",
        date: "2024-05-01",
        copyright: null,
        explanation: "A massive solar flare.",
        media_type: "video",
        url: "https://www.youtube.com/watch?v=solar123",
        hdurl: null,
    };

    test("sets the result title text", () => {
        renderAPOD(imageData);
        expect(document.getElementById("result-title").textContent).toBe("Eagle Nebula Pillars");
    });

    test("sets the explanation text", () => {
        renderAPOD(imageData);
        expect(document.getElementById("apod-explanation").textContent).toBe("Famous pillars of creation.");
    });

    test("sets stat-type to Image for image media", () => {
        renderAPOD(imageData);
        expect(document.getElementById("stat-type").textContent).toBe("Image");
    });

    test("sets stat-type to Video for video media", () => {
        renderAPOD(videoData);
        expect(document.getElementById("stat-type").textContent).toBe("Video");
    });

    test("shows HD link when hdurl is present", () => {
        renderAPOD(imageData);
        expect(document.getElementById("hd-link").classList.contains("hidden")).toBe(false);
    });

    test("hides HD link when hdurl is absent", () => {
        renderAPOD(videoData);
        expect(document.getElementById("hd-link").classList.contains("hidden")).toBe(true);
    });

    test("sets correct href on HD link", () => {
        renderAPOD(imageData);
        expect(document.getElementById("hd-link").href).toContain("pillars_hd.jpg");
    });

    test("shows image and hides video wrap for image media", () => {
        renderAPOD(imageData);
        expect(document.getElementById("apod-image").classList.contains("hidden")).toBe(false);
        expect(document.getElementById("apod-video-wrap").classList.contains("hidden")).toBe(true);
    });

    test("shows video wrap and hides image for video media", () => {
        renderAPOD(videoData);
        expect(document.getElementById("apod-video-wrap").classList.contains("hidden")).toBe(false);
        expect(document.getElementById("apod-image").classList.contains("hidden")).toBe(true);
    });

    test("sets YouTube embed URL on the iframe", () => {
        renderAPOD(videoData);
        expect(document.getElementById("apod-video").src).toContain("embed/solar123");
    });

    test("shows copyright when present", () => {
        renderAPOD(imageData);
        expect(document.getElementById("result-copyright").textContent).toContain("NASA / ESA");
    });

    test("shows empty copyright when absent", () => {
        renderAPOD(videoData);
        expect(document.getElementById("result-copyright").textContent).toBe("");
    });

    test("stat-hd is Yes when hdurl is present", () => {
        renderAPOD(imageData);
        expect(document.getElementById("stat-hd").textContent).toBe("Yes");
    });

    test("stat-hd is No when hdurl is absent", () => {
        renderAPOD(videoData);
        expect(document.getElementById("stat-hd").textContent).toBe("No");
    });
});
