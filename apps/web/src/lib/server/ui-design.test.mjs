import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("the global stylesheet exposes the Firmaliza design tokens and primitives", async () => {
  const css = await read("../../styles/global.css");

  for (const contract of [
    "--ink-800: #003443",
    "--coral-500: #f76d5a",
    "--gradient-page:",
    "--shadow-panel:",
    ".button-accent",
    ".button-ghost",
    ".alert",
    ".badge",
    "prefers-reduced-motion",
  ]) {
    assert.match(css, new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("the application shell uses branded responsive navigation", async () => {
  const layout = await read("../../layouts/AppLayout.astro");

  assert.match(layout, /firmaliza-logo\.png/);
  assert.match(layout, /aria-label="Navegación principal"/);
  assert.match(layout, /<details/);
  assert.match(layout, /credits\?: number/);
  assert.match(layout, /Astro\.url\.pathname/);
});

test("shared visual components exist as server-rendered Astro primitives", async () => {
  const files = [
    "../../components/ui/Alert.astro",
    "../../components/ui/Badge.astro",
    "../../components/ui/EmptyState.astro",
    "../../components/ui/PageHeader.astro",
    "../../components/ui/Panel.astro",
  ];

  await Promise.all(files.map((file) => read(file)));
});

test("all product flows use the redesigned page hierarchy", async () => {
  const pages = [
    "../../pages/index.astro",
    "../../pages/login.astro",
    "../../pages/register/complete.astro",
    "../../pages/enrollment/challenge.astro",
    "../../pages/dashboard.astro",
    "../../pages/identity.astro",
    "../../pages/history.astro",
    "../../pages/sign/new.astro",
    "../../pages/sign/[processId]/payment.astro",
    "../../pages/sign/[processId]/challenge.astro",
    "../../pages/sign/[processId]/progress.astro",
    "../../pages/sign/[processId]/result.astro",
    "../../pages/balance.astro",
  ];

  for (const page of pages) {
    const source = await read(page);
    assert.match(source, /PageHeader/, `${page} should render the shared page header`);
  }
});

test("balance passes its real credit count into the application shell", async () => {
  const page = await read("../../pages/balance.astro");
  assert.match(page, /credits=\{balance\?\.currentBalance\}/);
});

test("the PDF wizard keeps its API contract while exposing accessible redesigned controls", async () => {
  const wizard = await read("../../components/islands/SignWizard.tsx");
  assert.match(wizard, /from "lucide-react"/);
  assert.match(wizard, /aria-label="Vista previa del PDF"/);
  assert.match(wizard, /className="button-accent/);
  assert.match(wizard, /formData\.set\("pdf", pdfFile\)/);
  assert.match(wizard, /\{ visible, page, x, y, width, height \}/);
});
