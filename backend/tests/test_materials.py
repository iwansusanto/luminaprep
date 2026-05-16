"""Tests for /api/v1/materials endpoints."""
import io


def test_create_test_material(client, auth_headers, project):
    resp = client.post(
        "/api/v1/materials",
        json={
            "project_id": project["id"],
            "file_name": "notes.pdf",
            "file_type": "pdf",
            "storage_path": "uploads/notes.pdf",
            "status": "completed",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["file_name"] == "notes.pdf"
    assert data["project_id"] == project["id"]


def test_create_material_missing_field(client, auth_headers, project):
    resp = client.post(
        "/api/v1/materials",
        json={"project_id": project["id"], "file_name": "notes.pdf"},
        headers=auth_headers,
    )
    assert resp.status_code == 400


def test_create_material_project_not_found(client, auth_headers):
    resp = client.post(
        "/api/v1/materials",
        json={
            "project_id": "nonexistent",
            "file_name": "notes.pdf",
            "file_type": "pdf",
            "storage_path": "uploads/notes.pdf",
            "status": "completed",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_get_project_materials(client, auth_headers, project, material):
    resp = client.get(
        f"/api/v1/materials/project/{project['id']}", headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "materials" in data
    ids = [m["id"] for m in data["materials"]]
    assert material["id"] in ids


def test_get_project_materials_project_not_found(client, auth_headers):
    resp = client.get("/api/v1/materials/project/nonexistent", headers=auth_headers)
    assert resp.status_code == 404


def test_get_material_by_id(client, auth_headers, material):
    resp = client.get(f"/api/v1/materials/{material['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == material["id"]


def test_get_material_not_found(client, auth_headers):
    resp = client.get("/api/v1/materials/nonexistent", headers=auth_headers)
    assert resp.status_code == 404


def test_delete_material(client, auth_headers, material):
    resp = client.delete(
        f"/api/v1/materials/{material['id']}", headers=auth_headers
    )
    assert resp.status_code == 200
    assert "deleted" in resp.json()["message"].lower()

    resp2 = client.get(f"/api/v1/materials/{material['id']}", headers=auth_headers)
    assert resp2.status_code == 404


def test_delete_material_not_found(client, auth_headers):
    resp = client.delete("/api/v1/materials/nonexistent", headers=auth_headers)
    assert resp.status_code == 404


def test_create_quiz_from_material(client, auth_headers, material, monkeypatch):
    from app.api.v1 import quiz as quiz_router

    monkeypatch.setattr(quiz_router, "_run_quiz_generation", lambda *args, **kwargs: None)

    resp = client.post(
        f"/api/v1/quizzes/materials/{material['id']}/quizzes",
        json={"difficulty_level": "medium", "question_count": 5},
        headers=auth_headers,
    )
    assert resp.status_code == 202
    data = resp.json()
    assert "task_id" in data
    assert data["status"] == "processing"


def test_create_quiz_from_material_not_found(client, auth_headers):
    resp = client.post(
        "/api/v1/quizzes/materials/nonexistent/quizzes",
        json={"difficulty_level": "medium", "question_count": 5},
        headers=auth_headers,
    )
    assert resp.status_code == 404
