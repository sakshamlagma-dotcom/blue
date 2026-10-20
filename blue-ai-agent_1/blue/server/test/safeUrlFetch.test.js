import test from "node:test";
import assert from "node:assert/strict";
import { isPublicIp, parsePublicHttpUrl } from "../src/tools/safeUrlFetch.js";

test("public IP validation blocks private, loopback, link-local, and reserved addresses", () => {
  for (const address of [
    "127.0.0.1",
    "10.1.2.3",
    "172.20.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "224.0.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "2002::1",
    "64:ff9b::c0a8:101",
  ]) {
    assert.equal(isPublicIp(address), false, address);
  }
  assert.equal(isPublicIp("8.8.8.8"), true);
  assert.equal(isPublicIp("2606:4700:4700::1111"), true);
});

test("public IP classification blocks transition and translation ranges", () => {
  for (const address of [
    "192.0.0.9",
    "100.64.0.1",
    "198.18.0.1",
    "2001::1",
    "2002::1",
    "64:ff9b::c0a8:101",
    "64:ff9b:1::c0a8:101",
  ]) {
    assert.equal(isPublicIp(address), false, address);
  }
});

test("URL reader accepts only standard-port public HTTP(S) URL shapes", () => {
  assert.equal(parsePublicHttpUrl("https://example.org/article").hostname, "example.org");
  for (const url of [
    "file:///etc/passwd",
    "http://127.0.0.1/",
    "http://localhost/",
    "http://user:pass@example.org/",
    "http://example.org:8080/",
    "http://printer.local/",
  ]) {
    assert.throws(() => parsePublicHttpUrl(url));
  }
});
