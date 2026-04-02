from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.user import GoogleAuth, TokenPair, TokenRefresh, UserLogin, UserRegister
from app.services.auth_service import (
    create_access_token,
    create_refresh_token,
    hash_password,
    revoke_refresh_token,
    rotate_refresh_token,
    verify_password,
)
from app.services.google_oauth import verify_google_token

router = APIRouter()


@router.post("/register", response_model=TokenPair)
async def register(body: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        display_name=body.display_name,
        auth_provider="email",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    access = create_access_token(user.id)
    refresh = await create_refresh_token(db, user.id)
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=TokenPair)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    access = create_access_token(user.id)
    refresh = await create_refresh_token(db, user.id)
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/google", response_model=TokenPair)
async def google_auth(body: GoogleAuth, db: AsyncSession = Depends(get_db)):
    info = verify_google_token(body.id_token)
    if not info:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    # Check for existing user by google_id or email
    result = await db.execute(select(User).where(User.google_id == info.sub))
    user = result.scalar_one_or_none()

    if not user:
        result = await db.execute(select(User).where(User.email == info.email))
        user = result.scalar_one_or_none()
        if user:
            # Link Google to existing email account
            user.google_id = info.sub
            if info.picture:
                user.avatar_url = info.picture
        else:
            # Create new user
            user = User(
                email=info.email,
                display_name=info.name,
                avatar_url=info.picture,
                google_id=info.sub,
                auth_provider="google",
            )
            db.add(user)

    await db.commit()
    await db.refresh(user)

    access = create_access_token(user.id)
    refresh = await create_refresh_token(db, user.id)
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenPair)
async def refresh(body: TokenRefresh, db: AsyncSession = Depends(get_db)):
    result = await rotate_refresh_token(db, body.refresh_token)
    if not result:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    new_refresh, user_id = result
    access = create_access_token(user_id)
    return TokenPair(access_token=access, refresh_token=new_refresh)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    body: TokenRefresh,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    await revoke_refresh_token(db, body.refresh_token)
