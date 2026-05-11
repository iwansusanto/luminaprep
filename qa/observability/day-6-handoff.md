# Day 6 - QA Handoff

## Implemented In QA Area

- Latency scope and endpoint matrix.
- Metrics spec for API latency and future token usage.
- Black-box latency probe script.
- Token usage JSONL aggregation script.
- Backend observability handoff contract.
- Test scenario and report templates.

## How To Use

1. Start the backend locally.
2. Run the latency probe from repo root:

```bash
python3 qa/observability/templates/latency_probe.py --base-url http://localhost:8000 --samples 5
```

3. Review:

```bash
cat qa/observability/reports/latency-report.json
```

4. When LLM usage events exist, aggregate them:

```bash
python3 qa/observability/templates/token_usage_report.py \
  --input qa/observability/sample-token-usage.jsonl
```

## Current Blockers

- Real token usage cannot be verified until backend has AI/LLM calls.
- Authenticated latency scenarios need a reliable test user/token flow.
- Local latency does not represent production latency.
- Backend service is not currently active in `docker-compose.yml`.

## Backend Owner Handoff

Backend owners should implement:

- request ID middleware.
- structured request log with `duration_ms`.
- `x-request-id` response header.
- LLM usage event recorder using the contract in `metrics-spec.md`.

QA can validate the output without touching backend code once those events exist.
