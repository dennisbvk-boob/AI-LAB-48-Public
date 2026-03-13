(function () {
  "use strict";

  const cars = Array.isArray(window.evData) ? window.evData : [];
  const carById = new Map(cars.map((car) => [car.id, car]));
  const template = document.getElementById("carCardTemplate");
  const DETAIL_HASH_PREFIX = "#car/";

  const elements = {
    searchInput: document.getElementById("searchInput"),
    bodyTypeSelect: document.getElementById("bodyTypeSelect"),
    sourceSelect: document.getElementById("sourceSelect"),
    maxPriceInput: document.getElementById("maxPriceInput"),
    minRangeInput: document.getElementById("minRangeInput"),
    sortSelect: document.getElementById("sortSelect"),
    maxPriceValue: document.getElementById("maxPriceValue"),
    minRangeValue: document.getElementById("minRangeValue"),
    resultsGrid: document.getElementById("resultsGrid"),
    resultsSummary: document.getElementById("resultsSummary"),
    valueWeightInput: document.getElementById("valueWeightInput"),
    rangeWeightInput: document.getElementById("rangeWeightInput"),
    performanceWeightInput: document.getElementById("performanceWeightInput"),
    practicalityWeightInput: document.getElementById("practicalityWeightInput"),
    comfortWeightInput: document.getElementById("comfortWeightInput"),
    valueWeightValue: document.getElementById("valueWeightValue"),
    rangeWeightValue: document.getElementById("rangeWeightValue"),
    performanceWeightValue: document.getElementById("performanceWeightValue"),
    practicalityWeightValue: document.getElementById("practicalityWeightValue"),
    comfortWeightValue: document.getElementById("comfortWeightValue"),
    resetWeightsButton: document.getElementById("resetWeightsButton"),
    statCarCount: document.getElementById("statCarCount"),
    statSourceCount: document.getElementById("statSourceCount"),
    statBrandCount: document.getElementById("statBrandCount"),
    detailModal: document.getElementById("carDetailModal"),
    detailBackdrop: document.getElementById("carDetailBackdrop"),
    detailBackButton: document.getElementById("detailBackButton"),
    detailCloseButton: document.getElementById("detailCloseButton"),
    detailBrand: document.getElementById("detailBrand"),
    detailTitle: document.getElementById("detailTitle"),
    detailMatchScore: document.getElementById("detailMatchScore"),
    detailScoreCopy: document.getElementById("detailScoreCopy"),
    detailSpecs: document.getElementById("detailSpecs"),
    detailBreakdown: document.getElementById("detailBreakdown"),
    detailPros: document.getElementById("detailPros"),
    detailCons: document.getElementById("detailCons"),
    detailSources: document.getElementById("detailSources"),
    evNewsTrack: document.getElementById("evNewsTrack"),
    evNewsStatus: document.getElementById("evNewsStatus")
  };

  const defaultWeights = {
    value: 7,
    range: 8,
    performance: 6,
    practicality: 7,
    comfort: 5
  };

  const fallbackScoreDetails = Object.freeze({
    finalScore: 0.5,
    valueForMoneyScore: 0.5,
    rangeScore: 0.5,
    performanceScore: 0.5,
    practicalityScore: 0.5,
    comfortScore: 0.5,
    expertScoreNormalized: 0.5
  });

  const fallbackCarImage = "./assets/car-placeholder.svg";
  const rssToJsonApiBase = "https://api.rss2json.com/v1/api.json?rss_url=";
  const newsRefreshIntervalMs = 30 * 60 * 1000;
  const newsItemsPerSource = 4;
  const evNewsSources = Object.freeze([
    {
      name: "InsideEVs",
      slug: "insideevs",
      icon: "IE",
      feedUrls: ["https://insideevs.com/feed/"]
    },
    {
      name: "Electrek",
      slug: "electrek",
      icon: "EL",
      feedUrls: ["https://electrek.co/feed/"]
    },
    {
      name: "Move Electric",
      slug: "move-electric",
      icon: "ME",
      feedUrls: [
        "https://www.moveelectric.com/feed",
        "https://www.moveelectric.com/rss.xml"
      ]
    }
  ]);
  const wikipediaSearchApi = "https://en.wikipedia.org/w/api.php";
  const imageCacheStoragePrefix = "ev-verdict-car-image-v1:";
  const shouldResolveWikipediaImages = cars.length <= 180;
  const modelNoiseTokens = new Set([
    "long",
    "range",
    "single",
    "dual",
    "motor",
    "extended",
    "performance",
    "quattro",
    "plus",
    "pro",
    "design",
    "comfort",
    "suv",
    "sedan",
    "estate",
    "hatchback",
    "crossover",
    "coupe",
    "coupe",
    "kwh",
    "awd",
    "rwd",
    "4matic",
    "xdrive50",
    "edrive40",
    "electric",
    "ev"
  ]);
  const carImageSources = {
    "tesla-model-3-highland":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/15-05-23-Berlin-Sachsendamm-Tesla-RalfR-N3S_7354.jpg/960px-15-05-23-Berlin-Sachsendamm-Tesla-RalfR-N3S_7354.jpg",
    "tesla-model-y":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Tesla_Model_Y_L_002.jpg/960px-Tesla_Model_Y_L_002.jpg",
    "hyundai-ioniq-5":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Hyundai_IONIQ_5_N_eN1_Cup_Car_%285%29.jpg/960px-Hyundai_IONIQ_5_N_eN1_Cup_Car_%285%29.jpg",
    "kia-ev6":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Kia_EV6_Auto_Zuerich_2021_IMG_0606.jpg/960px-Kia_EV6_Auto_Zuerich_2021_IMG_0606.jpg",
    "bmw-i4-edrive40":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/BMW_i4_Official_Car_of_MotoGP_IAA_2021_1X7A0003.jpg/960px-BMW_i4_Official_Car_of_MotoGP_IAA_2021_1X7A0003.jpg",
    "vw-id7-pro":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Volkswagen_ID.7_Auto_Zuerich_2023_1X7A1002.jpg/960px-Volkswagen_ID.7_Auto_Zuerich_2023_1X7A1002.jpg",
    "volvo-ex30":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Volvo_EX30_Auto_Zuerich_2023_1X7A0949.jpg/960px-Volvo_EX30_Auto_Zuerich_2023_1X7A0949.jpg",
    "skoda-enyaq-85":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/%C5%A0koda_Enyaq_IMG_1190_%28cropped%29.jpg/960px-%C5%A0koda_Enyaq_IMG_1190_%28cropped%29.jpg",
    "mg4-long-range":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/MG4_EV_Automesse_Ludwigsburg_2022_1X7A5920.jpg/960px-MG4_EV_Automesse_Ludwigsburg_2022_1X7A5920.jpg",
    "polestar-2-long-range":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Polestar_2_BST_Edition_230_Auto_Zuerich_2023_1X7A1303.jpg/960px-Polestar_2_BST_Edition_230_Auto_Zuerich_2023_1X7A1303.jpg",
    "renault-scenic-etec":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Renault_Sc%C3%A9nic_Vision_01.png/960px-Renault_Sc%C3%A9nic_Vision_01.png",
    "mercedes-eqe-suv":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Mercedes-AMG_EQE_SUV_43_%28X294%29_Auto_Zuerich_2023_1X7A0976.jpg/960px-Mercedes-AMG_EQE_SUV_43_%28X294%29_Auto_Zuerich_2023_1X7A0976.jpg",
    "byd-seal":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/BYD_Seal_007.jpg/960px-BYD_Seal_007.jpg",
    "nissan-ariya":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Nissan_Ariya_Nismo%2C_Auto_2024%2C_Zurich_%28PANA1011%29.jpg/960px-Nissan_Ariya_Nismo%2C_Auto_2024%2C_Zurich_%28PANA1011%29.jpg"
  };
  const resolvedCarImageSources = new Map(Object.entries(carImageSources));
  const pendingCarImageRequests = new Map();

  const state = {
    search: "",
    bodyType: "all",
    source: "all",
    sortBy: "best-match",
    maxPrice: 0,
    minRange: 0,
    weights: { ...defaultWeights },
    activeCarId: null,
    triggerElement: null,
    scoreMap: new Map(),
    newsRefreshTimer: null
  };

  const marketAverages = {
    price: average(cars.map((car) => car.priceEur)),
    range: average(cars.map((car) => car.rangeKm))
  };

  // ── Formatters ──────────────────────────────────────────

  function formatCurrency(value) {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(value);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(value);
  }

  function formatRelativeTime(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Recently";

    const elapsedMs = date.getTime() - Date.now();
    const elapsedSeconds = Math.round(elapsedMs / 1000);
    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const ranges = [
      { unit: "year", seconds: 31536000 },
      { unit: "month", seconds: 2592000 },
      { unit: "week", seconds: 604800 },
      { unit: "day", seconds: 86400 },
      { unit: "hour", seconds: 3600 },
      { unit: "minute", seconds: 60 }
    ];

    for (const { unit, seconds } of ranges) {
      if (Math.abs(elapsedSeconds) >= seconds || unit === "minute") {
        return formatter.format(Math.round(elapsedSeconds / seconds), unit);
      }
    }

    return "Just now";
  }

  function truncateText(value, maxLength) {
    const clean = String(value ?? "").trim();
    if (clean.length <= maxLength) return clean;
    return `${clean.slice(0, Math.max(maxLength - 3, 0)).trimEnd()}...`;
  }

  function stripHtml(value) {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(String(value ?? ""), "text/html");
    return htmlDoc.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
  }

  function formatNewsUpdatedAt() {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date());
  }

  // ── Math helpers ────────────────────────────────────────

  function average(values) {
    if (!values.length) return 0;
    return values.reduce((total, value) => total + value, 0) / values.length;
  }

  // ── EV news feed ────────────────────────────────────────

  function createNewsSkeletonCard() {
    const card = document.createElement("article");
    card.className = "ev-news-card skeleton-card";
    card.setAttribute("aria-hidden", "true");

    const head = document.createElement("div");
    head.className = "ev-news-card-head";
    const sourceLine = document.createElement("div");
    sourceLine.className = "ev-news-skeleton-line ev-news-skeleton-line--short skeleton";
    const timeLine = document.createElement("div");
    timeLine.className = "ev-news-skeleton-line ev-news-skeleton-line--short skeleton";
    head.append(sourceLine, timeLine);

    const titleA = document.createElement("div");
    titleA.className = "ev-news-skeleton-line ev-news-skeleton-line--full skeleton";
    const titleB = document.createElement("div");
    titleB.className = "ev-news-skeleton-line ev-news-skeleton-line--medium skeleton";
    const excerptA = document.createElement("div");
    excerptA.className = "ev-news-skeleton-line ev-news-skeleton-line--full skeleton";
    const excerptB = document.createElement("div");
    excerptB.className = "ev-news-skeleton-line ev-news-skeleton-line--medium skeleton";

    card.append(head, titleA, titleB, excerptA, excerptB);
    return card;
  }

  function renderNewsSkeleton() {
    if (!elements.evNewsTrack) return;
    elements.evNewsTrack.innerHTML = "";
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 6; index += 1) {
      fragment.append(createNewsSkeletonCard());
    }
    elements.evNewsTrack.append(fragment);
  }

  function buildNewsCard(item) {
    const card = document.createElement("a");
    card.className = "ev-news-card";
    card.href = item.url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.setAttribute("role", "listitem");
    card.setAttribute("aria-label", `Open EV news: ${item.title}`);

    const head = document.createElement("div");
    head.className = "ev-news-card-head";

    const source = document.createElement("p");
    source.className = "ev-news-source";
    const icon = document.createElement("span");
    icon.className = `ev-news-icon ev-news-icon--${item.sourceSlug}`;
    icon.textContent = item.sourceIcon;
    const sourceName = document.createElement("span");
    sourceName.textContent = item.sourceName;
    source.append(icon, sourceName);

    const time = document.createElement("time");
    time.className = "ev-news-time";
    time.dateTime = item.publishedIso;
    time.textContent = formatRelativeTime(item.publishedIso);

    const title = document.createElement("h3");
    title.className = "ev-news-title";
    title.textContent = item.title;

    const excerpt = document.createElement("p");
    excerpt.className = "ev-news-excerpt";
    excerpt.textContent = item.excerpt;

    head.append(source, time);
    card.append(head, title, excerpt);
    return card;
  }

  function renderNewsFallback(message) {
    if (!elements.evNewsTrack) return;
    elements.evNewsTrack.innerHTML = "";
    const fallback = document.createElement("article");
    fallback.className = "ev-news-card ev-news-empty";
    fallback.setAttribute("role", "listitem");

    const title = document.createElement("h3");
    title.className = "ev-news-title";
    title.textContent = message;

    fallback.append(title);
    elements.evNewsTrack.append(fallback);
  }

  function normalizeNewsItem(item, source) {
    const publishedAt = new Date(item.pubDate || item.isoDate || Date.now());
    const excerptRaw = stripHtml(item.description || item.content || item.title || "");
    return {
      sourceName: source.name,
      sourceSlug: source.slug,
      sourceIcon: source.icon,
      title: truncateText(stripHtml(item.title || "Untitled article"), 140),
      excerpt: truncateText(excerptRaw, 120),
      url: item.link,
      publishedIso: Number.isNaN(publishedAt.getTime())
        ? new Date().toISOString()
        : publishedAt.toISOString()
    };
  }

  async function fetchNewsSource(source) {
    const urlsToTry = Array.isArray(source.feedUrls) ? source.feedUrls : [];
    let lastError = null;

    for (const feedUrl of urlsToTry) {
      const endpoint = `${rssToJsonApiBase}${encodeURIComponent(feedUrl)}`;
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`${source.name} failed (${response.status})`);
        }

        const payload = await response.json();
        const items = Array.isArray(payload.items) ? payload.items : [];
        const normalizedItems = items
          .filter((item) => item?.link && item?.title)
          .slice(0, newsItemsPerSource)
          .map((item) => normalizeNewsItem(item, source));

        if (normalizedItems.length) {
          return normalizedItems;
        }
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error(`${source.name} feed is unavailable.`);
  }

  async function loadEvNews() {
    if (!elements.evNewsTrack) return;

    renderNewsSkeleton();
    if (elements.evNewsStatus) {
      elements.evNewsStatus.textContent = "Loading latest headlines...";
    }

    const responses = await Promise.allSettled(evNewsSources.map(fetchNewsSource));
    const loadedItems = [];
    let successfulSources = 0;

    responses.forEach((response) => {
      if (response.status === "fulfilled") {
        successfulSources += 1;
        loadedItems.push(...response.value);
      }
    });

    loadedItems.sort(
      (left, right) => new Date(right.publishedIso).getTime() - new Date(left.publishedIso).getTime()
    );

    if (!loadedItems.length) {
      renderNewsFallback("No EV headlines available right now. Please try again later.");
      if (elements.evNewsStatus) {
        elements.evNewsStatus.textContent = "All feeds unavailable";
      }
      return;
    }

    elements.evNewsTrack.innerHTML = "";
    const fragment = document.createDocumentFragment();
    loadedItems.forEach((item) => {
      fragment.append(buildNewsCard(item));
    });
    elements.evNewsTrack.append(fragment);

    if (elements.evNewsStatus) {
      const sourceLabel =
        successfulSources === evNewsSources.length
          ? "All sources live"
          : `${successfulSources}/${evNewsSources.length} sources live`;
      elements.evNewsStatus.textContent = `Updated ${formatNewsUpdatedAt()} · ${sourceLabel}`;
    }
  }

  function initializeEvNews() {
    if (!elements.evNewsTrack) return;

    loadEvNews();
    if (state.newsRefreshTimer) {
      window.clearInterval(state.newsRefreshTimer);
    }
    state.newsRefreshTimer = window.setInterval(loadEvNews, newsRefreshIntervalMs);
  }

  function normalize(value, min, max) {
    if (max === min) return 0.5;
    return (value - min) / (max - min);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getRange(values) {
    return { min: Math.min(...values), max: Math.max(...values) };
  }

  // ── Hash helpers ────────────────────────────────────────

  function createCarHash(carId) {
    return `${DETAIL_HASH_PREFIX}${encodeURIComponent(carId)}`;
  }

  function isDetailHash(hash = window.location.hash) {
    return hash.startsWith(DETAIL_HASH_PREFIX);
  }

  function getCarIdFromHash() {
    if (!isDetailHash()) return null;
    return decodeURIComponent(window.location.hash.slice(DETAIL_HASH_PREFIX.length));
  }

  function clearDetailHash() {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  // ── Populate selects ────────────────────────────────────

  function getAllBodyTypes() {
    return [...new Set(cars.map((car) => car.bodyType))].sort((a, b) =>
      a.localeCompare(b)
    );
  }

  function getAllSources() {
    const allSourceNames = [];
    cars.forEach((car) => {
      car.sources.forEach((entry) => allSourceNames.push(entry.source));
    });
    return [...new Set(allSourceNames)].sort((a, b) => a.localeCompare(b));
  }

  function setupSelectOptions() {
    getAllBodyTypes().forEach((type) => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      elements.bodyTypeSelect.append(option);
    });

    getAllSources().forEach((source) => {
      const option = document.createElement("option");
      option.value = source;
      option.textContent = source;
      elements.sourceSelect.append(option);
    });
  }

  // ── Range inputs ────────────────────────────────────────

  function setupRangeInputs() {
    const prices = cars.map((car) => car.priceEur);
    const ranges = cars.map((car) => car.rangeKm);
    const priceRange = getRange(prices);
    const kmRange = getRange(ranges);

    elements.maxPriceInput.min = String(priceRange.min);
    elements.maxPriceInput.max = String(priceRange.max);
    elements.maxPriceInput.step = "500";

    elements.minRangeInput.min = String(kmRange.min);
    elements.minRangeInput.max = String(kmRange.max);
    elements.minRangeInput.step = "5";

    state.maxPrice = priceRange.max;
    state.minRange = kmRange.min;
    elements.maxPriceInput.value = String(state.maxPrice);
    elements.minRangeInput.value = String(state.minRange);
  }

  function updateRangeTrack(input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const val = Number(input.value);
    const pct = ((val - min) / (max - min)) * 100;
    input.style.background = `linear-gradient(to right, var(--cyan) 0%, var(--purple) ${pct}%, rgba(99,179,237,0.15) ${pct}%)`;
  }

  function updateFilterLabelValues() {
    elements.maxPriceValue.textContent = formatCurrency(state.maxPrice);
    elements.minRangeValue.textContent = `${formatNumber(state.minRange)} km`;
    updateRangeTrack(elements.maxPriceInput);
    updateRangeTrack(elements.minRangeInput);
  }

  function updateWeightLabelValues() {
    elements.valueWeightValue.textContent = String(state.weights.value);
    elements.rangeWeightValue.textContent = String(state.weights.range);
    elements.performanceWeightValue.textContent = String(state.weights.performance);
    elements.practicalityWeightValue.textContent = String(state.weights.practicality);
    elements.comfortWeightValue.textContent = String(state.weights.comfort);

    [
      elements.valueWeightInput,
      elements.rangeWeightInput,
      elements.performanceWeightInput,
      elements.practicalityWeightInput,
      elements.comfortWeightInput
    ].forEach(updateRangeTrack);
  }

  // ── Stats bar ───────────────────────────────────────────

  function renderStatsBar() {
    if (!elements.statCarCount) return;
    const brands = new Set(cars.map((car) => car.brand));
    const sources = new Set();
    cars.forEach((car) => car.sources.forEach((entry) => sources.add(entry.source)));
    elements.statCarCount.textContent = cars.length;
    elements.statSourceCount.textContent = sources.size;
    elements.statBrandCount.textContent = brands.size;
  }

  // ── Score computation ───────────────────────────────────

  function computeScoreMap() {
    const ranges = getRange(cars.map((car) => car.rangeKm));
    const prices = getRange(cars.map((car) => car.priceEur));
    const accelerations = getRange(cars.map((car) => car.accel0to100));
    const trunks = getRange(cars.map((car) => car.trunkLiters));
    const charging = getRange(cars.map((car) => car.fastChargeKw));
    const comfort = getRange(cars.map((car) => car.comfortScore));
    const expert = getRange(cars.map((car) => car.expertScore));

    const totalWeight =
      state.weights.value +
      state.weights.range +
      state.weights.performance +
      state.weights.practicality +
      state.weights.comfort;

    const scoreMap = new Map();

    cars.forEach((car) => {
      const priceScore = 1 - normalize(car.priceEur, prices.min, prices.max);
      const rangeScore = normalize(car.rangeKm, ranges.min, ranges.max);
      const performanceScore =
        1 - normalize(car.accel0to100, accelerations.min, accelerations.max);
      const practicalityScore = average([
        normalize(car.trunkLiters, trunks.min, trunks.max),
        normalize(car.fastChargeKw, charging.min, charging.max),
        normalize(car.seats, 2, 7)
      ]);
      const comfortScore = normalize(car.comfortScore, comfort.min, comfort.max);
      const expertScoreNormalized = normalize(car.expertScore, expert.min, expert.max);
      const valueForMoneyScore = average([priceScore, rangeScore, expertScoreNormalized]);

      let weightedPersonalScore = 0.5;
      if (totalWeight > 0) {
        weightedPersonalScore =
          (valueForMoneyScore * state.weights.value +
            rangeScore * state.weights.range +
            performanceScore * state.weights.performance +
            practicalityScore * state.weights.practicality +
            comfortScore * state.weights.comfort) /
          totalWeight;
      }

      const finalScore = clamp(
        weightedPersonalScore * 0.8 + expertScoreNormalized * 0.2,
        0,
        1
      );

      scoreMap.set(car.id, {
        finalScore,
        valueForMoneyScore,
        rangeScore,
        performanceScore,
        practicalityScore,
        comfortScore,
        expertScoreNormalized
      });
    });

    return scoreMap;
  }

  // ── Filtering & sorting ─────────────────────────────────

  function getFilteredCars() {
    const query = state.search.trim().toLowerCase();
    return cars.filter((car) => {
      const searchable = `${car.brand} ${car.model}`.toLowerCase();
      return (
        (!query || searchable.includes(query)) &&
        (state.bodyType === "all" || car.bodyType === state.bodyType) &&
        (state.source === "all" ||
          car.sources.some(
            (entry) => entry.source.toLowerCase() === state.source.toLowerCase()
          )) &&
        car.priceEur <= state.maxPrice &&
        car.rangeKm >= state.minRange
      );
    });
  }

  function sortCars(filteredCars, scoreMap) {
    return filteredCars.sort((a, b) => {
      switch (state.sortBy) {
        case "expert-score":
          return b.expertScore - a.expertScore;
        case "price-low-high":
          return a.priceEur - b.priceEur;
        case "range-high-low":
          return b.rangeKm - a.rangeKm;
        case "acceleration":
          return a.accel0to100 - b.accel0to100;
        case "best-match":
        default: {
          const scoreA = scoreMap.get(a.id)?.finalScore ?? 0;
          const scoreB = scoreMap.get(b.id)?.finalScore ?? 0;
          return scoreB - scoreA;
        }
      }
    });
  }

  // ── Card & detail builders ──────────────────────────────

  function buildMetricItem(label, value) {
    const li = document.createElement("li");
    li.className = "metric-item";

    const left = document.createElement("span");
    left.className = "metric-label";
    left.textContent = label;

    const right = document.createElement("strong");
    right.className = "metric-value";
    right.textContent = value;

    li.append(left, right);
    return li;
  }

  function buildSourceChip(entry) {
    const chip = document.createElement("span");
    chip.className = "source-chip";
    chip.textContent = `${entry.source} (${entry.rating.toFixed(1)})`;
    return chip;
  }

  function buildDetailSpecItem(label, value) {
    const wrapper = document.createElement("div");
    wrapper.className = "detail-spec-item";

    const term = document.createElement("dt");
    term.textContent = label;

    const detail = document.createElement("dd");
    detail.textContent = value;

    wrapper.append(term, detail);
    return wrapper;
  }

  function buildBreakdownItem(label, score, weightLabel) {
    const scorePercent = Math.round(clamp(score, 0, 1) * 100);
    const item = document.createElement("article");
    item.className = "breakdown-item";

    const head = document.createElement("div");
    head.className = "breakdown-head";

    const labelEl = document.createElement("p");
    labelEl.className = "breakdown-label";
    labelEl.textContent = label;

    const valueEl = document.createElement("p");
    valueEl.className = "breakdown-value";
    valueEl.textContent = weightLabel
      ? `${scorePercent}% · weight ${weightLabel}`
      : `${scorePercent}%`;

    const track = document.createElement("div");
    track.className = "breakdown-track";

    const fill = document.createElement("span");
    fill.className = "breakdown-fill";
    fill.style.width = `${scorePercent}%`;

    head.append(labelEl, valueEl);
    track.append(fill);
    item.append(head, track);
    return item;
  }

  function buildDetailSourceItem(entry) {
    const item = document.createElement("li");
    item.className = "detail-source-item";

    const sourceLink = document.createElement("a");
    sourceLink.className = "detail-source-link";
    sourceLink.href = entry.url;
    sourceLink.target = "_blank";
    sourceLink.rel = "noopener noreferrer";
    sourceLink.textContent = `${entry.source} — ${entry.title}`;

    const rating = document.createElement("span");
    rating.className = "detail-source-rating";
    rating.textContent = `${entry.rating.toFixed(1)} / 10`;

    item.append(sourceLink, rating);
    return item;
  }

  function scoreColor(score) {
    if (score >= 80) return "#00ffa3";
    if (score >= 60) return "#fbbf24";
    return "#f87171";
  }

  function getScoreDetails(carId) {
    return state.scoreMap.get(carId) ?? fallbackScoreDetails;
  }

  function sanitizeForSearch(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/\+/g, " plus ")
      .replace(/[#:/()]/g, " ")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function toSearchTokens(value) {
    return sanitizeForSearch(value)
      .split(" ")
      .filter(Boolean);
  }

  function getCarImageCacheKey(carId) {
    return `${imageCacheStoragePrefix}${carId}`;
  }

  function getCachedCarImageUrl(carId) {
    try {
      return window.localStorage.getItem(getCarImageCacheKey(carId));
    } catch (error) {
      return null;
    }
  }

  function setCachedCarImageUrl(carId, url) {
    try {
      window.localStorage.setItem(getCarImageCacheKey(carId), url);
    } catch (error) {
      // Ignore storage quota/security errors and keep rendering.
    }
  }

  function clearCachedCarImageUrl(carId) {
    try {
      window.localStorage.removeItem(getCarImageCacheKey(carId));
    } catch (error) {
      // Ignore storage access errors.
    }
  }

  function buildCarImageQueries(car) {
    const modelTokens = toSearchTokens(car.model).filter(
      (token) => !modelNoiseTokens.has(token) && !/^\d+$/.test(token)
    );
    const compactModel = modelTokens.slice(0, 3).join(" ");
    const rawQueries = [
      `${car.brand} ${car.model} electric car`,
      compactModel ? `${car.brand} ${compactModel} electric car` : "",
      compactModel ? `${car.brand} ${compactModel}` : "",
      `${car.brand} electric car`
    ];
    return [...new Set(rawQueries.map((query) => query.trim()).filter((query) => query.length > 0))];
  }

  async function fetchWikipediaImageCandidates(query) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrsearch: query,
      gsrlimit: "8",
      gsrnamespace: "0",
      prop: "pageimages|info",
      piprop: "thumbnail",
      pithumbsize: "960",
      inprop: "url"
    });
    const response = await fetch(`${wikipediaSearchApi}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Wikipedia image lookup failed for "${query}" (${response.status}).`);
    }
    const data = await response.json();
    return Object.values(data.query?.pages ?? {}).filter(
      (page) => page?.thumbnail?.source && page?.title
    );
  }

  function scoreWikipediaCandidate(page, brandTokens, modelTokens) {
    const title = sanitizeForSearch(page.title);
    let score = 0;

    brandTokens.forEach((token) => {
      if (title.includes(token)) {
        score += 3;
      }
    });
    modelTokens.slice(0, 4).forEach((token, index) => {
      if (title.includes(token)) {
        score += index === 0 ? 4 : 2;
      }
    });

    if (title.includes("disambiguation")) score -= 10;
    if (title.includes("film") || title.includes("album")) score -= 8;
    if (title.includes("concept")) score -= 2;

    return score;
  }

  async function resolveWikipediaCarImage(car) {
    const brandTokens = toSearchTokens(car.brand);
    const modelTokens = toSearchTokens(car.model).filter(
      (token) => !modelNoiseTokens.has(token) && !/^\d+$/.test(token)
    );
    const queries = buildCarImageQueries(car);
    let bestCandidate = null;

    for (const query of queries) {
      let candidates = [];
      try {
        candidates = await fetchWikipediaImageCandidates(query);
      } catch (error) {
        continue;
      }

      candidates.forEach((candidate) => {
        const score = scoreWikipediaCandidate(candidate, brandTokens, modelTokens);
        if (!bestCandidate || score > bestCandidate.score) {
          bestCandidate = {
            score,
            url: candidate.thumbnail.source
          };
        }
      });

      if (bestCandidate?.score >= 7) {
        break;
      }
    }

    return bestCandidate?.url ?? null;
  }

  function getCarImageUrl(car) {
    if (resolvedCarImageSources.has(car.id)) {
      return Promise.resolve(resolvedCarImageSources.get(car.id));
    }

    const cachedFromStorage = getCachedCarImageUrl(car.id);
    if (cachedFromStorage) {
      resolvedCarImageSources.set(car.id, cachedFromStorage);
      return Promise.resolve(cachedFromStorage);
    }

    // Avoid firing hundreds of parallel Wikipedia requests on very large datasets.
    if (!shouldResolveWikipediaImages) {
      return Promise.resolve(fallbackCarImage);
    }

    if (pendingCarImageRequests.has(car.id)) {
      return pendingCarImageRequests.get(car.id);
    }

    const request = resolveWikipediaCarImage(car)
      .then((resolvedUrl) => {
        const finalUrl = resolvedUrl || fallbackCarImage;
        resolvedCarImageSources.set(car.id, finalUrl);
        if (resolvedUrl) {
          setCachedCarImageUrl(car.id, resolvedUrl);
        }
        return finalUrl;
      })
      .catch(() => {
        resolvedCarImageSources.set(car.id, fallbackCarImage);
        return fallbackCarImage;
      })
      .finally(() => {
        pendingCarImageRequests.delete(car.id);
      });

    pendingCarImageRequests.set(car.id, request);
    return request;
  }

  function setScorePillStyles(pillElement, scorePercent) {
    const color = scoreColor(scorePercent);
    pillElement.style.color = color;
    pillElement.style.borderColor = `${color}55`;
    pillElement.style.background = `${color}18`;
  }

  function buildProsConsSummary(car, scoreDetails) {
    const pros = [];
    const cons = [];

    function pushUnique(collection, value) {
      if (!collection.includes(value)) {
        collection.push(value);
      }
    }

    if (scoreDetails.finalScore >= 0.8) {
      pushUnique(pros, "Excellent overall match with your current priorities.");
    } else if (scoreDetails.finalScore <= 0.55) {
      pushUnique(cons, "Overall match is lower with your current priorities.");
    }

    const scoreChecks = [
      {
        score: scoreDetails.valueForMoneyScore,
        pro: `Strong value proposition for the current segment price (${formatCurrency(car.priceEur)}).`,
        con: `Value for money is less competitive for this price point (${formatCurrency(car.priceEur)}).`
      },
      {
        score: scoreDetails.rangeScore,
        pro: `Long WLTP range for daily and long-distance use (${formatNumber(car.rangeKm)} km).`,
        con: `Range trails top alternatives (${formatNumber(car.rangeKm)} km WLTP).`
      },
      {
        score: scoreDetails.performanceScore,
        pro: `Quick acceleration improves overtaking confidence (${car.accel0to100.toFixed(1)}s 0-100).`,
        con: `Acceleration is not among the quickest options (${car.accel0to100.toFixed(1)}s 0-100).`
      },
      {
        score: scoreDetails.practicalityScore,
        pro: `Strong practicality with ${formatNumber(car.trunkLiters)}L trunk and ${formatNumber(car.fastChargeKw)}kW charging.`,
        con: `Practicality trade-offs (cargo or charging) compared to class leaders.`
      },
      {
        score: scoreDetails.comfortScore,
        pro: `Comfort-oriented setup supports relaxed long trips (comfort ${car.comfortScore.toFixed(1)}/10).`,
        con: `Comfort score is less convincing than competing models (${car.comfortScore.toFixed(1)}/10).`
      }
    ];

    scoreChecks.forEach((entry) => {
      if (entry.score >= 0.68) {
        pushUnique(pros, entry.pro);
      } else if (entry.score <= 0.4) {
        pushUnique(cons, entry.con);
      }
    });

    const sourceAverage = average(car.sources.map((entry) => entry.rating));
    if (sourceAverage >= 8.4) {
      pushUnique(
        pros,
        `Review consensus is very positive (${sourceAverage.toFixed(1)} / 10 average).`
      );
    } else if (sourceAverage <= 8) {
      pushUnique(
        cons,
        `Review sentiment is more mixed (${sourceAverage.toFixed(1)} / 10 average).`
      );
    }

    if (car.priceEur > marketAverages.price * 1.2) {
      pushUnique(cons, "Price is above average for this comparison set.");
    }
    if (car.rangeKm > marketAverages.range * 1.1) {
      pushUnique(pros, "Range is clearly above average in this dataset.");
    }

    const fallbackPros = [
      `${car.bodyType} body with ${car.seats} seats supports day-to-day usability.`,
      `Battery size of ${formatNumber(car.batteryKwh)} kWh is suitable for mixed usage.`,
      `${car.sources.length} review sources provide broad external perspective.`
    ];

    const fallbackCons = [
      "Real-world efficiency still depends on weather, speed and tyre setup.",
      "Seat and suspension comfort remain subjective, so a test drive is advised.",
      "Charging curve behavior can differ by battery state and charger temperature."
    ];

    let prosIndex = 0;
    while (pros.length < 3 && prosIndex < fallbackPros.length) {
      pushUnique(pros, fallbackPros[prosIndex]);
      prosIndex += 1;
    }

    let consIndex = 0;
    while (cons.length < 3 && consIndex < fallbackCons.length) {
      pushUnique(cons, fallbackCons[consIndex]);
      consIndex += 1;
    }

    return {
      pros: pros.slice(0, 4),
      cons: cons.slice(0, 4)
    };
  }

  // ── Detail modal ────────────────────────────────────────

  function renderDetailModal(car) {
    if (!elements.detailModal) return;

    const scoreDetails = getScoreDetails(car.id);
    const scorePercent = Math.round(scoreDetails.finalScore * 100);
    const averageSourceRating = average(car.sources.map((entry) => entry.rating));

    elements.detailBrand.textContent = `${car.brand} · ${car.year}`;
    elements.detailTitle.textContent = car.model;
    elements.detailMatchScore.textContent = `${scorePercent} match`;
    setScorePillStyles(elements.detailMatchScore, scorePercent);
    elements.detailScoreCopy.textContent =
      `${car.sources.length} sources · Avg review ${averageSourceRating.toFixed(1)} / 10 · Expert score ${car.expertScore.toFixed(1)} / 10`;

    const specs = [
      ["Price", formatCurrency(car.priceEur)],
      ["WLTP range", `${formatNumber(car.rangeKm)} km`],
      ["0-100 km/h", `${car.accel0to100.toFixed(1)} s`],
      ["Battery", `${formatNumber(car.batteryKwh)} kWh`],
      ["Fast charging", `${formatNumber(car.fastChargeKw)} kW`],
      ["Trunk space", `${formatNumber(car.trunkLiters)} L`],
      ["Seats", String(car.seats)],
      ["Body type", car.bodyType],
      ["Comfort score", `${car.comfortScore.toFixed(1)} / 10`],
      ["Expert score", `${car.expertScore.toFixed(1)} / 10`]
    ];

    elements.detailSpecs.innerHTML = "";
    specs.forEach(([label, value]) => {
      elements.detailSpecs.append(buildDetailSpecItem(label, value));
    });

    const breakdownRows = [
      {
        label: "Final match score (80% personal + 20% expert)",
        score: scoreDetails.finalScore
      },
      {
        label: "Value for money",
        score: scoreDetails.valueForMoneyScore,
        weightLabel: `${state.weights.value}/10`
      },
      {
        label: "Range",
        score: scoreDetails.rangeScore,
        weightLabel: `${state.weights.range}/10`
      },
      {
        label: "Performance",
        score: scoreDetails.performanceScore,
        weightLabel: `${state.weights.performance}/10`
      },
      {
        label: "Practicality",
        score: scoreDetails.practicalityScore,
        weightLabel: `${state.weights.practicality}/10`
      },
      {
        label: "Comfort",
        score: scoreDetails.comfortScore,
        weightLabel: `${state.weights.comfort}/10`
      },
      {
        label: "Expert sentiment",
        score: scoreDetails.expertScoreNormalized,
        weightLabel: "fixed 20%"
      }
    ];

    elements.detailBreakdown.innerHTML = "";
    breakdownRows.forEach((item) => {
      elements.detailBreakdown.append(
        buildBreakdownItem(item.label, item.score, item.weightLabel)
      );
    });

    const summary = buildProsConsSummary(car, scoreDetails);
    elements.detailPros.innerHTML = "";
    summary.pros.forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = entry;
      elements.detailPros.append(li);
    });

    elements.detailCons.innerHTML = "";
    summary.cons.forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = entry;
      elements.detailCons.append(li);
    });

    elements.detailSources.innerHTML = "";
    car.sources.forEach((entry) => {
      elements.detailSources.append(buildDetailSourceItem(entry));
    });
  }

  function openDetailModal(carId, { updateHash = true } = {}) {
    const car = carById.get(carId);
    if (!car || !elements.detailModal) return;

    state.activeCarId = car.id;
    renderDetailModal(car);

    elements.detailModal.hidden = false;
    elements.detailModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    if (updateHash) {
      const targetHash = createCarHash(car.id);
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    }

    elements.detailBackButton?.focus();
  }

  function closeDetailModal({ updateHash = true, restoreFocus = true } = {}) {
    if (!elements.detailModal) return;

    state.activeCarId = null;
    elements.detailModal.hidden = true;
    elements.detailModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    if (updateHash && isDetailHash()) {
      clearDetailHash();
    }

    if (
      restoreFocus &&
      state.triggerElement &&
      typeof state.triggerElement.focus === "function" &&
      document.contains(state.triggerElement)
    ) {
      state.triggerElement.focus();
    }

    state.triggerElement = null;
  }

  function syncDetailFromHash() {
    const hashCarId = getCarIdFromHash();

    if (!hashCarId) {
      if (state.activeCarId) {
        closeDetailModal({ updateHash: false });
      }
      return;
    }

    if (!carById.has(hashCarId)) {
      clearDetailHash();
      closeDetailModal({ updateHash: false, restoreFocus: false });
      return;
    }

    if (state.activeCarId === hashCarId) {
      renderDetailModal(carById.get(hashCarId));
      return;
    }

    openDetailModal(hashCarId, { updateHash: false });
  }

  function setCardImage(card, car) {
    const image = card.querySelector(".car-image");
    if (!image) return;

    image.dataset.carId = car.id;
    image.alt = `${car.brand} ${car.model}`;
    image.onerror = () => {
      const failedCarId = image.dataset.carId;
      image.onerror = null;
      image.src = fallbackCarImage;
      if (failedCarId) {
        resolvedCarImageSources.delete(failedCarId);
        clearCachedCarImageUrl(failedCarId);
      }
    };

    const initialUrl = resolvedCarImageSources.get(car.id);
    image.src = initialUrl || fallbackCarImage;
    if (initialUrl) return;

    getCarImageUrl(car).then((resolvedUrl) => {
      if (image.dataset.carId !== car.id) return;
      if (image.src !== resolvedUrl) {
        image.src = resolvedUrl;
      }
    });
  }

  // ── Rendering ───────────────────────────────────────────

  function renderSummary(filteredCars) {
    if (!filteredCars.length) {
      elements.resultsSummary.textContent =
        "No cars match the selected filters. Broaden your filters to compare more models.";
      return;
    }

    const averagePrice = average(filteredCars.map((car) => car.priceEur));
    const averageRange = average(filteredCars.map((car) => car.rangeKm));
    elements.resultsSummary.textContent =
      `${filteredCars.length} car(s) found — Avg. price ${formatCurrency(averagePrice)} | Avg. WLTP range ${formatNumber(averageRange)} km`;
  }

  function renderCards(sortedCars, scoreMap) {
    elements.resultsGrid.innerHTML = "";

    if (!sortedCars.length) {
      const empty = document.createElement("article");
      empty.className = "empty-state";
      empty.textContent =
        "No results for the current selection. Try increasing the max price or lowering the min range.";
      elements.resultsGrid.append(empty);
      return;
    }

    const fragment = document.createDocumentFragment();

    sortedCars.forEach((car, index) => {
      const card = template.content.firstElementChild.cloneNode(true);
      const cardScore = scoreMap.get(car.id);
      const scorePercent = Math.round((cardScore?.finalScore ?? 0) * 100);

      // Hero image
      setCardImage(card, car);

      // Header
      card.querySelector(".car-brand").textContent = `${car.brand} · ${car.year}`;
      card.querySelector(".car-model").textContent = car.model;

      const pill = card.querySelector(".score-pill");
      pill.textContent = `${scorePercent} match`;
      setScorePillStyles(pill, scorePercent);

      const metrics = card.querySelector(".metric-list");
      metrics.append(
        buildMetricItem("Expert score", `${car.expertScore.toFixed(1)} / 10`),
        buildMetricItem("Price", formatCurrency(car.priceEur)),
        buildMetricItem("Range", `${formatNumber(car.rangeKm)} km`),
        buildMetricItem("0-100 km/h", `${car.accel0to100.toFixed(1)} s`),
        buildMetricItem("Trunk", `${formatNumber(car.trunkLiters)} L`),
        buildMetricItem("Fast charge", `${formatNumber(car.fastChargeKw)} kW`)
      );

      const segmentLine = card.querySelector(".segment-line");
      [car.bodyType, `${car.seats} seats`, `${car.batteryKwh} kWh`].forEach((tag) => {
        const span = document.createElement("span");
        span.className = "segment-tag";
        span.textContent = tag;
        segmentLine.append(span);
      });

      const sourceContainer = card.querySelector(".source-list");
      car.sources.forEach((entry) => {
        sourceContainer.append(buildSourceChip(entry));
      });

      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Open details for ${car.brand} ${car.model}`);

      const openFromCard = () => {
        state.triggerElement = card;
        openDetailModal(car.id);
      };

      card.addEventListener("click", openFromCard);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
          event.preventDefault();
          openFromCard();
        }
      });

      card.style.transitionDelay = `${Math.min(index * 40, 400)}ms`;
      fragment.append(card);
    });

    elements.resultsGrid.append(fragment);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -20px 0px" }
    );

    elements.resultsGrid.querySelectorAll(".car-card").forEach((card) => {
      observer.observe(card);
    });
  }

  // ── Main render ─────────────────────────────────────────

  function render() {
    const scoreMap = computeScoreMap();
    state.scoreMap = scoreMap;
    const filteredCars = getFilteredCars();
    const sortedCars = sortCars(filteredCars, scoreMap);
    renderSummary(sortedCars);
    renderCards(sortedCars, scoreMap);

    if (state.activeCarId && carById.has(state.activeCarId)) {
      renderDetailModal(carById.get(state.activeCarId));
    }
  }

  // ── Events ──────────────────────────────────────────────

  function bindEvents() {
    elements.searchInput.addEventListener("input", (event) => {
      state.search = event.target.value;
      render();
    });

    elements.bodyTypeSelect.addEventListener("change", (event) => {
      state.bodyType = event.target.value;
      render();
    });

    elements.sourceSelect.addEventListener("change", (event) => {
      state.source = event.target.value;
      render();
    });

    elements.maxPriceInput.addEventListener("input", (event) => {
      state.maxPrice = Number(event.target.value);
      updateFilterLabelValues();
      render();
    });

    elements.minRangeInput.addEventListener("input", (event) => {
      state.minRange = Number(event.target.value);
      updateFilterLabelValues();
      render();
    });

    elements.sortSelect.addEventListener("change", (event) => {
      state.sortBy = event.target.value;
      render();
    });

    const weightBindings = [
      { key: "value", input: elements.valueWeightInput },
      { key: "range", input: elements.rangeWeightInput },
      { key: "performance", input: elements.performanceWeightInput },
      { key: "practicality", input: elements.practicalityWeightInput },
      { key: "comfort", input: elements.comfortWeightInput }
    ];

    weightBindings.forEach(({ key, input }) => {
      input.addEventListener("input", (event) => {
        state.weights[key] = Number(event.target.value);
        updateWeightLabelValues();
        render();
      });
    });

    elements.resetWeightsButton.addEventListener("click", () => {
      state.weights = { ...defaultWeights };
      elements.valueWeightInput.value = String(defaultWeights.value);
      elements.rangeWeightInput.value = String(defaultWeights.range);
      elements.performanceWeightInput.value = String(defaultWeights.performance);
      elements.practicalityWeightInput.value = String(defaultWeights.practicality);
      elements.comfortWeightInput.value = String(defaultWeights.comfort);
      updateWeightLabelValues();
      render();
    });

    elements.detailCloseButton?.addEventListener("click", () => {
      closeDetailModal();
    });
    elements.detailBackButton?.addEventListener("click", () => {
      closeDetailModal();
    });
    elements.detailBackdrop?.addEventListener("click", () => {
      closeDetailModal();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.activeCarId) {
        closeDetailModal();
      }
    });

    window.addEventListener("hashchange", syncDetailFromHash);
  }

  // ── Init ────────────────────────────────────────────────

  function initialize() {
    initializeEvNews();

    if (!cars.length) {
      elements.resultsSummary.textContent =
        "No EV data found. Add entries to data/evData.js to show results.";
      return;
    }

    setupSelectOptions();
    setupRangeInputs();
    updateFilterLabelValues();
    updateWeightLabelValues();
    renderStatsBar();
    bindEvents();
    render();
    syncDetailFromHash();
  }

  initialize();
})();
