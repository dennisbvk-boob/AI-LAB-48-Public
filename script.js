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
    resetWeightsButton: document.getElementById("resetWeightsButton")
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
    weights: { ...defaultWeights }
  };

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

  function average(values) {
    if (!values.length) {
      return 0;
    }
    return values.reduce((total, value) => total + value, 0) / values.length;
  }

  function normalize(value, min, max) {
    if (max === min) {
      return 0.5;
    }
    return (value - min) / (max - min);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getRange(values) {
    return {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  function getAllBodyTypes() {
    return [...new Set(cars.map((car) => car.bodyType))].sort((a, b) =>
      a.localeCompare(b)
    );
  }

  function getAllSources() {
    const allSourceNames = [];
    cars.forEach((car) => {
      car.sources.forEach((entry) => {
        allSourceNames.push(entry.source);
      });
    });
    return [...new Set(allSourceNames)].sort((a, b) => a.localeCompare(b));
  }

  function setupSelectOptions() {
    const bodyTypes = getAllBodyTypes();
    const sources = getAllSources();

    bodyTypes.forEach((type) => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      elements.bodyTypeSelect.append(option);
    });

    sources.forEach((source) => {
      const option = document.createElement("option");
      option.value = source;
      option.textContent = source;
      elements.sourceSelect.append(option);
    });
  }

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

  function updateFilterLabelValues() {
    elements.maxPriceValue.textContent = formatCurrency(state.maxPrice);
    elements.minRangeValue.textContent = `${formatNumber(state.minRange)} km`;
  }

  function updateWeightLabelValues() {
    elements.valueWeightValue.textContent = String(state.weights.value);
    elements.rangeWeightValue.textContent = String(state.weights.range);
    elements.performanceWeightValue.textContent = String(state.weights.performance);
    elements.practicalityWeightValue.textContent = String(state.weights.practicality);
    elements.comfortWeightValue.textContent = String(state.weights.comfort);
  }

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

      const finalScore = clamp(weightedPersonalScore * 0.8 + expertScoreNormalized * 0.2, 0, 1);
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

  function getFilteredCars() {
    const query = state.search.trim().toLowerCase();

    return cars.filter((car) => {
      const searchable = `${car.brand} ${car.model}`.toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesBodyType = state.bodyType === "all" || car.bodyType === state.bodyType;
      const matchesSource =
        state.source === "all" ||
        car.sources.some((entry) => entry.source.toLowerCase() === state.source.toLowerCase());
      const matchesPrice = car.priceEur <= state.maxPrice;
      const matchesRange = car.rangeKm >= state.minRange;

      return (
        matchesSearch &&
        matchesBodyType &&
        matchesSource &&
        matchesPrice &&
        matchesRange
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

  function renderSummary(filteredCars) {
    if (!filteredCars.length) {
      elements.resultsSummary.textContent =
        "No cars match the selected filters. Broaden your filters to compare more models.";
      return;
    }

    const averagePrice = average(filteredCars.map((car) => car.priceEur));
    const averageRange = average(filteredCars.map((car) => car.rangeKm));
    elements.resultsSummary.textContent =
      `${filteredCars.length} car(s) found. Avg. price ${formatCurrency(averagePrice)} | Avg. WLTP range ${formatNumber(averageRange)} km.`;
  }

  function renderCards(sortedCars, scoreMap) {
    elements.resultsGrid.innerHTML = "";

    if (!sortedCars.length) {
      const empty = document.createElement("article");
      empty.className = "empty-state";
      empty.textContent =
        "No results available for the current selection. Try increasing max price or lowering min range.";
      elements.resultsGrid.append(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    sortedCars.forEach((car) => {
      const card = template.content.firstElementChild.cloneNode(true);
      const cardScore = scoreMap.get(car.id);

      card.querySelector(".car-brand").textContent = `${car.brand} | ${car.year}`;
      card.querySelector(".car-model").textContent = car.model;
      card.querySelector(".score-pill").textContent = `${Math.round(
        (cardScore?.finalScore ?? 0) * 100
      )} match`;

      const metrics = card.querySelector(".metric-list");
      metrics.append(
        buildMetricItem("Expert score", `${car.expertScore.toFixed(1)} / 10`),
        buildMetricItem("Price", formatCurrency(car.priceEur)),
        buildMetricItem("Range", `${formatNumber(car.rangeKm)} km`),
        buildMetricItem("0-100 km/h", `${car.accel0to100.toFixed(1)} s`),
        buildMetricItem("Trunk", `${formatNumber(car.trunkLiters)} L`),
        buildMetricItem("Fast charge", `${formatNumber(car.fastChargeKw)} kW`)
      );

      card.querySelector(".segment-line").textContent =
        `${car.bodyType} | ${car.seats} seats | Battery ${car.batteryKwh} kWh`;

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

      fragment.append(card);
    });

    elements.resultsGrid.append(fragment);
  }

  function render() {
    const scoreMap = computeScoreMap();
    const filteredCars = getFilteredCars();
    const sortedCars = sortCars(filteredCars, scoreMap);
    renderSummary(sortedCars);
    renderCards(sortedCars, scoreMap);
  }

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

    weightBindings.forEach((binding) => {
      binding.input.addEventListener("input", (event) => {
        state.weights[binding.key] = Number(event.target.value);
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
  }

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
    bindEvents();
    render();
  }

  initialize();
})();
