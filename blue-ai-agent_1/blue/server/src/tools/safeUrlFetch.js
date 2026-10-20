import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";

const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 1_000_000;
const REQUEST_TIMEOUT_MS = 10_000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export function isPublicIp(address) {
  let parsed;
  try {
    parsed = ipaddr.parse(address);
  } catch {
    return false;
  }
  if (parsed.kind() === "ipv6" && parsed.isIPv4MappedAddress()) {
    return isPublicIp(parsed.toIPv4Address().toString());
  }
  return parsed.range() === "unicast";
}

export function parsePublicHttpUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("url_reader requires a valid absolute HTTP or HTTPS URL.");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  const defaultPort = url.protocol === "https:" ? "443" : "80";
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !hostname ||
    url.username ||
    url.password ||
    (url.port && url.port !== defaultPort) ||
    hostname === "localhost" ||
    /\.(localhost|local|internal|test|invalid|example)$/.test(hostname) ||
    (isIP(hostname) && !isPublicIp(hostname))
  ) {
    throw new Error("url_reader only supports public HTTP(S) hosts on their standard ports.");
  }
  return url;
}

async function resolvePublicAddress(hostname) {
  const literal = hostname.replace(/^\[|\]$/g, "");
  if (isIP(literal)) {
    if (!isPublicIp(literal)) throw new Error("url_reader blocks non-public IP addresses.");
    return { address: literal, family: isIP(literal) };
  }
  const addresses = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("url_reader DNS lookup timed out.")),
      REQUEST_TIMEOUT_MS
    );
    lookup(literal, { all: true, verbatim: true }).then(
      (results) => {
        clearTimeout(timeout);
        resolve(results);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
  if (!addresses.length || addresses.some(({ address }) => !isPublicIp(address))) {
    throw new Error("url_reader blocks hosts that resolve to non-public IP addresses.");
  }
  return addresses[0];
}

function requestOnce(url, pinnedAddress) {
  return new Promise((resolve, reject) => {
    const requester = url.protocol === "https:" ? httpsRequest : httpRequest;
    let settled = false;
    let timeout;
    const finish = (complete, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      complete(value);
    };
    const req = requester(url, {
      headers: {
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Encoding": "identity",
        "User-Agent": "BlueSearch/1.0 (+https://github.com/sakshamlagma-dotcom/blue)",
      },
      lookup: (_hostname, options, callback) => {
        if (options?.all) {
          callback(null, [{ address: pinnedAddress.address, family: pinnedAddress.family }]);
        } else {
          callback(null, pinnedAddress.address, pinnedAddress.family);
        }
      },
    }, (res) => {
      const status = res.statusCode || 0;
      res.on("error", (error) => finish(reject, error));
      if (REDIRECT_STATUSES.has(status)) {
        const location = res.headers.location;
        res.destroy();
        finish(resolve, { status, location });
        return;
      }
      const chunks = [];
      let size = 0;
      const contentLength = Number(res.headers["content-length"]);
      if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
        const error = new Error("url_reader response exceeded the size limit.");
        res.destroy(error);
        finish(reject, error);
        return;
      }
      res.on("data", (chunk) => {
        size += chunk.length;
        if (size > MAX_RESPONSE_BYTES) {
          const error = new Error("url_reader response exceeded the size limit.");
          res.destroy(error);
          finish(reject, error);
          return;
        }
        chunks.push(chunk);
      });
      res.on("end", () => finish(resolve, {
        status,
        contentType: res.headers["content-type"] || "",
        body: Buffer.concat(chunks).toString("utf8"),
      }));
    });
    timeout = setTimeout(
      () => req.destroy(new Error("url_reader request timed out.")),
      REQUEST_TIMEOUT_MS
    );
    req.on("error", (error) => finish(reject, error));
    req.end();
  });
}

export async function fetchPublicUrl(value) {
  let url = parsePublicHttpUrl(value);
  for (let redirects = 0; ; redirects += 1) {
    const pinnedAddress = await resolvePublicAddress(url.hostname);
    const response = await requestOnce(url, pinnedAddress);
    if (!REDIRECT_STATUSES.has(response.status)) {
      return { ...response, url: url.href };
    }
    if (!response.location || redirects >= MAX_REDIRECTS) {
      throw new Error("url_reader stopped after too many or invalid redirects.");
    }
    url = parsePublicHttpUrl(new URL(response.location, url).href);
  }
}
