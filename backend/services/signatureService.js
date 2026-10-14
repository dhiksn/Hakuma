'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

/**
 * Generates hanime.tv web2 request signatures using the vendored WASM module.
 * Ported from hanime-stremio/lib/services/htv_signature_service.js
 *
 * The signature is produced by an Emscripten-compiled WASM module that hanime
 * ships in its player bundle. We boot it once inside a sandboxed vm with a
 * minimal window shim, then dispatch "e" events to mint fresh signatures.
 */
class SignatureService {
  constructor() {
    this.win        = null;
    this.ready      = false;
    this.bootError  = null;
    this._initPromise = null;

    // Path to the vendored WASM JS file — copied from hanime-stremio
    this.wasmPath = path.join(__dirname, '..', 'vendor', 'htv_signature_wasm.js');
  }

  async init() {
    if (this.ready) return true;
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._boot();
    return this._initPromise;
  }

  async _boot() {
    try {
      if (!fs.existsSync(this.wasmPath)) {
        throw new Error(`WASM file not found: ${this.wasmPath}`);
      }

      const code = fs.readFileSync(this.wasmPath, 'utf8');
      const win  = this._makeWindowShim();
      vm.createContext(win);

      const swallow = () => {};
      process.on('uncaughtException', swallow);
      process.on('unhandledRejection', swallow);
      // NOSONAR: Intentional vm.runInContext — executes vendored WASM JS (read-only file,
      // sandboxed context, no user input involved). Path is hardcoded at construction time.
      try { vm.runInContext(code, win, { filename: 'htv_signature_wasm.js' }); } catch (_) {} // NOSONAR

      // Wait up to 8s for WASM to instantiate and produce first signature
      const deadline = Date.now() + 8000;
      while (Date.now() < deadline) {
        if (typeof win.ssignature === 'string' && win.ssignature.length > 0) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      process.removeListener('uncaughtException', swallow);
      process.removeListener('unhandledRejection', swallow);

      if (!win.ssignature) throw new Error('WASM booted but produced no signature');

      this.win   = win;
      this.ready = true;
      console.log('[SignatureService] Ready');
      return true;
    } catch (err) {
      this.bootError = err;
      console.error('[SignatureService] Boot failed:', err.message);
      return false;
    }
  }

  async getSignature() {
    if (!(await this.init())) return null;
    try {
      this.win.dispatchEvent(new this.win.CustomEvent('e'));
      const signature = this.win.ssignature;
      const time      = this.win.stime;
      if (!signature) return null;
      return { signature, time };
    } catch (err) {
      console.warn('[SignatureService] Refresh failed:', err.message);
      return null;
    }
  }

  _makeWindowShim() {
    const events = {};
    const win = {
      addEventListener:    (t, h) => { (events[t] = events[t] || []).push(h); },
      removeEventListener: (t, h) => { if (events[t]) events[t] = events[t].filter((x) => x !== h); },
      dispatchEvent: (e) => {
        (events[e.type] || []).slice().forEach((h) => { try { h(e); } catch (_) {} });
        return true;
      },
      atob: (s) => Buffer.from(s, 'base64').toString('binary'),
      btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
      TextEncoder, TextDecoder,
      performance: { now: () => Date.now() },
      console, Date, Math, JSON, setTimeout, clearTimeout,
      WebAssembly, Uint8Array, Uint32Array, Object, Array,
      parseInt, parseFloat, String, Number, Boolean, Error, Promise, Symbol,
      navigator: { userAgent: 'Mozilla/5.0', platform: 'MacIntel' },
      location: { href: 'https://hanime.tv/', origin: 'https://hanime.tv', protocol: 'https:', host: 'hanime.tv', hostname: 'hanime.tv' },
      CustomEvent: class { constructor(type, init) { this.type = type; this.detail = (init && init.detail) || null; } },
      XMLHttpRequest: class { open() {} send() {} setRequestHeader() {} },
      localStorage:  { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      sessionStorage:{ getItem: () => null, setItem: () => {}, removeItem: () => {} },
    };
    win.document = {
      createElement: () => ({ style: {}, setAttribute() {}, addEventListener() {}, appendChild() {} }),
      head: { appendChild() {} },
      body: { appendChild() {} },
      readyState: 'complete',
      currentScript: { src: 'https://hanime-cdn.com/js/vendor.js' },
      addEventListener: win.addEventListener,
      location: win.location,
      cookie: '',
    };
    win.window    = win;
    win.self      = win;
    win.globalThis= win;
    win.top       = win;
    win.parent    = win;
    win.frames    = win;
    return win;
  }
}

// Singleton
module.exports = new SignatureService();
