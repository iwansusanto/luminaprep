#!/usr/bin/env python3
"""Aggregate LLM token usage events for QA reporting.

Expected input is JSONL. One event per line, using the contract documented in
qa/observability/metrics-spec.md. The current backend has no LLM calls yet, so
this script is readiness tooling for the first AI/quiz implementation.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REQUIRED_FIELDS = {
    "timestamp",
    "operation",
    "provider",
    "model",
    "input_tokens",
    "output_tokens",
    "total_tokens",
    "latency_ms",
}


def load_events(path: Path) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        event = json.loads(line)
        missing = sorted(REQUIRED_FIELDS - event.keys())
        if missing:
            raise ValueError(f"{path}:{line_number} missing fields: {', '.join(missing)}")
        events.append(event)
    return events


def summarize(events: list[dict[str, Any]]) -> dict[str, Any]:
    groups: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "calls": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "total_latency_ms": 0.0,
            "estimated_cost_usd": 0.0,
        }
    )

    for event in events:
        key = f"{event['operation']}::{event['provider']}::{event['model']}"
        group = groups[key]
        group["operation"] = event["operation"]
        group["provider"] = event["provider"]
        group["model"] = event["model"]
        group["calls"] += 1
        group["input_tokens"] += int(event["input_tokens"])
        group["output_tokens"] += int(event["output_tokens"])
        group["total_tokens"] += int(event["total_tokens"])
        group["total_latency_ms"] += float(event["latency_ms"])
        group["estimated_cost_usd"] += float(event.get("estimated_cost_usd", 0.0))

    rows = []
    for group in groups.values():
        calls = group["calls"]
        rows.append(
            {
                **group,
                "avg_latency_ms": round(group["total_latency_ms"] / calls, 2),
                "estimated_cost_usd": round(group["estimated_cost_usd"], 6),
            }
        )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "event_count": len(events),
        "groups": sorted(rows, key=lambda row: (row["operation"], row["model"])),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Aggregate LLM token usage JSONL.")
    parser.add_argument("--input", required=True, help="Input JSONL event path.")
    parser.add_argument(
        "--output",
        default="qa/observability/reports/token-usage-summary.json",
        help="Summary JSON output path.",
    )
    args = parser.parse_args()

    events = load_events(Path(args.input))
    report = summarize(events)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote token usage summary: {output_path}")
    print(f"Events: {report['event_count']}")
    for group in report["groups"]:
        print(
            f"{group['operation']} {group['model']} calls={group['calls']} "
            f"tokens={group['total_tokens']} avg_latency={group['avg_latency_ms']}ms"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
