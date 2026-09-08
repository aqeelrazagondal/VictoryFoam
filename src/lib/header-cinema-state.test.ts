import assert from "node:assert/strict";
import { test } from "node:test";

import { computeCinemaHeaderState } from "./header-cinema-state.ts";

test("non-home routes keep a normal visible header", () => {
  const state = computeCinemaHeaderState({
    isHome: false,
    isDesktop: true,
    cinemaRect: { top: -800, bottom: 2000 },
  });
  assert.equal(state.overCinema, false);
  assert.equal(state.headerVisible, true);
});

test("mobile never uses cinema chrome", () => {
  const state = computeCinemaHeaderState({
    isHome: true,
    isDesktop: false,
    cinemaRect: { top: -800, bottom: 2000 },
  });
  assert.equal(state.overCinema, false);
  assert.equal(state.headerVisible, true);
});

test("desktop homepage keeps cinema chrome before the cinema node mounts", () => {
  const state = computeCinemaHeaderState({
    isHome: true,
    isDesktop: true,
    cinemaRect: null,
  });
  assert.equal(state.overCinema, true);
  assert.equal(state.headerVisible, true);
});

test("early explode stage keeps cinema chrome and a visible header", () => {
  const state = computeCinemaHeaderState({
    isHome: true,
    isDesktop: true,
    cinemaRect: { top: -200, bottom: 3800 },
  });
  assert.equal(state.overCinema, true);
  assert.equal(state.headerVisible, true);
});

test("middle memory-foam stage keeps cinema chrome", () => {
  const state = computeCinemaHeaderState({
    isHome: true,
    isDesktop: true,
    cinemaRect: { top: -1800, bottom: 2200 },
  });
  assert.equal(state.overCinema, true);
  assert.equal(state.headerVisible, true);
});

test("last cinema stage still uses cinema chrome when scrolling up", () => {
  const state = computeCinemaHeaderState({
    isHome: true,
    isDesktop: true,
    cinemaRect: { top: -3200, bottom: 900 },
  });
  assert.equal(state.overCinema, true);
  assert.equal(state.headerVisible, true);
});

test("cinema chrome stays on while any cinema still covers the header band", () => {
  const state = computeCinemaHeaderState({
    isHome: true,
    isDesktop: true,
    cinemaRect: { top: -4000, bottom: 80 },
  });
  assert.equal(state.overCinema, true);
  assert.equal(state.headerVisible, true);
});

test("header returns to page chrome only after cinema has left the viewport", () => {
  const state = computeCinemaHeaderState({
    isHome: true,
    isDesktop: true,
    cinemaRect: { top: -5000, bottom: -20 },
  });
  assert.equal(state.overCinema, false);
  assert.equal(state.headerVisible, true);
});

test("homepage start still treats the cinema as covering the header", () => {
  const state = computeCinemaHeaderState({
    isHome: true,
    isDesktop: true,
    cinemaRect: { top: 72, bottom: 4200 },
  });
  assert.equal(state.overCinema, true);
  assert.equal(state.headerVisible, true);
});

test("header-sized cinema offset still uses cinema chrome", () => {
  const state = computeCinemaHeaderState({
    isHome: true,
    isDesktop: true,
    cinemaRect: { top: 88, bottom: 4200 },
  });
  assert.equal(state.overCinema, true);
  assert.equal(state.headerVisible, true);
});

test("last-stage remnant still covering the header keeps cinema chrome", () => {
  const state = computeCinemaHeaderState({
    isHome: true,
    isDesktop: true,
    cinemaRect: { top: -4100, bottom: 110 },
  });
  assert.equal(state.overCinema, true);
  assert.equal(state.headerVisible, true);
});
