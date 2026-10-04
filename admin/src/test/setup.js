import '@testing-library/jest-dom/vitest';

globalThis.matchMedia ??= (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
});

globalThis.scrollTo ??= () => {};
Element.prototype.scrollIntoView ??= () => {};
