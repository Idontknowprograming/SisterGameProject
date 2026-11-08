//=============================================================================
// pako_mz_compat.js
//=============================================================================
// Keeps RPG Maker MZ's pako 1.x binary-string contract while using pako 3.x.
// MZ, AndroidSave and several plugins expect compressed data to be a String
// whose character codes are the original bytes. pako 3 returns Uint8Array and
// uses { toText: true } for UTF-8 inflate output, so adapt those boundaries in
// one place instead of patching every caller.

(() => {
    "use strict";

    const api = globalThis.pako;
    if (!api || typeof api.deflate !== "function" || typeof api.inflate !== "function") {
        throw new Error("pako 3 must be loaded before pako_mz_compat.js");
    }
    if (typeof TextEncoder !== "function" || typeof TextDecoder !== "function") {
        throw new Error("pako 3 requires TextEncoder and TextDecoder");
    }

    const nativeDeflate = api.deflate.bind(api);
    const nativeDeflateRaw = api.deflateRaw.bind(api);
    const nativeGzip = api.gzip.bind(api);
    const nativeInflate = api.inflate.bind(api);
    const nativeInflateRaw = api.inflateRaw.bind(api);
    const nativeUngzip = api.ungzip.bind(api);
    const chunkSize = 0x8000;

    function cloneOptions(options) {
        return options ? { ...options } : {};
    }

    function bytesToBinaryString(bytes) {
        if (typeof Buffer === "function" && typeof Buffer.from === "function") {
            return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("latin1");
        }
        let result = "";
        for (let offset = 0; offset < bytes.length; offset += chunkSize) {
            const chunk = bytes.subarray(offset, offset + chunkSize);
            result += String.fromCharCode.apply(null, chunk);
        }
        return result;
    }

    function binaryStringToBytes(value) {
        if (typeof Buffer === "function" && typeof Buffer.from === "function") {
            return Buffer.from(value, "latin1");
        }
        const bytes = new Uint8Array(value.length);
        for (let index = 0; index < value.length; index++) {
            bytes[index] = value.charCodeAt(index) & 0xff;
        }
        return bytes;
    }

    function adaptDeflate(nativeFunction, data, options) {
        const adaptedOptions = cloneOptions(options);
        const wantsBinaryString = adaptedOptions.to === "string";
        delete adaptedOptions.to;
        const result = nativeFunction(data, adaptedOptions);
        return wantsBinaryString ? bytesToBinaryString(result) : result;
    }

    function adaptInflate(nativeFunction, data, options) {
        const adaptedOptions = cloneOptions(options);
        if (adaptedOptions.to === "string") {
            delete adaptedOptions.to;
            adaptedOptions.toText = true;
        }
        const adaptedData = typeof data === "string" ? binaryStringToBytes(data) : data;
        return nativeFunction(adaptedData, adaptedOptions);
    }

    api.deflate = (data, options) => adaptDeflate(nativeDeflate, data, options);
    api.deflateRaw = (data, options) => adaptDeflate(nativeDeflateRaw, data, options);
    api.gzip = (data, options) => adaptDeflate(nativeGzip, data, options);
    api.inflate = (data, options) => adaptInflate(nativeInflate, data, options);
    api.inflateRaw = (data, options) => adaptInflate(nativeInflateRaw, data, options);
    api.ungzip = (data, options) => adaptInflate(nativeUngzip, data, options);

    Object.defineProperty(api, "mzStringCompat", {
        value: Object.freeze({
            pakoVersion: "3.0.1",
            bytesToBinaryString,
            binaryStringToBytes
        }),
        configurable: false,
        enumerable: false,
        writable: false
    });
})();
