// Config
// Using NASA's DEMO_KEY (rate-limited). Replace with your own from https://api.nasa.gov
const API_KEY   = "DEMO_KEY";
const BASE_URL  = "https://api.nasa.gov/planetary/apod";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

// Starfield
(function initStarfield() {
    const canvas = document.getElementById("starfield");
    const ctx    = canvas.getContext("2d");
    let stars    = [];

    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        buildStars();
    }

    const starColors = [
        [253, 240, 255],
        [232, 125, 212],
        [181, 123, 238],
        [240, 168, 224],
        [220, 200, 255],
    ];

    function buildStars() {
        stars = Array.from({ length: 220 }, () => ({
            x:     Math.random() * canvas.width,
            y:     Math.random() * canvas.height,
            r:     Math.random() * 1.4 + 0.2,
            alpha: Math.random(),
            speed: Math.random() * 0.008 + 0.002,
            phase: Math.random() * Math.PI * 2,
            color: starColors[Math.floor(Math.random() * starColors.length)],
        }));
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const t = performance.now() / 1000;
        for (const s of stars) {
            const a = 0.3 + 0.7 * Math.abs(Math.sin(t * s.speed + s.phase));
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${a})`;
            ctx.fill();
        }
        requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    resize();
    draw();
})();

// DOM refs
const loadBtn        = document.getElementById("load-btn");
const loadingEl      = document.getElementById("loading");
const errorState     = document.getElementById("error-state");
const errorMsg       = document.getElementById("error-msg");
const apodResult     = document.getElementById("apod-result");
const apodImg        = document.getElementById("apod-image");
const apodVideoWrap  = document.getElementById("apod-video-wrap");
const apodVideo      = document.getElementById("apod-video");
const apodExplain    = document.getElementById("apod-explanation");
const resultTitle    = document.getElementById("result-title");
const resultDate     = document.getElementById("result-date");
const resultCopyright= document.getElementById("result-copyright");
const statType       = document.getElementById("stat-type");
const statHd         = document.getElementById("stat-hd");
const hdLink         = document.getElementById("hd-link");
const mediaShimmer   = document.getElementById("media-shimmer");
const dateInput      = document.getElementById("apod-date");

// Set default date to today
dateInput.value = getTodayString();

// Load APOD
async function loadAPOD() {
    const date = dateInput.value || getTodayString();

    // Validate date
    if (!isValidDate(date)) {
        showError("Please select a valid date between Jun 16, 1995 and today.");
        return;
    }

    // Check cache
    const cached = getCache(date);
    if (cached) {
        renderAPOD(cached);
        return;
    }

    setState("loading");

    try {
        const url      = `${BASE_URL}?api_key=${API_KEY}&date=${date}&thumbs=true`;
        const response = await fetch(url);

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.msg || `HTTP ${response.status}`);
        }

        const data = await response.json();
        setCache(date, data);
        renderAPOD(data);

    } catch (err) {
        showError(`Failed to load APOD: ${err.message}`);
    }
}

// Load Random
async function loadRandom() {
    setState("loading");

    try {
        const url      = `${BASE_URL}?api_key=${API_KEY}&count=1&thumbs=true`;
        const response = await fetch(url);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const [data] = await response.json();
        dateInput.value = data.date;
        setCache(data.date, data);
        renderAPOD(data);

    } catch (err) {
        showError(`Failed to load random APOD: ${err.message}`);
    }
}

// Render
function renderAPOD(data) {
    const { title, date, copyright, explanation, media_type,
            url, hdurl, thumbnail_url } = data;

    // Header info
    resultTitle.textContent     = title;
    resultDate.textContent      = formatDate(date);
    resultCopyright.textContent = copyright ? `© ${copyright.trim()}` : "";
    apodExplain.textContent     = explanation;

    // Stats
    statType.textContent = media_type === "video" ? "Video" : "Image";
    statHd.textContent   = hdurl ? "Yes" : "No";

    // HD link
    if (hdurl) {
        hdLink.href = hdurl;
        hdLink.classList.remove("hidden");
    } else {
        hdLink.classList.add("hidden");
    }

    // Media
    mediaShimmer.classList.add("active");

    if (media_type === "video") {
        apodImg.classList.add("hidden");
        apodVideoWrap.classList.remove("hidden");

        // Convert YouTube watch URL to embed URL if needed
        const embedUrl = url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/");
        apodVideo.src = embedUrl;
        mediaShimmer.classList.remove("active");

    } else {
        apodVideoWrap.classList.add("hidden");
        apodImg.classList.remove("hidden");

        const imgSrc = thumbnail_url || url;
        apodImg.onload  = () => mediaShimmer.classList.remove("active");
        apodImg.onerror = () => {
            mediaShimmer.classList.remove("active");
            apodImg.alt = "Image could not be loaded.";
        };
        apodImg.src = imgSrc;

        // Click-to-HD
        if (hdurl) {
            apodImg.onclick = () => window.open(hdurl, "_blank");
        }
    }

    setState("result");
}

// State machine
function setState(state) {
    loadingEl.classList.add("hidden");
    errorState.classList.add("hidden");
    apodResult.classList.add("hidden");

    if (state === "loading") loadingEl.classList.remove("hidden");
    if (state === "result")  apodResult.classList.remove("hidden");
    if (state === "error")   errorState.classList.remove("hidden");
}

function showError(msg) {
    errorMsg.textContent = msg;
    setState("error");
}

function clearError() {
    setState("idle");
}

// Cache (localStorage)
function setCache(date, data) {
    try {
        localStorage.setItem(`apod_${date}`, JSON.stringify({ data, ts: Date.now() }));
    } catch (_) { /* Storage full - skip */ }
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

// Date utilities
function getTodayString() {
    // Returns YYYY-MM-DD in local time (not UTC)
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isValidDate(dateStr) {
    const d      = new Date(dateStr);
    const earliest = new Date("1995-06-16");
    const today    = new Date(getTodayString());
    return d >= earliest && d <= today;
}

function formatDate(dateStr) {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
}

// Keyboard shortcut: Enter = Load
dateInput.addEventListener("keydown", e => {
    if (e.key === "Enter") loadAPOD();
});

// Auto-load today's APOD on page load
window.addEventListener("DOMContentLoaded", () => {
    loadAPOD();
});
