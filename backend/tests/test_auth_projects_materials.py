def test_signin_creates_user_and_returns_project_list(client):
    response = client.post(
        "/api/v1/auth/signin",
        json={
            "email": "new-user@example.com",
            "name": "New User",
            "avatar_url": "https://example.com/avatar.png",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "new-user@example.com"
    assert body["user"]["projects"] == []


def test_project_crud_flow(client, auth_headers):
    create_response = client.post(
        "/api/v1/projects/",
        headers=auth_headers,
        json={
            "title": "QA Project",
            "description": "Project created by integration test",
            "status": "active",
        },
    )
    assert create_response.status_code == 200
    project = create_response.json()
    assert project["title"] == "QA Project"

    list_response = client.get("/api/v1/projects/", headers=auth_headers)
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [project["id"]]

    update_response = client.put(
        f"/api/v1/projects/{project['id']}",
        headers=auth_headers,
        json={"title": "QA Project Updated"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["title"] == "QA Project Updated"

    delete_response = client.delete(f"/api/v1/projects/{project['id']}", headers=auth_headers)
    assert delete_response.status_code == 200

    get_deleted_response = client.get(f"/api/v1/projects/{project['id']}", headers=auth_headers)
    assert get_deleted_response.status_code == 404


def test_material_upload_to_owned_project(client, auth_headers, monkeypatch):
    class FakeIngestionAgent:
        def __init__(self, db):
            self.db = db

        async def ingest_with_retry(self, *args, **kwargs):
            return {"status": "success", "material_id": kwargs.get("material_id"), "num_chunks": 1}

    from app.api.v1 import materials

    monkeypatch.setattr(materials, "IngestionAgent", FakeIngestionAgent)

    project_response = client.post(
        "/api/v1/projects/",
        headers=auth_headers,
        json={
            "title": "Material Project",
            "description": "Upload test",
            "status": "active",
        },
    )
    project_id = project_response.json()["id"]

    upload_response = client.post(
        f"/api/v1/materials/upload?project_id={project_id}",
        headers=auth_headers,
        files={"file": ("sample.pdf", b"%PDF-1.4\n% qa\n", "application/pdf")},
    )

    assert upload_response.status_code == 200
    assert upload_response.json()["file_name"] == "sample.pdf"
