"""Tests for /api/v1/projects endpoints."""


def test_create_project(client, auth_headers):
    resp = client.post(
        "/api/v1/projects/",
        json={"title": "My Project", "description": "Desc"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "My Project"
    assert data["description"] == "Desc"
    assert "id" in data
    assert "user_id" in data


def test_create_project_unauthenticated(client):
    resp = client.post(
        "/api/v1/projects/",
        json={"title": "My Project", "description": "Desc"},
    )
    assert resp.status_code in (401, 403)


def test_get_projects_empty(client, auth_headers):
    resp = client.get("/api/v1/projects/", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_get_projects_returns_created(client, auth_headers, project):
    resp = client.get("/api/v1/projects/", headers=auth_headers)
    assert resp.status_code == 200
    ids = [p["id"] for p in resp.json()]
    assert project["id"] in ids


def test_get_project_by_id(client, auth_headers, project):
    resp = client.get(f"/api/v1/projects/{project['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == project["id"]


def test_get_project_not_found(client, auth_headers):
    resp = client.get("/api/v1/projects/nonexistent-id", headers=auth_headers)
    assert resp.status_code == 404


def test_update_project(client, auth_headers, project):
    resp = client.put(
        f"/api/v1/projects/{project['id']}",
        json={"title": "Updated Title"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Title"


def test_update_project_not_found(client, auth_headers):
    resp = client.put(
        "/api/v1/projects/nonexistent-id",
        json={"title": "X"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_delete_project(client, auth_headers, project):
    resp = client.delete(
        f"/api/v1/projects/{project['id']}", headers=auth_headers
    )
    assert resp.status_code == 200
    assert "deleted" in resp.json()["message"].lower()

    # Should be gone now
    resp2 = client.get(f"/api/v1/projects/{project['id']}", headers=auth_headers)
    assert resp2.status_code == 404


def test_delete_project_not_found(client, auth_headers):
    resp = client.delete("/api/v1/projects/nonexistent-id", headers=auth_headers)
    assert resp.status_code == 404
