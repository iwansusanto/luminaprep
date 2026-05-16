def test_health_check(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_signin_endpoint_available(client):
    response = client.post(
        "/api/v1/auth/signin",
        json={"email": "smoke@example.com", "name": "Smoke User"},
    )

    assert response.status_code == 200
    assert "access_token" in response.json()


def test_auth_me_requires_bearer_token(client):
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401


def test_projects_requires_bearer_token(client):
    response = client.get("/api/v1/projects/")

    assert response.status_code == 401


def test_materials_requires_bearer_token(client):
    response = client.get("/api/v1/materials/project/test-project")

    assert response.status_code == 401
