// polyfills.js - Minimal Buffer polyfill for Solana compatibility
import { Buffer } from 'buffer';

// Only set up Buffer polyfill - keep it simple
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}

if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
  window.Buffer = Buffer;
}

// Export empty object to make this a proper ES module
export {}; 