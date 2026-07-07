import '@testing-library/jest-dom';
import { server } from './msw';

window.matchMedia ??= Object.assign(
  (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
  {
    addListener: () => {},
    removeListener: () => {},
  }
);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
