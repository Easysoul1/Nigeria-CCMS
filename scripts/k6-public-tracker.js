import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const failureRate = new Rate("failures");

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "60s", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    "http_req_duration{type:found}": ["p(95)<500"],
    "http_req_duration{type:notfound}": ["p(95)<300"],
    failures: ["rate<0.01"],
  },
};

const BASE = __ENV.BASE || "http://localhost:4000";
const VALID = __ENV.VALID_CASE || "FHC/L/CS/1042/2026";

export default function () {
  // valid-ish request
  let res = http.get(`${BASE}/public/track/${encodeURIComponent(VALID)}`, { tags: { type: "found" } });
  check(res, { "status is 200/404": (r) => r.status === 200 || r.status === 404 });
  if (res.status >= 500) failureRate.add(1);

  // invalid format should be 404 generic quickly
  res = http.get(`${BASE}/public/track/${encodeURIComponent("garbage")}`, { tags: { type: "notfound" } });
  check(res, { "invalid handled": (r) => r.status === 404 || r.status === 400 });
  if (res.status >= 500) failureRate.add(1);

  sleep(0.1);
}
