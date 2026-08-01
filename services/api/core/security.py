from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt
from typing import Any

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd_context.verify(password, password_hash)


def create_access_token(user_id: str, settings: Any) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(seconds=settings.jwt_expiry_seconds)
    claims = {"sub": user_id, "exp": expire, "iat": now}
    return jwt.encode(claims, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
