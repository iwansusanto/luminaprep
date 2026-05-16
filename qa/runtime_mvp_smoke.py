#!/usr/bin/env python3
"""Black-box MVP API smoke for LuminaPrep runtime QA.

This script exercises the real HTTP API:
signin -> project -> material upload -> optional ingestion wait -> quiz generation
-> optional quiz wait -> quiz session -> answer submit -> complete.

It uses only the Python standard library.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, parse, request


@dataclass
class ApiResponse:
    status: int
    body: Any
    duration_ms: float


class SmokeFailure(RuntimeError):
    pass


def request_json(
    base_url: str,
    method: str,
    path: str,
    body: dict[str, Any] | None = None,
    token: str | None = None,
    expected: tuple[int, ...] = (200,),
    timeout: float = 30.0,
) -> ApiResponse:
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = request.Request(
        url=f"{base_url.rstrip('/')}{path}",
        data=data,
        headers=headers,
        method=method,
    )
    start = time.perf_counter()
    try:
        with request.urlopen(req, timeout=timeout) as response:
            raw = response.read()
            status = response.status
    except error.HTTPError as exc:
        raw = exc.read()
        status = exc.code

    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    parsed = json.loads(raw.decode("utf-8")) if raw else None
    if status not in expected:
        raise SmokeFailure(f"{method} {path} expected {expected}, got {status}: {parsed}")
    return ApiResponse(status=status, body=parsed, duration_ms=duration_ms)


def upload_file(
    base_url: str,
    path: str,
    file_path: Path,
    token: str,
    expected: tuple[int, ...] = (200,),
    timeout: float = 60.0,
) -> ApiResponse:
    boundary = f"----luminaprep-smoke-{uuid.uuid4().hex}"
    content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    file_bytes = file_path.read_bytes()
    parts = [
        f"--{boundary}\r\n".encode("utf-8"),
        (
            'Content-Disposition: form-data; name="file"; '
            f'filename="{file_path.name}"\r\n'
        ).encode("utf-8"),
        f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"),
        file_bytes,
        f"\r\n--{boundary}--\r\n".encode("utf-8"),
    ]
    payload = b"".join(parts)
    req = request.Request(
        url=f"{base_url.rstrip('/')}{path}",
        data=payload,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(payload)),
        },
        method="POST",
    )
    start = time.perf_counter()
    try:
        with request.urlopen(req, timeout=timeout) as response:
            raw = response.read()
            status = response.status
    except error.HTTPError as exc:
        raw = exc.read()
        status = exc.code

    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    parsed = json.loads(raw.decode("utf-8")) if raw else None
    if status not in expected:
        raise SmokeFailure(f"POST {path} expected {expected}, got {status}: {parsed}")
    return ApiResponse(status=status, body=parsed, duration_ms=duration_ms)


def poll(
    label: str,
    getter,
    status_key: str,
    success_values: set[str],
    failure_values: set[str],
    timeout_seconds: float,
    interval_seconds: float,
) -> ApiResponse:
    deadline = time.monotonic() + timeout_seconds
    last_response = None
    while time.monotonic() <= deadline:
        last_response = getter()
        value = last_response.body.get(status_key)
        if value in success_values:
            return last_response
        if value in failure_values:
            raise SmokeFailure(f"{label} failed with status={value}: {last_response.body}")
        time.sleep(interval_seconds)
    raise SmokeFailure(
        f"{label} timed out after {timeout_seconds}s; "
        f"last_response={last_response.body if last_response else None}"
    )


def write_report(output: Path, report: dict[str, Any]) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run LuminaPrep MVP runtime smoke.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--email", default=f"qa-smoke-{uuid.uuid4().hex[:8]}@example.com")
    parser.add_argument("--name", default="QA Smoke User")
    parser.add_argument("--project-title", default="QA Runtime Smoke")
    parser.add_argument("--file", type=Path, default=None)
    parser.add_argument("--material-timeout", type=float, default=120.0)
    parser.add_argument("--quiz-timeout", type=float, default=180.0)
    parser.add_argument("--poll-interval", type=float, default=5.0)
    parser.add_argument(
        "--stop-after-quiz-trigger",
        action="store_true",
        help="Stop after quiz generation is accepted. Useful when OpenAI is not available.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("qa/observability/reports/mvp-api-smoke-report.json"),
    )
    args = parser.parse_args()

    temp_file = None
    if args.file is None:
        temp_file = Path("/tmp/luminaprep-mvp-smoke.txt")
        temp_file.write_text(
            "LuminaPrep QA smoke material. Quality assurance validates system "
            "behavior against expected product requirements.",
            encoding="utf-8",
        )
        file_path = temp_file
    else:
        file_path = args.file

    report: dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "base_url": args.base_url,
        "steps": [],
        "status": "failed",
    }

    def record(step: str, response: ApiResponse, extra: dict[str, Any] | None = None):
        item = {
            "step": step,
            "status": response.status,
            "duration_ms": response.duration_ms,
        }
        if extra:
            item.update(extra)
        report["steps"].append(item)

    try:
        signin = request_json(
            args.base_url,
            "POST",
            "/api/v1/auth/signin",
            {"email": args.email, "name": args.name},
        )
        token = signin.body["access_token"]
        record("signin", signin, {"user_id": signin.body["user"]["id"]})

        project = request_json(
            args.base_url,
            "POST",
            "/api/v1/projects/",
            {
                "title": args.project_title,
                "description": "Created by runtime MVP smoke.",
                "status": "active",
            },
            token=token,
        )
        project_id = project.body["id"]
        record("create_project", project, {"project_id": project_id})

        query = parse.urlencode({"project_id": project_id})
        material = upload_file(
            args.base_url,
            f"/api/v1/materials/upload?{query}",
            file_path,
            token=token,
        )
        material_id = material.body["id"]
        record("upload_material", material, {"material_id": material_id})

        material_done = poll(
            "material ingestion",
            lambda: request_json(
                args.base_url,
                "GET",
                f"/api/v1/materials/{material_id}",
                token=token,
            ),
            status_key="status",
            success_values={"completed"},
            failure_values={"failed"},
            timeout_seconds=args.material_timeout,
            interval_seconds=args.poll_interval,
        )
        record("material_completed", material_done, {"material_id": material_id})

        quiz = request_json(
            args.base_url,
            "POST",
            f"/api/v1/quizzes/materials/{material_id}/quizzes",
            {"difficulty_level": "medium", "question_count": 1},
            token=token,
            expected=(202,),
        )
        quiz_id = quiz.body["task_id"]
        record("trigger_quiz_generation", quiz, {"quiz_id": quiz_id})

        if args.stop_after_quiz_trigger:
            report["status"] = "partial_pass"
            write_report(args.output, report)
            print(f"Wrote MVP smoke report: {args.output}")
            print("Status: partial_pass (stopped after quiz trigger)")
            return 0

        quiz_done = poll(
            "quiz generation",
            lambda: request_json(
                args.base_url,
                "GET",
                f"/api/v1/quizzes/{quiz_id}/status",
                token=token,
            ),
            status_key="status",
            success_values={"completed"},
            failure_values={"failed"},
            timeout_seconds=args.quiz_timeout,
            interval_seconds=args.poll_interval,
        )
        record("quiz_completed", quiz_done, {"quiz_id": quiz_id})

        session = request_json(
            args.base_url,
            "POST",
            f"/api/v1/quizzes/{quiz_id}/sessions",
            token=token,
        )
        session_id = session.body["id"]
        record("start_quiz_session", session, {"session_id": session_id})

        questions = request_json(
            args.base_url,
            "GET",
            f"/api/v1/quiz_sessions/{session_id}/questions",
            token=token,
        )
        first_question = questions.body["questions"][0]
        first_answer = next(iter(first_question["options"].values()))
        record(
            "fetch_session_questions",
            questions,
            {"question_count": len(questions.body["questions"])},
        )

        submit = request_json(
            args.base_url,
            "POST",
            f"/api/v1/quiz_sessions/{session_id}/submit_answer",
            {"question_id": first_question["id"], "user_answer": first_answer},
            token=token,
        )
        record("submit_answer", submit, {"is_correct": submit.body["attempt"]["is_correct"]})

        complete = request_json(
            args.base_url,
            "POST",
            f"/api/v1/quiz_sessions/{session_id}/complete",
            token=token,
        )
        record("complete_session", complete, {"score": complete.body["score"]})

        report["status"] = "pass"
        write_report(args.output, report)
        print(f"Wrote MVP smoke report: {args.output}")
        print("Status: pass")
        return 0
    except Exception as exc:  # noqa: BLE001 - produce QA evidence on any failure.
        report["error"] = str(exc)
        write_report(args.output, report)
        print(f"Wrote MVP smoke report: {args.output}")
        print(f"Status: failed: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
