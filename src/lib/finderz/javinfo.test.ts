import assert from "node:assert/strict";
import { test } from "node:test";
import { mapJavinfoResults } from "./javinfo.ts";

test("maps JAVINFO metadata without exposing provider extras", () => {
  const finds = mapJavinfoResults({
    source: "javdatabase",
    results: [
      {
        id: "ssis00001",
        dvdId: "SSIS-001",
        title: "Catalog title",
        cover: "https://images.example.test/cover.jpg",
        releaseDate: "2021-02-19",
        extra: {
          url: "https://catalog.example.test/movie/ssis-001",
          streams: { master: "https://media.example.test/playlist.m3u8" },
          downloadLinks: [{ magnet: "magnet:?xt=private" }],
        },
      },
    ],
  });

  assert.equal(finds.length, 1);
  assert.deepEqual(finds[0], {
    id: "javinfo:javdatabase:ssis00001",
    title: "Catalog title",
    year: 2021,
    genres: [],
    synopsis: "",
    poster: "https://images.example.test/cover.jpg",
    catalogCode: "SSIS-001",
    provider: "javinfo",
    providerUrl: "https://catalog.example.test/movie/ssis-001",
    kind: "film",
  });
});

test("ignores malformed results and non-HTTPS media links", () => {
  const finds = mapJavinfoResults({
    source: "fanza",
    results: [
      null,
      {
        title: "No cover",
        cover: "http://images.example.test/cover.jpg",
        extra: { url: "javascript:alert(1)" },
      },
      { id: "empty", title: " " },
    ],
  });

  assert.equal(finds.length, 1);
  assert.equal(finds[0].poster, undefined);
  assert.equal(finds[0].providerUrl, "https://javinfo.dev/");
});

test("returns an empty list for an invalid API response", () => {
  assert.deepEqual(mapJavinfoResults(null), []);
  assert.deepEqual(mapJavinfoResults({ results: {} }), []);
});