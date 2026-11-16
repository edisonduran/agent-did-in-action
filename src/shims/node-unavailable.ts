/**
 * Browser stand-in for the Node built-ins that @agentdid/sdk imports lazily
 * (`node:fs/promises`, `node:dns`, `node:http`, `node:https`): file-backed
 * stores and the SSRF-safe HTTP fetcher. The demo keeps every DID in memory,
 * so those code paths never run in the browser; if one did, it fails loudly.
 */
function unavailable(): never {
  throw new Error('This Node.js API is not available in the browser demo');
}

export const readFile = unavailable;
export const writeFile = unavailable;
export const mkdir = unavailable;
export const rename = unavailable;
export const rm = unavailable;
export const lookup = unavailable;
export const request = unavailable;
export const promises = { lookup: unavailable };
export default { readFile, writeFile, mkdir, rename, rm, lookup, request, promises };
