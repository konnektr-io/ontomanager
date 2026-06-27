import os
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import requests
from dotenv import load_dotenv
from starlette.responses import RedirectResponse as StarletteRedirectResponse
from starlette.responses import FileResponse as StarletteFileResponse
from starlette.responses import JSONResponse as StarletteJSONResponse
from starlette.requests import Request as StarletteRequest
from starlette.staticfiles import StaticFiles as StarletteStaticFiles

load_dotenv()

app = FastAPI()

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_openai_client():
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        return OpenAI(api_key=api_key)
    return None


openai_client = get_openai_client()


@app.get("/api/github/oauth/login")
async def github_login(request: Request):
    client_id = os.getenv("GITHUB_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="GitHub client ID not configured.")

    state = request.query_params.get("state", "")
    scopes = request.query_params.get("scopes", "")
    redirect_uri = request.query_params.get(
        "redirect_uri", os.getenv("GITHUB_REDIRECT_URI")
    )

    if not redirect_uri:
        raise HTTPException(
            status_code=500, detail="GitHub redirect URI not configured."
        )

    url = f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}"
    if state:
        url += f"&state={state}"
    if scopes:
        url += f"&scope={scopes}"

    return RedirectResponse(url)


@app.post("/api/github/oauth/token")
async def github_token(code: str = Form(...)):
    client_id = os.getenv("GITHUB_CLIENT_ID")
    client_secret = os.getenv("GITHUB_CLIENT_SECRET")
    redirect_uri = os.getenv("GITHUB_REDIRECT_URI")

    if not client_id or not client_secret or not redirect_uri:
        raise HTTPException(
            status_code=500,
            detail="GitHub client ID, secret or redirect URI not configured.",
        )

    if not code:
        raise HTTPException(
            status_code=400, detail="GitHub authorization code not provided."
        )

    response = requests.post(
        "https://github.com/login/oauth/access_token",
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
        },
        headers={"Accept": "application/json"},
    )
    return JSONResponse(response.json())


@app.post("/api/github/oauth/refresh-token")
async def github_refresh_token(refresh_token: str = Form(...)):
    client_id = os.getenv("GITHUB_CLIENT_ID")
    client_secret = os.getenv("GITHUB_CLIENT_SECRET")

    if not client_id or not client_secret:
        raise HTTPException(
            status_code=500, detail="GitHub client ID or secret not configured."
        )

    if not refresh_token:
        raise HTTPException(
            status_code=400, detail="GitHub refresh token not provided."
        )

    response = requests.post(
        "https://github.com/login/oauth/access_token",
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        },
        headers={"Accept": "application/json"},
    )
    return JSONResponse(response.json())


from pydantic import BaseModel


class CommitMessageRequest(BaseModel):
    changes: str


@app.post("/api/ai/suggest-commit-message")
async def suggest_commit_message(body: CommitMessageRequest):
    changes = body.changes
    if not changes:
        return JSONResponse({"error": "No changes provided"}, status_code=400)

    prompt = f"""Generate a concise git commit message for the following changes:\n\n'''{changes}''' \n\n
            In case quads are removed and added again, consider them as changes. Don't specify which ontology
            the changes belong to and don't mention 'quads' or 'graphs' or any other specific linked data terminology.
            Only return the message, don't include code, quotes or any other information."""

    if not openai_client:
        return JSONResponse({"error": "OpenAI API key not configured"}, status_code=500)

    chat_completion = openai_client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        model="gpt-4o-mini",
        max_completion_tokens=50,
    )

    content = chat_completion.choices[0].message.content
    message = content.strip() if content is not None else ""
    return JSONResponse({"message": message})


# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    static_path = os.path.join("static", full_path)
    if full_path and os.path.exists(static_path):
        return FileResponse(static_path)
    index_path = os.path.join("static", "index.html")
    return FileResponse(index_path)


# For local dev: run with `uvicorn app:app --host 0.0.0.0 --port 8080 --reload`
