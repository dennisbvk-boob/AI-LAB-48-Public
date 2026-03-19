(function () {
  "use strict";

  const cars = Array.isArray(window.evData) ? window.evData : [];
  const carById = new Map(cars.map((car) => [car.id, car]));
  const template = document.getElementById("carCardTemplate");
  const DETAIL_HASH_PREFIX = "#car/";

  const elements = {
    searchInput: document.getElementById("searchInput"),
    bodyTypePills: document.getElementById("bodyTypePills"),
    sourcePills: document.getElementById("sourcePills"),
    sortPills: document.getElementById("sortPills"),
    maxPriceInput: document.getElementById("maxPriceInput"),
    minRangeInput: document.getElementById("minRangeInput"),
    themeToggle: document.getElementById("themeToggle"),
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
    detailImage: document.getElementById("detailImage"),
    detailImageAttribution: document.getElementById("detailImageAttribution"),
    evNewsTrack: document.getElementById("evNewsTrack"),
    evNewsStatus: document.getElementById("evNewsStatus")
  };

  const THEME_STORAGE_KEY = "ev-verdict-theme";

  const sortOptionDefs = Object.freeze([
    { value: "best-match", label: "Beste match" },
    { value: "expert-score", label: "Expertscore" },
    { value: "price-low-high", label: "Prijs ↑" },
    { value: "range-high-low", label: "Bereik ↓" },
    { value: "acceleration", label: "0–100 snelst" }
  ]);

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
  const wikimediaCommonsApi = "https://commons.wikimedia.org/w/api.php";
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
  const imageCacheStoragePrefix = "ev-verdict-car-image-v3:";
  const carModelTrimTokens = new Set([
    "standard",
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
    "turismo",
    "core",
    "privilege",
    "ultimate",
    "launch",
    "edition",
    "line",
    "sport",
    "gt",
    "gts",
    "awd",
    "rwd",
    "fwd",
    "kwh",
    "kw",
    "hp",
    "electric",
    "ev"
  ]);
  const resolvedCarImageSources = new Map();
  const pendingCarImageRequests = new Map();
  const commonsSearchCache = new Map();
  const modelVariantStripPatterns = [
    /\s+(performance|quattro|turismo|scorpionissima|veloce|premium|business|launch\s+edition|limited\s+edition|comfort|design|plus|pro|max|ultra)$/i,
    /\s+(single|dual)\s+motor$/i,
    /\s+(standard|long|extended)\s+range$/i,
    /\s+(awd|rwd|fwd|4matic|allrad)$/i,
    /\s+(xdrive|edrive)\d+[a-z]*$/i,
    /\s+m\d+\s*xdrive$/i,
    /\s+\d+\s*xdrive$/i,
    /\s+\d+\s*kwh$/i,
    /\s+\d+\s*hp$/i
  ];
  const brandedFallbackByCarId = new Map();
  const lazyCardImageContext = new WeakMap();
  let lazyCardImageObserver = null;

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
    newsRefreshTimer: null,
    selectedVariantByGroupId: new Map()
  };

  const modelGroups = buildModelGroups(cars);
  const groupByCarId = new Map();
  modelGroups.forEach((group) => {
    group.variants.forEach((variant) => {
      groupByCarId.set(variant.id, group);
    });
    if (group.variants.length) {
      state.selectedVariantByGroupId.set(group.id, group.variants[0].id);
    }
  });

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
    icon.className = "ev-news-badge";
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
      elements.evNewsStatus.textContent = "Laatste koppen laden…";
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
      renderNewsFallback("Geen EV-koppen beschikbaar. Probeer het later opnieuw.");
      if (elements.evNewsStatus) {
        elements.evNewsStatus.textContent = "Alle feeds onbereikbaar";
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
          ? "Alle bronnen actief"
          : `${successfulSources}/${evNewsSources.length} bronnen actief`;
      elements.evNewsStatus.textContent = `Bijgewerkt ${formatNewsUpdatedAt()} · ${sourceLabel}`;
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

  function formatRangeLabel(min, max, formatter, unit = "") {
    if (min === max) return `${formatter(min)}${unit}`;
    return `${formatter(min)}–${formatter(max)}${unit}`;
  }

  function formatSignedCurrency(value) {
    if (value === 0) return formatCurrency(0);
    const absolute = formatCurrency(Math.abs(value));
    return `${value > 0 ? "+" : "-"}${absolute}`;
  }

  function formatSignedNumber(value, unit = "") {
    const rounded = Number(value.toFixed(1));
    if (rounded === 0) return `0${unit}`;
    return `${rounded > 0 ? "+" : "-"}${Math.abs(rounded)}${unit}`;
  }

  function slugify(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeModelForGrouping(model) {
    let normalized = String(model ?? "")
      .replace(/\s+/g, " ")
      .trim();

    let changed = true;
    while (changed && normalized.length > 0) {
      changed = false;
      modelVariantStripPatterns.forEach((pattern) => {
        if (pattern.test(normalized)) {
          normalized = normalized.replace(pattern, "").trim();
          changed = true;
        }
      });
    }

    return normalized || String(model ?? "").trim();
  }

  function buildModelGroups(inputCars) {
    const map = new Map();

    inputCars.forEach((car) => {
      const baseModel = normalizeModelForGrouping(car.model);
      const groupId = `${slugify(car.brand)}-${slugify(baseModel)}`;
      if (!map.has(groupId)) {
        map.set(groupId, {
          id: groupId,
          brand: car.brand,
          baseModel,
          variants: []
        });
      }
      map.get(groupId).variants.push(car);
    });

    return [...map.values()]
      .map((group) => {
        group.variants.sort((a, b) => {
          if (a.priceEur !== b.priceEur) return a.priceEur - b.priceEur;
          return a.model.localeCompare(b.model);
        });
        return group;
      })
      .sort((a, b) => {
        if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
        return a.baseModel.localeCompare(b.baseModel);
      });
  }

  function getVariantLabel(group, car) {
    const groupModel = group.baseModel.trim().toLowerCase();
    const modelName = car.model.trim();
    const modelNameLower = modelName.toLowerCase();

    if (modelNameLower === groupModel) return "Standard";

    if (modelNameLower.startsWith(`${groupModel} `)) {
      const suffix = modelName.slice(group.baseModel.length).trim();
      return suffix || "Standard";
    }

    return modelName;
  }

  function getYearLabel(variants) {
    const years = variants.map((car) => car.year);
    const { min, max } = getRange(years);
    return min === max ? String(min) : `${min}-${max}`;
  }

  function getGroupRanges(variants) {
    return {
      price: getRange(variants.map((car) => car.priceEur)),
      range: getRange(variants.map((car) => car.rangeKm)),
      acceleration: getRange(variants.map((car) => car.accel0to100)),
      charging: getRange(variants.map((car) => car.fastChargeKw))
    };
  }

  function getSelectedCarForGroup(group, visibleVariants, scoreMap) {
    if (!visibleVariants.length) return null;

    const selectedId = state.selectedVariantByGroupId.get(group.id);
    const selectedVisibleCar = visibleVariants.find((car) => car.id === selectedId);
    if (selectedVisibleCar) return selectedVisibleCar;

    const fallback =
      state.sortBy === "best-match"
        ? [...visibleVariants].sort(
            (a, b) => (scoreMap.get(b.id)?.finalScore ?? 0) - (scoreMap.get(a.id)?.finalScore ?? 0)
          )[0]
        : visibleVariants[0];
    state.selectedVariantByGroupId.set(group.id, fallback.id);
    return fallback;
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

  function syncPillRowPressed(container, activeValue) {
    if (!container) return;
    container.querySelectorAll(".filter-pill").forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.value === activeValue ? "true" : "false");
    });
  }

  function setupFilterPills() {
    function bindPillRow(container, items, stateKey, onChange) {
      if (!container) return;
      container.innerHTML = "";
      items.forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "filter-pill";
        button.dataset.value = item.value;
        button.textContent = item.label;
        button.setAttribute("aria-pressed", state[stateKey] === item.value ? "true" : "false");
        button.addEventListener("click", () => {
          if (state[stateKey] === item.value) return;
          state[stateKey] = item.value;
          syncPillRowPressed(container, item.value);
          onChange();
        });
        container.append(button);
      });
    }

    const bodyItems = [{ value: "all", label: "Alle" }].concat(
      getAllBodyTypes().map((type) => ({ value: type, label: type }))
    );
    bindPillRow(elements.bodyTypePills, bodyItems, "bodyType", () => render());

    const sourceItems = [{ value: "all", label: "Alle" }].concat(
      getAllSources().map((source) => ({ value: source, label: source }))
    );
    bindPillRow(elements.sourcePills, sourceItems, "source", () => render());

    bindPillRow(elements.sortPills, [...sortOptionDefs], "sortBy", () => render());
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

    // Attach floating tooltips for filter sliders
    setupRangeTooltip(elements.maxPriceInput, (v) => formatCurrency(v));
    setupRangeTooltip(elements.minRangeInput, (v) => `${formatNumber(v)} km`);
  }

  // Map of range inputs to their tooltip <output> elements
  const rangeTooltipMap = new Map();

  function updateRangeTrack(input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const val = Number(input.value);
    const pct = ((val - min) / (max - min)) * 100;
    input.style.setProperty("--fill-pct", `${pct}`);
    input.style.background = `linear-gradient(to right, var(--accent) 0%, var(--range-fill-end) ${pct}%, var(--range-track) ${pct}%)`;

    const tooltip = rangeTooltipMap.get(input);
    if (tooltip) {
      // Accurate thumb-centre calculation: compensates for the dead-zone at
      // each end where the thumb cannot travel further.
      const thumbPx = 22; // must match CSS thumb size
      const trackPx = input.offsetWidth;
      if (trackPx > 0) {
        const centre = ((pct / 100) * (trackPx - thumbPx) + thumbPx / 2) / trackPx * 100;
        tooltip.style.left = `${centre}%`;
      }
    }
  }

  function setupRangeTooltip(input, formatter) {
    const wrapper = document.createElement("div");
    wrapper.className = "range-wrapper";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const tooltip = document.createElement("output");
    tooltip.className = "range-tooltip";
    tooltip.setAttribute("aria-hidden", "true");
    wrapper.appendChild(tooltip);

    rangeTooltipMap.set(input, tooltip);

    function showTooltip() {
      tooltip.textContent = formatter(Number(input.value));
      updateRangeTrack(input);
      tooltip.classList.add("visible");
    }
    function hideTooltip() {
      tooltip.classList.remove("visible");
    }

    input.addEventListener("mouseenter", showTooltip);
    input.addEventListener("focus", showTooltip);
    input.addEventListener("input", showTooltip);
    input.addEventListener("mouseleave", (e) => {
      if (document.activeElement !== input) hideTooltip();
    });
    input.addEventListener("blur", hideTooltip);
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

  function setupWeightSliderTooltips() {
    [
      elements.valueWeightInput,
      elements.rangeWeightInput,
      elements.performanceWeightInput,
      elements.practicalityWeightInput,
      elements.comfortWeightInput
    ].forEach((input) => setupRangeTooltip(input, (v) => `${v} / 10`));
  }

  // ── Stats bar ───────────────────────────────────────────

  function renderStatsBar() {
    if (!elements.statCarCount) return;
    const brands = new Set(cars.map((car) => car.brand));
    const sources = new Set();
    cars.forEach((car) => car.sources.forEach((entry) => sources.add(entry.source)));
    elements.statCarCount.textContent = modelGroups.length;
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

  function getFilteredGroups() {
    const query = state.search.trim().toLowerCase();
    return modelGroups
      .map((group) => {
        const matchingVariants = group.variants.filter((car) => {
          const searchable = `${car.brand} ${group.baseModel} ${car.model}`.toLowerCase();
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

        if (!matchingVariants.length) return null;
        return {
          group,
          variants: matchingVariants
        };
      })
      .filter(Boolean);
  }

  function sortGroups(filteredGroups, scoreMap) {
    return filteredGroups.sort((a, b) => {
      const carA = getSelectedCarForGroup(a.group, a.variants, scoreMap);
      const carB = getSelectedCarForGroup(b.group, b.variants, scoreMap);
      if (!carA || !carB) return 0;

      switch (state.sortBy) {
        case "expert-score":
          return carB.expertScore - carA.expertScore;
        case "price-low-high":
          return carA.priceEur - carB.priceEur;
        case "range-high-low":
          return carB.rangeKm - carA.rangeKm;
        case "acceleration":
          return carA.accel0to100 - carB.accel0to100;
        case "best-match":
        default: {
          const scoreA = scoreMap.get(carA.id)?.finalScore ?? 0;
          const scoreB = scoreMap.get(carB.id)?.finalScore ?? 0;
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
    if (score >= 80) return "#00d4aa";
    if (score >= 60) return "#d97706";
    return "#dc2626";
  }

  function getScoreDetails(carId) {
    return state.scoreMap.get(carId) ?? fallbackScoreDetails;
  }

  function sanitizeForSlug(value) {
    return String(value ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .replace(/\+/g, " plus ")
      .replace(/[(),/]/g, " ")
      .replace(/[^a-zA-Z0-9.\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function toSlugTokens(value) {
    return sanitizeForSlug(value)
      .toLowerCase()
      .split(" ")
      .filter(Boolean);
  }

  function buildSlugFromRawText(value) {
    return sanitizeForSlug(value).replace(/\s+/g, "_");
  }

  function getCarModelTokens(car) {
    return toSlugTokens(car.model).filter((token) => {
      if (carModelTrimTokens.has(token)) return false;
      if (/^\d{2,4}(kwh|kw|hp)?$/.test(token)) return false;
      if (/^(xdrive|edrive|4matic|my\d+)$/.test(token)) return false;
      return true;
    });
  }

  function getCarBrandTokens(car) {
    return toSlugTokens(car.brand);
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

  function escapeForSvg(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildBrandMonogram(brand) {
    const letters = sanitizeForSlug(brand)
      .split(" ")
      .map((chunk) => chunk[0] ?? "")
      .join("")
      .slice(0, 3)
      .toUpperCase();
    return letters || "EV";
  }

  function createBrandedFallbackImage(car) {
    const cached = brandedFallbackByCarId.get(car.id);
    if (cached) return cached;

    const brand = escapeForSvg(car.brand);
    const model = escapeForSvg(car.model);
    const monogram = escapeForSvg(buildBrandMonogram(car.brand));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" role="img" aria-label="${brand} ${model} placeholder">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f3f4f6"/>
      <stop offset="100%" stop-color="#e5e7eb"/>
    </linearGradient>
  </defs>
  <rect width="960" height="540" fill="url(#bg)"/>
  <rect x="72" y="64" width="120" height="120" rx="12" fill="#ffffff" stroke="#e5e7eb" stroke-width="2"/>
  <text x="132" y="142" text-anchor="middle" fill="#111827" font-size="48" font-weight="700" font-family="Inter, Arial, sans-serif">${monogram}</text>
  <rect x="120" y="248" width="720" height="200" rx="10" fill="#ffffff" stroke="#e5e7eb" stroke-width="1.5"/>
  <path d="M200 388h560l-24 52H220z" fill="#f3f4f6"/>
  <path d="M188 382h572c22 0 40 18 40 40v18c0 15-12 28-28 28h-16c-4-42-38-76-82-76s-78 34-82 76H392c-4-42-38-76-82-76s-78 34-82 76h-16c-16 0-28-13-28-28v-16c0-28 21-50 48-53l54-6 66-88c12-16 30-26 50-26h168c25 0 47 13 60 34l42 66z" fill="#00d4aa" opacity="0.35"/>
  <circle cx="268" cy="428" r="48" fill="#e5e7eb"/>
  <circle cx="268" cy="428" r="24" fill="#9ca3af"/>
  <circle cx="692" cy="428" r="48" fill="#e5e7eb"/>
  <circle cx="692" cy="428" r="24" fill="#9ca3af"/>
  <text x="480" y="92" text-anchor="middle" fill="#111827" font-size="30" font-weight="600" font-family="Inter, Arial, sans-serif">${brand}</text>
  <text x="480" y="128" text-anchor="middle" fill="#6b7280" font-size="21" font-family="Inter, Arial, sans-serif">${model}</text>
  <text x="480" y="172" text-anchor="middle" fill="#9ca3af" font-size="17" font-family="Inter, Arial, sans-serif">Nog geen foto</text>
</svg>`;

    const dataUri = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    brandedFallbackByCarId.set(car.id, dataUri);
    return dataUri;
  }

  // ── Wikimedia Commons image search ─────────────────────
  // Uses the Wikimedia Commons media repository (commons.wikimedia.org) —
  // distinct from Wikipedia article pages — to find high-quality, properly
  // licensed car photos.

  function buildCommonsSearchQueries(car) {
    const modelTokens = getCarModelTokens(car);
    const compactModel = modelTokens.slice(0, 3).join(" ");
    const queries = [
      `${car.brand} ${car.model} electric car`,
      compactModel ? `${car.brand} ${compactModel} electric` : "",
      `${car.brand} ${car.model}`,
      compactModel ? `${car.brand} ${compactModel}` : ""
    ];
    return [...new Set(queries.map((q) => q.trim()).filter(Boolean))];
  }

  async function fetchCommonsFiles(query) {
    if (commonsSearchCache.has(query)) {
      return commonsSearchCache.get(query);
    }

    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrsearch: `${query} filetype:bitmap`,
      gsrnamespace: "6",
      prop: "imageinfo",
      iiprop: "url|size|canonicaltitle",
      iiurlwidth: "800",
      gsrlimit: "10"
    });

    const request = fetch(`${wikimediaCommonsApi}?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => Object.values(data?.query?.pages ?? {}))
      .catch(() => []);

    commonsSearchCache.set(query, request);
    return request;
  }

  function scoreCommonsFile(file, car) {
    const info = Array.isArray(file.imageinfo) ? file.imageinfo[0] : null;
    if (!info?.thumburl) return -1;

    const title = (file.title || info.canonicaltitle || "").toLowerCase();

    // Skip non-photo file types
    if (/\.(svg|gif|webp|tif|tiff|pdf|xcf|ogg|ogv|webm)$/i.test(title)) return -1;

    // Skip irrelevant visual content
    if (/\b(logo|icon|badge|emblem|interior|dashboard|cockpit|charging.?station|charger|cable|plug|map|flag|sign|poster|advertisement|render|concept)\b/.test(title)) return -1;

    const brandTokens = getCarBrandTokens(car);
    const modelTokens = getCarModelTokens(car);
    let score = 0;

    brandTokens.forEach((token) => {
      if (title.includes(token)) score += 3;
    });

    modelTokens.slice(0, 4).forEach((token, i) => {
      if (title.includes(token)) score += i === 0 ? 5 : 2;
    });

    // Landscape orientation is typical for car press photos
    if (info.width > 0 && info.height > 0 && info.width > info.height * 1.1) score += 2;

    // Prefer images with adequate resolution
    if (info.width >= 1600) score += 1;

    // Bonus for explicitly electric/EV context
    if (/\b(electric|ev|bev)\b/.test(title)) score += 2;

    // Penalise if no model token appears in filename at all
    if (modelTokens.length > 0 && !modelTokens.some((t) => title.includes(t))) score -= 4;

    return score;
  }

  async function resolveCarImage(car) {
    const minimumScore = 4;
    const queries = buildCommonsSearchQueries(car);
    let bestUrl = null;
    let bestScore = minimumScore;

    for (const query of queries) {
      const files = await fetchCommonsFiles(query);
      for (const file of files) {
        const score = scoreCommonsFile(file, car);
        if (score > bestScore) {
          bestScore = score;
          bestUrl = file.imageinfo?.[0]?.thumburl || null;
        }
      }
      if (bestScore >= 12) break; // confident enough — stop early
    }

    return bestUrl;
  }

  function createImageResult(url, source) {
    return { url, source };
  }

  function createFallbackImageResult(car) {
    return createImageResult(createBrandedFallbackImage(car) || fallbackCarImage, "fallback");
  }

  function getCarImageUrl(car) {
    if (resolvedCarImageSources.has(car.id)) {
      return Promise.resolve(resolvedCarImageSources.get(car.id));
    }

    const cachedFromStorage = getCachedCarImageUrl(car.id);
    if (cachedFromStorage) {
      const cachedResult = createImageResult(cachedFromStorage, "commons");
      resolvedCarImageSources.set(car.id, cachedResult);
      return Promise.resolve(cachedResult);
    }

    if (pendingCarImageRequests.has(car.id)) {
      return pendingCarImageRequests.get(car.id);
    }

    const request = resolveCarImage(car)
      .then((resolvedUrl) => {
        if (resolvedUrl) {
          const result = createImageResult(resolvedUrl, "commons");
          resolvedCarImageSources.set(car.id, result);
          setCachedCarImageUrl(car.id, resolvedUrl);
          return result;
        }
        const fallbackResult = createFallbackImageResult(car);
        resolvedCarImageSources.set(car.id, fallbackResult);
        return fallbackResult;
      })
      .catch(() => {
        const fallbackResult = createFallbackImageResult(car);
        resolvedCarImageSources.set(car.id, fallbackResult);
        return fallbackResult;
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

  function setDetailPanelImage(car) {
    const img = elements.detailImage;
    const attribution = elements.detailImageAttribution;
    if (!img || !car) return;

    img.dataset.carId = car.id;
    img.alt = `${car.brand} ${car.model}`;

    img.onerror = () => {
      const failedId = img.dataset.carId;
      const failedCar = failedId ? carById.get(failedId) : null;
      img.onerror = null;
      img.src = failedCar ? createBrandedFallbackImage(failedCar) : fallbackCarImage;
      if (attribution) attribution.hidden = true;
      if (failedId) {
        resolvedCarImageSources.delete(failedId);
        clearCachedCarImageUrl(failedId);
      }
    };

    const initialResult = resolvedCarImageSources.get(car.id);
    if (initialResult) {
      img.src = initialResult.url;
      if (attribution) attribution.hidden = initialResult.source !== "commons";
      return;
    }

    img.src = createBrandedFallbackImage(car) || fallbackCarImage;
    if (attribution) attribution.hidden = true;

    getCarImageUrl(car).then((result) => {
      if (img.dataset.carId !== car.id) return;
      img.src = result.url;
      if (attribution) attribution.hidden = result.source !== "commons";
    });
  }

  function renderDetailModal(car) {
    if (!elements.detailModal) return;

    const scoreDetails = getScoreDetails(car.id);
    const scorePercent = Math.round(scoreDetails.finalScore * 100);
    const averageSourceRating = average(car.sources.map((entry) => entry.rating));

    elements.detailBrand.textContent = `${car.brand} · ${car.year}`;
    elements.detailTitle.textContent = car.model;
    elements.detailMatchScore.textContent = `${scorePercent}% match`;
    setScorePillStyles(elements.detailMatchScore, scorePercent);
    elements.detailScoreCopy.textContent =
      `${car.sources.length} sources · Avg review ${averageSourceRating.toFixed(1)} / 10 · Expert score ${car.expertScore.toFixed(1)} / 10`;

    const specs = [
      ["Prijs", formatCurrency(car.priceEur)],
      ["WLTP-bereik", `${formatNumber(car.rangeKm)} km`],
      ["0–100 km/h", `${car.accel0to100.toFixed(1)} s`],
      ["Accu", `${formatNumber(car.batteryKwh)} kWh`],
      ["Snelladen", `${formatNumber(car.fastChargeKw)} kW`],
      ["Kofferbak", `${formatNumber(car.trunkLiters)} L`],
      ["Zitplaatsen", String(car.seats)],
      ["Carrosserie", car.bodyType],
      ["Comfortscore", `${car.comfortScore.toFixed(1)} / 10`],
      ["Expertscore", `${car.expertScore.toFixed(1)} / 10`]
    ];

    elements.detailSpecs.innerHTML = "";
    specs.forEach(([label, value]) => {
      elements.detailSpecs.append(buildDetailSpecItem(label, value));
    });

    const breakdownRows = [
      {
        label: "Eindmatch (80% persoonlijk + 20% expert)",
        score: scoreDetails.finalScore
      },
      {
        label: "Prijs-kwaliteit",
        score: scoreDetails.valueForMoneyScore,
        weightLabel: `${state.weights.value}/10`
      },
      {
        label: "Bereik",
        score: scoreDetails.rangeScore,
        weightLabel: `${state.weights.range}/10`
      },
      {
        label: "Prestaties",
        score: scoreDetails.performanceScore,
        weightLabel: `${state.weights.performance}/10`
      },
      {
        label: "Praktisch gebruik",
        score: scoreDetails.practicalityScore,
        weightLabel: `${state.weights.practicality}/10`
      },
      {
        label: "Comfort",
        score: scoreDetails.comfortScore,
        weightLabel: `${state.weights.comfort}/10`
      },
      {
        label: "Expertsentiment",
        score: scoreDetails.expertScoreNormalized,
        weightLabel: "vast 20%"
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

    setDetailPanelImage(car);
  }

  function openDetailModal(carId, { updateHash = true } = {}) {
    const car = carById.get(carId);
    if (!car || !elements.detailModal) return;
    const carGroup = groupByCarId.get(car.id);
    if (carGroup) {
      state.selectedVariantByGroupId.set(carGroup.id, car.id);
    }

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

    const hashCarGroup = groupByCarId.get(hashCarId);
    if (hashCarGroup) {
      state.selectedVariantByGroupId.set(hashCarGroup.id, hashCarId);
    }

    if (state.activeCarId === hashCarId) {
      renderDetailModal(carById.get(hashCarId));
      return;
    }

    openDetailModal(hashCarId, { updateHash: false });
  }

  function setCardImageAttribution(card, hasExternalImage) {
    const attribution = card.querySelector(".image-attribution");
    if (!attribution) return;
    attribution.hidden = !hasExternalImage;
  }

  function resolveImageForObservedCard(image) {
    const context = lazyCardImageContext.get(image);
    if (!context) return;
    const { card, car } = context;

    getCarImageUrl(car).then((result) => {
      if (image.dataset.carId !== car.id) return;
      if (image.src !== result.url) {
        image.src = result.url;
      }
      setCardImageAttribution(card, result.source === "commons");
    });
  }

  function getLazyCardImageObserver() {
    if (lazyCardImageObserver) return lazyCardImageObserver;
    if (!("IntersectionObserver" in window)) return null;

    lazyCardImageObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          resolveImageForObservedCard(entry.target);
        });
      },
      { rootMargin: "250px 0px", threshold: 0.05 }
    );

    return lazyCardImageObserver;
  }

  function setCardImage(card, car) {
    const image = card.querySelector(".car-image");
    if (!image) return;

    image.dataset.carId = car.id;
    image.alt = `${car.brand} ${car.model}`;
    image.loading = "lazy";
    image.decoding = "async";

    image.onerror = () => {
      const failedCarId = image.dataset.carId;
      const failedCar = failedCarId ? carById.get(failedCarId) : null;
      image.onerror = null;
      image.src = failedCar ? createBrandedFallbackImage(failedCar) : fallbackCarImage;
      setCardImageAttribution(card, false);
      if (failedCarId) {
        resolvedCarImageSources.delete(failedCarId);
        clearCachedCarImageUrl(failedCarId);
      }
    };

    const initialResult = resolvedCarImageSources.get(car.id);
    if (initialResult) {
      image.src = initialResult.url;
      setCardImageAttribution(card, initialResult.source === "commons");
      return;
    }

    image.src = createBrandedFallbackImage(car) || fallbackCarImage;
    setCardImageAttribution(card, false);

    lazyCardImageContext.set(image, { card, car });
    const observer = getLazyCardImageObserver();
    if (observer) {
      observer.observe(image);
    } else {
      resolveImageForObservedCard(image);
    }
  }

  // ── Rendering ───────────────────────────────────────────

  function renderSummary(filteredGroups) {
    if (!filteredGroups.length) {
      elements.resultsSummary.textContent =
        "Geen modelseries voldoen aan de filters. Maak het filter ruimer om meer varianten te vergelijken.";
      return;
    }

    const selectedCars = filteredGroups
      .map((entry) => getSelectedCarForGroup(entry.group, entry.variants, state.scoreMap))
      .filter(Boolean);
    const averagePrice = average(selectedCars.map((car) => car.priceEur));
    const averageRange = average(selectedCars.map((car) => car.rangeKm));
    elements.resultsSummary.textContent =
      `${filteredGroups.length} modelserie(s) — Gem. prijs (selectie) ${formatCurrency(averagePrice)} | Gem. WLTP-bereik ${formatNumber(averageRange)} km`;
  }

  function renderCards(sortedGroups, scoreMap) {
    elements.resultsGrid.innerHTML = "";

    if (!sortedGroups.length) {
      const empty = document.createElement("article");
      empty.className = "empty-state";
      empty.textContent =
        "Geen modelseries voor deze selectie. Verhoog de maximumprijs of verlaag het minimale bereik.";
      elements.resultsGrid.append(empty);
      return;
    }

    const fragment = document.createDocumentFragment();

    sortedGroups.forEach((entry, index) => {
      const { group, variants } = entry;
      const selectedCar = getSelectedCarForGroup(group, variants, scoreMap);
      if (!selectedCar) return;

      const card = template.content.firstElementChild.cloneNode(true);
      const cardScore = scoreMap.get(selectedCar.id);
      const scorePercent = Math.round((cardScore?.finalScore ?? 0) * 100);
      const groupRanges = getGroupRanges(variants);
      const variantLabel = getVariantLabel(group, selectedCar);

      // Hero image
      setCardImage(card, selectedCar);

      // Header
      card.querySelector(".car-brand").textContent = `${group.brand} · ${getYearLabel(variants)}`;
      card.querySelector(".car-model").textContent = group.baseModel;

      const activeVariantCopy = document.createElement("p");
      activeVariantCopy.className = "car-variant-active";
      activeVariantCopy.textContent =
        variants.length > 1 ? `Selected variant: ${variantLabel}` : "Single variant";
      card.querySelector(".car-card-header > div").append(activeVariantCopy);

      const pill = card.querySelector(".score-pill");
      pill.textContent = `${scorePercent}% match`;
      setScorePillStyles(pill, scorePercent);

      if (variants.length > 1) {
        const variantPicker = document.createElement("div");
        variantPicker.className = "variant-picker";

        const variantLabelCopy = document.createElement("span");
        variantLabelCopy.className = "variant-picker-label";
        variantLabelCopy.textContent = "Variant";

        const pillRow = document.createElement("div");
        pillRow.className = "variant-pills";
        pillRow.setAttribute("role", "tablist");

        variants.forEach((variant) => {
          const pill = document.createElement("button");
          pill.type = "button";
          pill.className = "variant-pill";
          pill.setAttribute("role", "tab");
          pill.dataset.carId = variant.id;
          pill.setAttribute("aria-selected", variant.id === selectedCar.id ? "true" : "false");
          pill.textContent = `${getVariantLabel(group, variant)} · ${formatCurrency(variant.priceEur)} · ${formatNumber(variant.rangeKm)} km`;
          pill.addEventListener("click", (event) => {
            event.stopPropagation();
            state.selectedVariantByGroupId.set(group.id, variant.id);
            render();
          });
          pill.addEventListener("keydown", (event) => {
            event.stopPropagation();
          });
          pillRow.append(pill);
        });

        ["click", "mousedown"].forEach((eventName) => {
          variantPicker.addEventListener(eventName, (event) => {
            event.stopPropagation();
          });
        });

        variantPicker.append(variantLabelCopy, pillRow);
        card.querySelector(".car-card-header").after(variantPicker);
      }

      const metrics = card.querySelector(".metric-list");
      metrics.append(
        buildMetricItem("Expert score", `${selectedCar.expertScore.toFixed(1)} / 10`),
        buildMetricItem("Price", formatCurrency(selectedCar.priceEur)),
        buildMetricItem("Range", `${formatNumber(selectedCar.rangeKm)} km`),
        buildMetricItem("0-100 km/h", `${selectedCar.accel0to100.toFixed(1)} s`),
        buildMetricItem("Trunk", `${formatNumber(selectedCar.trunkLiters)} L`),
        buildMetricItem("Fast charge", `${formatNumber(selectedCar.fastChargeKw)} kW`)
      );

      if (variants.length > 1) {
        const diffBlock = document.createElement("div");
        diffBlock.className = "variant-differences";

        const rangeChipList = document.createElement("div");
        rangeChipList.className = "variant-range-list";
        [
          ["Price range", formatRangeLabel(groupRanges.price.min, groupRanges.price.max, formatCurrency)],
          [
            "Range range",
            formatRangeLabel(groupRanges.range.min, groupRanges.range.max, formatNumber, " km")
          ],
          [
            "0-100 range",
            formatRangeLabel(
              groupRanges.acceleration.min,
              groupRanges.acceleration.max,
              (value) => value.toFixed(1),
              " s"
            )
          ]
        ].forEach(([label, value]) => {
          const chip = document.createElement("span");
          chip.className = "variant-range-chip";
          chip.textContent = `${label}: ${value}`;
          rangeChipList.append(chip);
        });

        const deltaCopy = document.createElement("p");
        deltaCopy.className = "variant-delta-copy";
        deltaCopy.textContent =
          `Selected vs cheapest: ${formatSignedCurrency(selectedCar.priceEur - groupRanges.price.min)} · ` +
          `vs shortest range: ${formatSignedNumber(selectedCar.rangeKm - groupRanges.range.min, " km")} · ` +
          `vs quickest 0-100: ${formatSignedNumber(selectedCar.accel0to100 - groupRanges.acceleration.min, " s")}`;

        diffBlock.append(rangeChipList, deltaCopy);
        metrics.after(diffBlock);
      }

      const segmentLine = card.querySelector(".segment-line");
      [selectedCar.bodyType, `${selectedCar.seats} seats`, `${selectedCar.batteryKwh} kWh`].forEach(
        (tag) => {
          const span = document.createElement("span");
          span.className = "segment-tag";
          span.textContent = tag;
          segmentLine.append(span);
        }
      );

      const sourceContainer = card.querySelector(".source-list");
      selectedCar.sources.forEach((entry) => {
        sourceContainer.append(buildSourceChip(entry));
      });

      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Open details for ${group.brand} ${selectedCar.model}`);

      const openFromCard = () => {
        state.triggerElement = card;
        openDetailModal(selectedCar.id);
      };

      card.addEventListener("click", (event) => {
        if (event.target.closest(".variant-picker")) return;
        openFromCard();
      });
      card.addEventListener("keydown", (event) => {
        if (event.target.closest(".variant-picker")) return;
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
    const filteredGroups = getFilteredGroups();
    const sortedGroups = sortGroups(filteredGroups, scoreMap);
    renderSummary(sortedGroups);
    renderCards(sortedGroups, scoreMap);

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

  function getNightAwareDefaultTheme() {
    const hour = new Date().getHours();
    return hour >= 20 || hour < 7 ? "dark" : "light";
  }

  function readStoredThemePreference() {
    try {
      return window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function getEffectiveTheme() {
    const stored = readStoredThemePreference();
    if (stored === "light" || stored === "dark") return stored;
    return getNightAwareDefaultTheme();
  }

  function applyTheme(theme) {
    const mode = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", mode);
    if (elements.themeToggle) {
      elements.themeToggle.setAttribute(
        "aria-label",
        mode === "dark" ? "Schakel naar lichte modus" : "Schakel naar donkere modus"
      );
    }
  }

  function persistThemePreference(theme) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      // ignore quota / private mode
    }
  }

  function initTheme() {
    applyTheme(getEffectiveTheme());
    elements.themeToggle?.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";
      persistThemePreference(next);
      applyTheme(next);
    });
  }

  function initialize() {
    initTheme();
    initializeEvNews();

    if (!cars.length) {
      elements.resultsSummary.textContent =
        "Geen EV-gegevens gevonden. Voeg items toe aan data/evData.js om resultaten te tonen.";
      return;
    }

    setupFilterPills();
    setupRangeInputs();
    setupWeightSliderTooltips();
    updateFilterLabelValues();
    updateWeightLabelValues();
    renderStatsBar();
    bindEvents();
    render();
    syncDetailFromHash();
  }

  initialize();
})();
