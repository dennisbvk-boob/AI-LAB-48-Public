(function () {
  "use strict";

  const cars = Array.isArray(window.evData) ? window.evData : [];
  const template = document.getElementById("carCardTemplate");

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
    statBrandCount: document.getElementById("statBrandCount")
  };

  const defaultWeights = {
    value: 7,
    range: 8,
    performance: 6,
    practicality: 7,
    comfort: 5
  };

  const fallbackCarImage = "./assets/car-placeholder.svg";
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

  const state = {
    search: "",
    bodyType: "all",
    source: "all",
    sortBy: "best-match",
    maxPrice: 0,
    minRange: 0,
    weights: { ...defaultWeights }
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

  // ── Math helpers ────────────────────────────────────────

  function average(values) {
    if (!values.length) return 0;
    return values.reduce((total, value) => total + value, 0) / values.length;
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
    const brands = new Set(cars.map((c) => c.brand));
    const sources = new Set();
    cars.forEach((c) => c.sources.forEach((s) => sources.add(s.source)));
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

  // ── Card building ───────────────────────────────────────

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

  function scoreColor(score) {
    if (score >= 80) return "#00ffa3";
    if (score >= 60) return "#fbbf24";
    return "#f87171";
  }

  function setCardImage(card, car) {
    const image = card.querySelector(".car-image");
    if (!image) return;
    image.alt = `${car.brand} ${car.model}`;
    image.onerror = () => {
      image.onerror = null;
      image.src = fallbackCarImage;
    };
    image.src = carImageSources[car.id] || fallbackCarImage;
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

      // Score pill
      const pill = card.querySelector(".score-pill");
      pill.textContent = `${scorePercent} match`;
      pill.style.color = scoreColor(scorePercent);
      pill.style.borderColor = `${scoreColor(scorePercent)}55`;
      pill.style.background = `${scoreColor(scorePercent)}18`;

      // Metrics
      const metrics = card.querySelector(".metric-list");
      metrics.append(
        buildMetricItem("Expert score", `${car.expertScore.toFixed(1)} / 10`),
        buildMetricItem("Price", formatCurrency(car.priceEur)),
        buildMetricItem("Range", `${formatNumber(car.rangeKm)} km`),
        buildMetricItem("0-100 km/h", `${car.accel0to100.toFixed(1)} s`),
        buildMetricItem("Trunk", `${formatNumber(car.trunkLiters)} L`),
        buildMetricItem("Fast charge", `${formatNumber(car.fastChargeKw)} kW`)
      );

      // Segment tags (replacing the old paragraph)
      const segmentLine = card.querySelector(".segment-line");
      [car.bodyType, `${car.seats} seats`, `${car.batteryKwh} kWh`].forEach((tag) => {
        const span = document.createElement("span");
        span.className = "segment-tag";
        span.textContent = tag;
        segmentLine.append(span);
      });

      // Source links
      const sourceContainer = card.querySelector(".source-list");
      car.sources.forEach((entry) => {
        const link = document.createElement("a");
        link.className = "source-link";
        link.href = entry.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = `${entry.source} (${entry.rating.toFixed(1)})`;
        sourceContainer.append(link);
      });

      // Staggered entrance animation
      card.style.transitionDelay = `${Math.min(index * 40, 400)}ms`;
      fragment.append(card);
    });

    elements.resultsGrid.append(fragment);

    // Trigger entrance via IntersectionObserver
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
    const filteredCars = getFilteredCars();
    const sortedCars = sortCars(filteredCars, scoreMap);
    renderSummary(sortedCars);
    renderCards(sortedCars, scoreMap);
  }

  // ── Events ──────────────────────────────────────────────

  function bindEvents() {
    elements.searchInput.addEventListener("input", (e) => {
      state.search = e.target.value;
      render();
    });

    elements.bodyTypeSelect.addEventListener("change", (e) => {
      state.bodyType = e.target.value;
      render();
    });

    elements.sourceSelect.addEventListener("change", (e) => {
      state.source = e.target.value;
      render();
    });

    elements.maxPriceInput.addEventListener("input", (e) => {
      state.maxPrice = Number(e.target.value);
      updateFilterLabelValues();
      render();
    });

    elements.minRangeInput.addEventListener("input", (e) => {
      state.minRange = Number(e.target.value);
      updateFilterLabelValues();
      render();
    });

    elements.sortSelect.addEventListener("change", (e) => {
      state.sortBy = e.target.value;
      render();
    });

    const weightBindings = [
      { key: "value",        input: elements.valueWeightInput },
      { key: "range",        input: elements.rangeWeightInput },
      { key: "performance",  input: elements.performanceWeightInput },
      { key: "practicality", input: elements.practicalityWeightInput },
      { key: "comfort",      input: elements.comfortWeightInput }
    ];

    weightBindings.forEach(({ key, input }) => {
      input.addEventListener("input", (e) => {
        state.weights[key] = Number(e.target.value);
        updateWeightLabelValues();
        render();
      });
    });

    elements.resetWeightsButton.addEventListener("click", () => {
      state.weights = { ...defaultWeights };
      elements.valueWeightInput.value        = String(defaultWeights.value);
      elements.rangeWeightInput.value        = String(defaultWeights.range);
      elements.performanceWeightInput.value  = String(defaultWeights.performance);
      elements.practicalityWeightInput.value = String(defaultWeights.practicality);
      elements.comfortWeightInput.value      = String(defaultWeights.comfort);
      updateWeightLabelValues();
      render();
    });
  }

  // ── Init ────────────────────────────────────────────────

  function initialize() {
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
  }

  initialize();
})();
