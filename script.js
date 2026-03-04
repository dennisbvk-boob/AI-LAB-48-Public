(function () {
  "use strict";

  const cars = Array.isArray(window.evData) ? window.evData : [];
  const carMap = new Map(cars.map((car) => [car.id, car]));
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
    statBrandCount: document.getElementById("statBrandCount"),
    carDetailModal: document.getElementById("carDetailModal"),
    closeDetailButton: document.getElementById("closeDetailButton"),
    detailBrand: document.getElementById("detailBrand"),
    detailTitle: document.getElementById("detailTitle"),
    detailSummary: document.getElementById("detailSummary"),
    detailMatchPill: document.getElementById("detailMatchPill"),
    detailSpecs: document.getElementById("detailSpecs"),
    detailBreakdown: document.getElementById("detailBreakdown"),
    detailPros: document.getElementById("detailPros"),
    detailCons: document.getElementById("detailCons"),
    detailSources: document.getElementById("detailSources"),
    detailBackdrop: document.querySelector("[data-close-detail]")
  };

  const defaultWeights = {
    value: 7,
    range: 8,
    performance: 6,
    practicality: 7,
    comfort: 5
  };

  const state = {
    search: "",
    bodyType: "all",
    source: "all",
    sortBy: "best-match",
    maxPrice: 0,
    minRange: 0,
    weights: { ...defaultWeights },
    scoreMap: new Map(),
    activeCarId: null
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

  function formatPercent(value) {
    return `${Math.round(clamp(value, 0, 1) * 100)}%`;
  }

  function getCarById(carId) {
    return carMap.get(carId) ?? null;
  }

  function getSelectedCarIdFromUrl() {
    const carId = new URL(window.location.href).searchParams.get("car");
    return carId && carMap.has(carId) ? carId : null;
  }

  function updateUrlForSelectedCar(carId, { replace = false } = {}) {
    const url = new URL(window.location.href);

    if (carId) {
      url.searchParams.set("car", carId);
    } else {
      url.searchParams.delete("car");
    }

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl === currentUrl) return;

    const method = replace ? "replaceState" : "pushState";
    window.history[method]({ modalCarId: carId ?? null }, "", nextUrl);
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

  function createDetailSpecItem(label, value) {
    const wrapper = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    wrapper.append(dt, dd);
    return wrapper;
  }

  function buildProsAndCons(car, scoreData) {
    const pros = [];
    const cons = [];
    const averagePrice = average(cars.map((entry) => entry.priceEur));
    const averageTrunk = average(cars.map((entry) => entry.trunkLiters));

    if (scoreData.rangeScore >= 0.7) {
      pros.push("Excellent WLTP range for longer trips.");
    }
    if (scoreData.performanceScore >= 0.65) {
      pros.push("Strong acceleration for confident overtakes.");
    }
    if (scoreData.practicalityScore >= 0.65) {
      pros.push("Practical package with useful charging and space balance.");
    }
    if (scoreData.comfortScore >= 0.7) {
      pros.push("Comfort score is above average for this segment.");
    }
    if (car.fastChargeKw >= 200) {
      pros.push("Fast DC charging helps keep charging stops shorter.");
    }
    if (scoreData.valueForMoneyScore >= 0.65) {
      pros.push("Solid value considering price, range and expert sentiment.");
    }

    if (car.priceEur > averagePrice * 1.12) {
      cons.push("Price sits above the current dataset average.");
    }
    if (scoreData.rangeScore < 0.45) {
      cons.push("WLTP range is below many alternatives in the list.");
    }
    if (scoreData.performanceScore < 0.45) {
      cons.push("Acceleration is less sporty than top performers.");
    }
    if (car.fastChargeKw < 160) {
      cons.push("Fast-charging peak is on the lower side.");
    }
    if (car.trunkLiters < averageTrunk * 0.9) {
      cons.push("Cargo space is less generous than the average EV here.");
    }
    if (scoreData.comfortScore < 0.45) {
      cons.push("Comfort score trails the segment leaders.");
    }

    const fallbackPros = [
      "Balanced overall package with no major weak spots.",
      "Good blend of EV specs and expert review sentiment.",
      "Consistent all-round score against filtered competitors."
    ];
    const fallbackCons = [
      "Not every spec category is class-leading.",
      "Final fit still depends on your weighting priorities.",
      "Real-world range and charging can vary by conditions."
    ];

    for (const item of fallbackPros) {
      if (pros.length >= 3) break;
      if (!pros.includes(item)) pros.push(item);
    }
    for (const item of fallbackCons) {
      if (cons.length >= 3) break;
      if (!cons.includes(item)) cons.push(item);
    }

    return {
      pros: pros.slice(0, 3),
      cons: cons.slice(0, 3)
    };
  }

  function renderDetailBreakdown(scoreData) {
    const entries = [
      {
        label: "Overall match score",
        value: scoreData.finalScore,
        helper: "Personal score + expert consensus"
      },
      {
        label: "Value for money",
        value: scoreData.valueForMoneyScore,
        helper: `Weight ${state.weights.value}/10`
      },
      {
        label: "Range priority",
        value: scoreData.rangeScore,
        helper: `Weight ${state.weights.range}/10`
      },
      {
        label: "Performance priority",
        value: scoreData.performanceScore,
        helper: `Weight ${state.weights.performance}/10`
      },
      {
        label: "Practicality priority",
        value: scoreData.practicalityScore,
        helper: `Weight ${state.weights.practicality}/10`
      },
      {
        label: "Comfort priority",
        value: scoreData.comfortScore,
        helper: `Weight ${state.weights.comfort}/10`
      },
      {
        label: "Expert consensus",
        value: scoreData.expertScoreNormalized,
        helper: "20% contribution to final score"
      }
    ];

    elements.detailBreakdown.innerHTML = "";

    entries.forEach((entry) => {
      const li = document.createElement("li");
      const row = document.createElement("div");
      row.className = "detail-breakdown-row";

      const label = document.createElement("span");
      label.textContent = entry.label;

      const percent = document.createElement("strong");
      percent.textContent = formatPercent(entry.value);

      const helper = document.createElement("p");
      helper.className = "detail-breakdown-helper";
      helper.textContent = entry.helper;

      const track = document.createElement("div");
      track.className = "detail-breakdown-track";
      const fill = document.createElement("div");
      fill.className = "detail-breakdown-fill";
      fill.style.width = formatPercent(entry.value);

      row.append(label, percent);
      track.append(fill);
      li.append(row, helper, track);
      elements.detailBreakdown.append(li);
    });
  }

  function renderCarDetail(car, scoreData) {
    const matchPercent = Math.round((scoreData?.finalScore ?? 0) * 100);
    const matchColor = scoreColor(matchPercent);

    elements.detailBrand.textContent = `${car.brand} · ${car.year}`;
    elements.detailTitle.textContent = car.model;
    elements.detailSummary.textContent =
      `${car.bodyType} · ${car.seats} seats · ${formatCurrency(car.priceEur)} · ${formatNumber(car.rangeKm)} km WLTP`;
    elements.detailMatchPill.textContent = `${matchPercent}% personal match`;
    elements.detailMatchPill.style.color = matchColor;
    elements.detailMatchPill.style.borderColor = `${matchColor}66`;
    elements.detailMatchPill.style.backgroundColor = `${matchColor}1a`;

    const specItems = [
      ["Brand", car.brand],
      ["Model year", String(car.year)],
      ["Body type", car.bodyType],
      ["Seats", String(car.seats)],
      ["Price", formatCurrency(car.priceEur)],
      ["WLTP range", `${formatNumber(car.rangeKm)} km`],
      ["0-100 km/h", `${car.accel0to100.toFixed(1)} s`],
      ["Battery capacity", `${formatNumber(car.batteryKwh)} kWh`],
      ["Fast charge peak", `${formatNumber(car.fastChargeKw)} kW`],
      ["Trunk volume", `${formatNumber(car.trunkLiters)} L`],
      ["Comfort score", `${car.comfortScore.toFixed(1)} / 10`],
      ["Expert score", `${car.expertScore.toFixed(1)} / 10`]
    ];

    elements.detailSpecs.innerHTML = "";
    specItems.forEach(([label, value]) => {
      elements.detailSpecs.append(createDetailSpecItem(label, value));
    });

    renderDetailBreakdown(scoreData);

    const summary = buildProsAndCons(car, scoreData);
    elements.detailPros.innerHTML = "";
    summary.pros.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      elements.detailPros.append(li);
    });
    elements.detailCons.innerHTML = "";
    summary.cons.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      elements.detailCons.append(li);
    });

    elements.detailSources.innerHTML = "";
    car.sources.forEach((entry) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.className = "detail-source-link";
      link.href = entry.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      const sourceHeader = document.createElement("div");
      sourceHeader.className = "detail-source-header";
      const sourceName = document.createElement("span");
      sourceName.className = "detail-source-name";
      sourceName.textContent = entry.source;
      const sourceRating = document.createElement("span");
      sourceRating.className = "detail-source-rating";
      sourceRating.textContent = `${entry.rating.toFixed(1)} / 10`;
      sourceHeader.append(sourceName, sourceRating);

      const title = document.createElement("p");
      title.className = "detail-source-title";
      title.textContent = entry.title;

      link.append(sourceHeader, title);
      li.append(link);
      elements.detailSources.append(li);
    });
  }

  function openCarDetail(carId, { syncUrl = true, replaceHistory = false } = {}) {
    const car = getCarById(carId);
    if (!car || !elements.carDetailModal) return;

    const scoreData = state.scoreMap.get(carId) ?? computeScoreMap().get(carId);
    if (!scoreData) return;

    state.activeCarId = carId;
    renderCarDetail(car, scoreData);
    elements.carDetailModal.hidden = false;
    document.body.classList.add("modal-open");

    if (syncUrl) {
      updateUrlForSelectedCar(carId, { replace: replaceHistory });
    }
  }

  function closeCarDetail({ syncUrl = true, replaceHistory = false } = {}) {
    if (!elements.carDetailModal) return;

    state.activeCarId = null;
    elements.carDetailModal.hidden = true;
    document.body.classList.remove("modal-open");

    if (syncUrl) {
      updateUrlForSelectedCar(null, { replace: replaceHistory });
    }
  }

  function requestCloseCarDetail() {
    const currentUrlCarId = getSelectedCarIdFromUrl();
    if (
      currentUrlCarId &&
      window.history.state &&
      window.history.state.modalCarId === currentUrlCarId
    ) {
      window.history.back();
      return;
    }

    closeCarDetail({ syncUrl: Boolean(currentUrlCarId), replaceHistory: true });
  }

  function syncDetailViewWithUrl() {
    const url = new URL(window.location.href);
    const rawCarId = url.searchParams.get("car");
    const selectedCarId = getSelectedCarIdFromUrl();

    if (rawCarId && !selectedCarId) {
      closeCarDetail({ syncUrl: false });
      updateUrlForSelectedCar(null, { replace: true });
      return;
    }

    if (!selectedCarId) {
      if (state.activeCarId) {
        closeCarDetail({ syncUrl: false });
      }
      return;
    }

    openCarDetail(selectedCarId, { syncUrl: false });
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
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute(
        "aria-label",
        `View details for ${car.brand} ${car.model}`
      );

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
        link.addEventListener("click", (event) => {
          event.stopPropagation();
        });
        sourceContainer.append(link);
      });

      card.addEventListener("click", (event) => {
        if (event.target.closest(".source-link")) return;
        openCarDetail(car.id);
      });

      card.addEventListener("keydown", (event) => {
        if (event.target !== card) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openCarDetail(car.id);
        }
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
    state.scoreMap = scoreMap;
    const filteredCars = getFilteredCars();
    const sortedCars = sortCars(filteredCars, scoreMap);
    renderSummary(sortedCars);
    renderCards(sortedCars, scoreMap);

    if (state.activeCarId) {
      const activeCar = getCarById(state.activeCarId);
      const activeScore = activeCar ? scoreMap.get(activeCar.id) : null;
      if (activeCar && activeScore) {
        renderCarDetail(activeCar, activeScore);
      }
    }
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

    if (elements.closeDetailButton) {
      elements.closeDetailButton.addEventListener("click", requestCloseCarDetail);
    }

    if (elements.detailBackdrop) {
      elements.detailBackdrop.addEventListener("click", requestCloseCarDetail);
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.activeCarId) {
        event.preventDefault();
        requestCloseCarDetail();
      }
    });

    window.addEventListener("popstate", () => {
      syncDetailViewWithUrl();
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
    syncDetailViewWithUrl();
  }

  initialize();
})();
