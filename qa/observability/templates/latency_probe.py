#!/usr/bin/env python3
"""Black-box latency probe for LuminaPrep QA.

This script intentionally uses only the Python standard library so QA can run it
without changing backend/frontend dependencies or lockfiles.
"""

from __future__ import annotations

import argparse
import json
import statistics
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, request


DEFAULT_ENDPOINTS = [
    ("GET", "/", [200]),
    ("GET", "/health", [200]),
    ("GET", "/api/v1/auth/me", [401]),
    ("GET", "/api/v1/projects/", [401]),
    ("GET", "/api/v1/materials/project/test-project", [401]),
]


@dataclass(frozen=True)
class Endpoint:
    method: str
    path: str
    expected_statuses: list[int]


def percentile(values: list[float], percent: float) -> float | None:
    if not values:
        return None
    sorted_values = sorted(values)
    index = int(round((len(sorted_values) - 1) * percent))
    return sorted_values[index]


def parse_endpoint(raw: str) -> Endpoint:
    parts = raw.split()
    if len(parts) not in (2, 3):
        raise argparse.ArgumentTypeError(
            "endpoint format must be: 'METHOD /path [expected_status,status]'"
        )

    method, path = parts[0].upper(), parts[1]
    expected = [200]
    if len(parts) == 3:
        expected = [int(status.strip()) for status in parts[2].split(",")]
    return Endpoint(method=method, path=path, expected_statuses=expected)


def request_once(base_url: str, endpoint: Endpoint, timeout: float) -> dict[str, Any]:
    url = f"{base_url.rstrip('/')}{endpoint.path}"
    req = request.Request(url=url, method=endpoint.method)
    start = time.perf_counter()

    try:
        with request.urlopen(req, timeout=timeout) as response:
            body = response.read(1024)
            status = response.status
            error_message = None
    except error.HTTPError as exc:
        body = exc.read(1024)
        status = exc.code
        error_message = None
    except Exception as exc:  # noqa: BLE001 - probe must report every failure.
        elapsed_ms = (time.perf_counter() - start) * 1000
        return {
            "status": None,
            "duration_ms": round(elapsed_ms, 2),
            "ok": False,
            "error": type(exc).__name__,
            "message": str(exc),
        }

    elapsed_ms = (time.perf_counter() - start) * 1000
    ok = status in endpoint.expected_statuses
    return {
        "status": status,
        "duration_ms": round(elapsed_ms, 2),
        "ok": ok,
        "error": error_message,
        "body_preview": body.decode("utf-8", errors="replace")[:160],
    }


def summarize(samples: list[dict[str, Any]]) -> dict[str, Any]:
    durations = [
        sample["duration_ms"]
        for sample in samples
        if sample.get("duration_ms") is not None and sample.get("status") is not None
    ]
    ok_count = sum(1 for sample in samples if sample.get("ok"))
    error_count = len(samples) - ok_count

    return {
        "samples": len(samples),
        "ok_count": ok_count,
        "error_count": error_count,
        "error_rate": round(error_count / len(samples), 4) if samples else None,
        "min_ms": round(min(durations), 2) if durations else None,
        "max_ms": round(max(durations), 2) if durations else None,
        "avg_ms": round(statistics.mean(durations), 2) if durations else None,
        "p50_ms": percentile(durations, 0.50),
        "p95_ms": percentile(durations, 0.95),
        "p99_ms": percentile(durations, 0.99),
    }


def build_report(args: argparse.Namespace) -> dict[str, Any]:
    endpoints = args.endpoint or [
        Endpoint(method=method, path=path, expected_statuses=expected)
        for method, path, expected in DEFAULT_ENDPOINTS
    ]

    report: dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "base_url": args.base_url,
        "samples_per_endpoint": args.samples,
        "timeout_seconds": args.timeout,
        "endpoints": [],
    }

    for endpoint in endpoints:
        samples = [
            request_once(args.base_url, endpoint, args.timeout)
            for _ in range(args.samples)
        ]
        report["endpoints"].append(
            {
                "method": endpoint.method,
                "path": endpoint.path,
                "expected_statuses": endpoint.expected_statuses,
                "summary": summarize(samples),
                "samples": samples,
            }
        )

    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Run LuminaPrep latency probe.")
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--samples", type=int, default=5)
    parser.add_argument("--timeout", type=float, default=5.0)
    parser.add_argument(
        "--endpoint",
        action="append",
        type=parse_endpoint,
        help="Custom endpoint, e.g. 'GET /health 200' or 'GET /api/v1/auth/me 401'",
    )
    parser.add_argument(
        "--output",
        default="qa/observability/reports/latency-report.json",
        help="JSON report output path.",
    )
    args = parser.parse_args()

    if args.samples < 1:
        parser.error("--samples must be >= 1")

    report = build_report(args)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote latency report: {output_path}")
    for endpoint in report["endpoints"]:
        summary = endpoint["summary"]
        print(
            f"{endpoint['method']} {endpoint['path']} "
            f"p50={summary['p50_ms']}ms p95={summary['p95_ms']}ms "
            f"error_rate={summary['error_rate']}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
