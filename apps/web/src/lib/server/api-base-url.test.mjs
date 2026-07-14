import assert from "node:assert/strict";
import test from "node:test";
import { resolveApiBaseUrl } from "./api-base-url.mjs";

test("a branch deploy calls the API bundled in the same deploy", () => {
  const result = resolveApiBaseUrl({
    requestUrl: "https://adminypagos--proyectofirmador.netlify.app/dashboard",
    configuredBaseUrl: "https://proyectofirmador.netlify.app",
  });

  assert.equal(result, "https://adminypagos--proyectofirmador.netlify.app");
});

test("a Netlify custom domain calls its same-origin function", () => {
  const result = resolveApiBaseUrl({
    requestUrl: "https://firmador.example.com/balance",
    configuredBaseUrl: "https://old-api.example.com",
    netlifyRuntime: true,
  });

  assert.equal(result, "https://firmador.example.com");
});

test("local development keeps the separately configured API", () => {
  const result = resolveApiBaseUrl({
    requestUrl: "http://localhost:4321/dashboard",
    configuredBaseUrl: "http://localhost:3000",
  });

  assert.equal(result, "http://localhost:3000");
});
