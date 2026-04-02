from google.auth.transport.requests import Request
from google.oauth2 import id_token

from app.config import settings


class GoogleTokenInfo:
    def __init__(self, sub: str, email: str, name: str, picture: str | None):
        self.sub = sub
        self.email = email
        self.name = name
        self.picture = picture


def verify_google_token(token: str) -> GoogleTokenInfo | None:
    try:
        info = id_token.verify_oauth2_token(token, Request(), settings.google_client_id)
        return GoogleTokenInfo(
            sub=info["sub"],
            email=info["email"],
            name=info.get("name", info["email"].split("@")[0]),
            picture=info.get("picture"),
        )
    except Exception:
        return None
