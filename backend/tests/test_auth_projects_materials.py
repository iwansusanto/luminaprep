from app.core.security import create_access_token
from app.models.user import User


class FakeIngestionAgent:
    def __init__(self, db):
        self.db = db

    async def ingest_with_retry(self, *args, **kwargs):
        return {
            "status": "success",
            "material_id": kwargs.get("material_id"),
            "num_chunks": 1,
        }


def create_project(client, auth_headers, title="QA Project"):
    response = client.post(
        "/api/v1/projects/",
        headers=auth_headers,
        json={
            "title": title,
            "description": "Project created by integration test",
            "status": "active",
        },
    )
    assert response.status_code == 200
    return response.json()


def upload_pdf_material(client, auth_headers, project_id, monkeypatch, name="sample.pdf"):
    from app.api.v1 import materials

    monkeypatch.setattr(materials, "IngestionAgent", FakeIngestionAgent)

    response = client.post(
        f"/api/v1/materials/upload?project_id={project_id}",
        headers=auth_headers,
        files={"file": (name, b"%PDF-1.4\n% qa\n", "application/pdf")},
    )
    assert response.status_code == 200
    return response.json()


def create_other_user_headers(db):
    other_user = User(
        email="other-user@example.com",
        full_name="Other User",
        hashed_password="unused",
    )
    db.add(other_user)
    db.commit()
    db.refresh(other_user)
    token = create_access_token({"sub": other_user.email, "user_id": other_user.id})
    return {"Authorization": f"Bearer {token}"}


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
    project = create_project(client, auth_headers)
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
    project = create_project(client, auth_headers, title="Material Project")
    material = upload_pdf_material(client, auth_headers, project["id"], monkeypatch)

    assert material["file_name"] == "sample.pdf"
    assert material["file_size"] == len(b"%PDF-1.4\n% qa\n")


def test_material_list_and_delete_flow(client, auth_headers, monkeypatch):
    project = create_project(client, auth_headers, title="Material Lifecycle Project")
    material = upload_pdf_material(client, auth_headers, project["id"], monkeypatch)

    list_response = client.get(
        f"/api/v1/materials/project/{project['id']}",
        headers=auth_headers,
    )
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()["materials"]] == [material["id"]]

    delete_response = client.delete(
        f"/api/v1/materials/{material['id']}",
        headers=auth_headers,
    )
    assert delete_response.status_code == 200

    get_deleted_response = client.get(
        f"/api/v1/materials/{material['id']}",
        headers=auth_headers,
    )
    assert get_deleted_response.status_code == 404


def test_user_cannot_access_other_users_project_or_material(client, db, auth_headers, monkeypatch):
    project = create_project(client, auth_headers, title="Private Project")
    material = upload_pdf_material(client, auth_headers, project["id"], monkeypatch)
    other_headers = create_other_user_headers(db)

    project_response = client.get(f"/api/v1/projects/{project['id']}", headers=other_headers)
    assert project_response.status_code == 404

    materials_response = client.get(
        f"/api/v1/materials/project/{project['id']}",
        headers=other_headers,
    )
    assert materials_response.status_code == 404

    material_response = client.get(f"/api/v1/materials/{material['id']}", headers=other_headers)
    assert material_response.status_code == 404
