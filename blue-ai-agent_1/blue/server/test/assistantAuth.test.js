import test from "node:test";
import assert from "node:assert/strict";
import {
  createAssistantAccessMiddleware,
  hasValidAssistantToken,
} from "../src/middleware/assistantAuth.js";

function createResponse() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("Assistant middleware allows local mode and accepts a configured bearer token", () => {
  const optional = createAssistantAccessMiddleware({ required: false, token: "" });
  const protectedAccess = createAssistantAccessMiddleware({ required: true, token: "a-secure-token" });
  let nextCalls = 0;
  const next = () => { nextCalls += 1; };
  optional({ get: () => undefined }, createResponse(), next);
  protectedAccess({ get: () => "Bearer a-secure-token" }, createResponse(), next);
  assert.equal(nextCalls, 2);
});

test("Assistant middleware rejects missing configuration and invalid credentials", () => {
  const unconfigured = createResponse();
  createAssistantAccessMiddleware({ required: true, token: "" })(
    { get: () => undefined },
    unconfigured,
    () => assert.fail("must not continue")
  );
  assert.equal(unconfigured.statusCode, 503);

  const unauthorized = createResponse();
  createAssistantAccessMiddleware({ required: true, token: "a-secure-token" })(
    { get: () => "Bearer wrong-token" },
    unauthorized,
    () => assert.fail("must not continue")
  );
  assert.equal(unauthorized.statusCode, 401);
  assert.equal(unauthorized.headers["WWW-Authenticate"], 'Bearer realm="Blue Assistant"');
});

test("Assistant token parsing requires an exact bearer value", () => {
  assert.equal(hasValidAssistantToken("Bearer a-secure-token", "a-secure-token"), true);
  assert.equal(hasValidAssistantToken("Bearer wrong-token", "a-secure-token"), false);
  assert.equal(hasValidAssistantToken("a-secure-token", "a-secure-token"), false);
  assert.equal(hasValidAssistantToken("Bearer a-secure-token extra", "a-secure-token"), false);
  assert.equal(hasValidAssistantToken("Bearer a-secure-token", ""), false);
});
