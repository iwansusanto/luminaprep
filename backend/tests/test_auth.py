"""Tests for /api/v1/auth endpoints."""


def test_signin_creates_new_user(client):
    resp = client.post(
        "/api/v1/auth/signin",
        json={"email": "new@example.com", "name": "New User"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "new@example.com"
    assert data["user"]["full_name"] == "New User"


def test_signin_existing_user_returns_token(client):
    payload = {"email": "existing@example.com", "name": "Existing User"}
    client.post("/api/v1/auth/signin", json=payload)
    resp = client.post("/api/v1/auth/signin", json=payload)
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_signin_with_avatar_url(client):
    resp = client.post(
        "/api/v1/auth/signin",
        json={
            "email": "avatar@example.com",
            "name": "Avatar User",
            "avatar_url": "https://example.com/avatar.png",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["user"]["avatar_url"] == "https://example.com/avatar.png"


def test_get_me_authenticated(client, auth_headers):
    resp = client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@example.com"
    assert "id" in data


def test_get_me_unauthenticated(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code in (401, 403)


def test_get_me_invalid_token(client):
    resp = client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.here"}
    )
    assert resp.status_code == 401
