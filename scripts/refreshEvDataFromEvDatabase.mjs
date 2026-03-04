#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const EV_DATABASE_URL = "https://ev-database.org/";
const ALLOWED_AVAILABILITY = new Set(["current", "upcoming"]);

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputFile = path.join(projectRoot, "data", "evData.js");

function decodeHtmlEntities(input) {
  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-fA-F0-9]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(input) {
  return input.replace(/<[^>]+>/g, " ");
}

function cleanText(input) {
  return decodeHtmlEntities(stripTags(input)).replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (!value) return null;
  const normalized = String(value).replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInt(value) {
  const parsed = toNumber(value);
  return parsed === null ? null : Math.round(parsed);
}

function pick(chunk, regex, cleaner = (value) => value) {
  const match = chunk.match(regex);
  if (!match) return null;
  return cleaner(match[1]);
}

function slugify(text) {
  return decodeHtmlEntities(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function getRange(values) {
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

function normalize(value, min, max) {
  if (max === min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}

function median(values) {
  const filtered = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!filtered.length) return 0;
  const midpoint = Math.floor(filtered.length / 2);
  if (filtered.length % 2 === 1) return filtered[midpoint];
  return (filtered[midpoint - 1] + filtered[midpoint]) / 2;
}

async function fetchHomePage() {
  const response = await fetch(EV_DATABASE_URL, {
    headers: {
      "user-agent": "EV-Verdict-Data-Refresh/1.0 (+https://ev-database.org/)"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch EV-Database homepage (${response.status}).`);
  }

  return response.text();
}

function parseVehicles(html) {
  const chunks = html.split('<div class="list-item" data-jplist-item>').slice(1);
  const parsed = [];
  const idCounts = new Map();

  for (const chunk of chunks) {
    const availability = pick(chunk, /<div class="availability\s+([^"]+)"/i);
    if (!availability || !ALLOWED_AVAILABILITY.has(availability)) continue;

    const vehiclePath = pick(chunk, /<a href="(\/car\/\d+\/[^"]+)" class="title">/i);
    if (!vehiclePath) continue;

    const vehicleId = pick(chunk, /data-vehicle-id="(\d+)"/i, toInt);
    const brand =
      pick(chunk, /class="title">\s*<span class="[^"]+">([\s\S]*?)<\/span>\s*<span class="model">/i, cleanText) ??
      "";
    const modelRaw =
      pick(chunk, /<span class="model">([\s\S]*?)<\/span>\s*<span class="hidden">/i, cleanText) ?? "";
    const model = modelRaw.replace(/\s*\(MY\d+\)\s*/gi, " ").replace(/\s+/g, " ").trim();
    const year = pick(chunk, /<span class="year_from hidden">(\d+)<\/span>/i, toInt);
    const bodyType = pick(chunk, /<span class="shape-[^"]+\s+hidden">([^<]+)<\/span>/i, cleanText) ?? "Unknown";
    const seats = pick(chunk, /class="seats-(\d+)/i, toInt);
    const priceEur = pick(chunk, /<span class="pricesort hidden">(-?\d+)<\/span>/i, toInt);
    const rangeKm = pick(chunk, /<span class="erange_real">([\d.,]+)\s*km<\/span>/i, toInt);
    const accel0to100 = pick(chunk, /<span class="acceleration hidden">([\d.,]+)<\/span>/i, toNumber);
    const trunkLiters = pick(chunk, /<span class="cargosort hidden">([\d.,-]+)<\/span>/i, toInt);
    const fastChargeKw = pick(chunk, /<span class="fastcharge_speed hidden">([\d.,]+)<\/span>/i, toInt);
    const batteryKwh = pick(chunk, /<span class="battery hidden">([\d.,]+)<\/span>/i, toNumber);
    const pricePerRange = pick(chunk, /<span class="priceperrange hidden">([\d.,]+)<\/span>/i, toNumber);

    if (!brand || !model) continue;
    if (!priceEur || priceEur <= 0) continue;
    if (!rangeKm || rangeKm <= 0) continue;
    if (!accel0to100 || accel0to100 <= 0) continue;

    const baseId = `${slugify(brand)}-${slugify(model)}`;
    const existingCount = idCounts.get(baseId) ?? 0;
    idCounts.set(baseId, existingCount + 1);
    const id = existingCount > 0 ? `${baseId}-${vehicleId ?? existingCount + 1}` : baseId;

    parsed.push({
      id,
      brand,
      model,
      year: year ?? new Date().getFullYear(),
      bodyType,
      seats: seats ?? null,
      priceEur,
      rangeKm,
      accel0to100,
      trunkLiters: trunkLiters ?? null,
      fastChargeKw: fastChargeKw ?? null,
      batteryKwh: batteryKwh ?? null,
      pricePerRange: pricePerRange ?? null,
      vehiclePath
    });
  }

  return parsed;
}

function completeAndScoreVehicles(vehicles) {
  const seatMedian = median(vehicles.map((car) => car.seats ?? NaN));
  const trunkMedian = median(vehicles.map((car) => car.trunkLiters ?? NaN));
  const chargeMedian = median(vehicles.map((car) => car.fastChargeKw ?? NaN));
  const batteryMedian = median(vehicles.map((car) => car.batteryKwh ?? NaN));

  vehicles.forEach((car) => {
    car.seats = car.seats ?? Math.max(2, Math.round(seatMedian || 5));
    car.trunkLiters = car.trunkLiters ?? Math.max(120, Math.round(trunkMedian || 420));
    car.fastChargeKw = car.fastChargeKw ?? Math.max(50, Math.round(chargeMedian || 140));
    car.batteryKwh = car.batteryKwh ?? round1(Math.max(20, batteryMedian || 70));
    car.pricePerRange = car.pricePerRange ?? car.priceEur / car.rangeKm;
  });

  const ranges = getRange(vehicles.map((car) => car.rangeKm));
  const accel = getRange(vehicles.map((car) => car.accel0to100));
  const cargo = getRange(vehicles.map((car) => car.trunkLiters));
  const charge = getRange(vehicles.map((car) => car.fastChargeKw));
  const battery = getRange(vehicles.map((car) => car.batteryKwh));
  const value = getRange(vehicles.map((car) => car.pricePerRange));

  const shaped = vehicles.map((car) => {
    const rangeNorm = normalize(car.rangeKm, ranges.min, ranges.max);
    const accelNorm = 1 - normalize(car.accel0to100, accel.min, accel.max);
    const trunkNorm = normalize(car.trunkLiters, cargo.min, cargo.max);
    const chargeNorm = normalize(car.fastChargeKw, charge.min, charge.max);
    const batteryNorm = normalize(car.batteryKwh, battery.min, battery.max);
    const seatsNorm = normalize(car.seats, 2, 7);
    const valueNorm = 1 - normalize(car.pricePerRange, value.min, value.max);

    const expertRaw =
      rangeNorm * 0.3 +
      chargeNorm * 0.25 +
      accelNorm * 0.2 +
      valueNorm * 0.15 +
      batteryNorm * 0.1;
    const comfortRaw = trunkNorm * 0.45 + rangeNorm * 0.25 + seatsNorm * 0.2 + batteryNorm * 0.1;

    const expertScore = round1(clamp(6 + expertRaw * 3.7, 5.8, 9.8));
    const comfortScore = round1(clamp(6 + comfortRaw * 3.4, 5.8, 9.8));

    return {
      id: car.id,
      brand: car.brand,
      model: car.model,
      year: car.year,
      bodyType: car.bodyType,
      seats: car.seats,
      priceEur: car.priceEur,
      rangeKm: car.rangeKm,
      accel0to100: round1(car.accel0to100),
      trunkLiters: car.trunkLiters,
      fastChargeKw: car.fastChargeKw,
      batteryKwh: round1(car.batteryKwh),
      comfortScore,
      expertScore,
      sources: [
        {
          source: "EVbase",
          title: `${car.brand} ${car.model} specs`,
          url: `https://ev-database.org${car.vehiclePath}`,
          rating: expertScore
        }
      ]
    };
  });

  return shaped.sort((a, b) => {
    const brandSort = a.brand.localeCompare(b.brand);
    if (brandSort !== 0) return brandSort;
    return a.model.localeCompare(b.model);
  });
}

async function main() {
  const html = await fetchHomePage();
  const parsed = parseVehicles(html);

  if (!parsed.length) {
    throw new Error("No vehicles parsed from EV-Database.");
  }

  const finalVehicles = completeAndScoreVehicles(parsed);
  const output = `window.evData = ${JSON.stringify(finalVehicles, null, 2)};\n`;
  await writeFile(outputFile, output, "utf8");

  const hasKiaEv3 = finalVehicles.some((car) => /kia/i.test(car.brand) && /\bev3\b/i.test(car.model));
  const hasKiaEv5 = finalVehicles.some((car) => /kia/i.test(car.brand) && /\bev5\b/i.test(car.model));
  const hasKiaEv2 = finalVehicles.some((car) => /kia/i.test(car.brand) && /\bev2\b/i.test(car.model));
  const hasAudiA6 = finalVehicles.some((car) => /audi/i.test(car.brand) && /a6/i.test(car.model));

  console.log(`Wrote ${finalVehicles.length} EV entries to data/evData.js`);
  console.log(`Includes Kia EV3: ${hasKiaEv3 ? "yes" : "no"}`);
  console.log(`Includes Kia EV5: ${hasKiaEv5 ? "yes" : "no"}`);
  console.log(`Includes Kia EV2: ${hasKiaEv2 ? "yes" : "no"}`);
  console.log(`Includes Audi A6 e-tron variants: ${hasAudiA6 ? "yes" : "no"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
