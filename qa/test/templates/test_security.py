from app.core.security import create_access_token, verify_token


def test_valid_token_returns_subject_email():
    token = create_access_token({"sub": "qa@example.com"})

    assert verify_token(token) == "qa@example.com"


def test_invalid_token_is_rejected():
    assert verify_token("not-a-jwt") is None


def test_token_without_subject_is_rejected():
    token = create_access_token({"scope": "test"})

    assert verify_token(token) is None
