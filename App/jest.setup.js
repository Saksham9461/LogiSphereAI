/* eslint-env jest */
if (typeof global.WebSocket === 'undefined') {
  global.WebSocket = class MockWebSocket {
    constructor() {}
    send() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

jest.mock('@react-native-community/geolocation', () => ({
  addListener: jest.fn(),
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
  requestAuthorization: jest.fn(),
  setConfiguration: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (key: string) => store[key] || null),
    setItem: jest.fn(async (key: string, val: string) => {
      store[key] = String(val);
    }),
    removeItem: jest.fn(async (key: string) => {
      delete store[key];
    }),
    clear: jest.fn(async () => {
      store = {};
    }),
    getAllKeys: jest.fn(async () => Object.keys(store)),
    multiGet: jest.fn(async (keys: string[]) => keys.map(k => [k, store[k] || null])),
    multiSet: jest.fn(async (pairs: [string, string][]) => {
      pairs.forEach(([k, v]) => { store[k] = String(v); });
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach(k => { delete store[k]; });
    }),
  };
});

jest.mock('@maplibre/maplibre-react-native', () => ({
  MapView: () => null,
  Camera: () => null,
  UserLocation: () => null,
  PointAnnotation: () => null,
  ShapeSource: () => null,
  LineLayer: () => null,
  setAccessToken: jest.fn(),
}));

try {
  jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
} catch (e) {}

try {
  const { createJSReanimatedModule } = require('react-native-reanimated/src/ReanimatedModule/js-reanimated/JSReanimated');
  const inst = createJSReanimatedModule();
  if (inst) {
    Object.getPrototypeOf(inst).setCSSEventHandler = () => {};
  }
} catch (e) {}

try {
  require('react-native-reanimated').setUpTests();
} catch (e) {
  jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
}

