from flask import Flask, request, redirect, jsonify, send_from_directory
import os
from openai import OpenAI
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder="static")

openai_client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),  # This is the default and can be omitted
)


@app.route("/api/github/oauth/login", methods=["GET"])
def github_login():
    client_id = os.getenv("GITHUB_CLIENT_ID")
    if not client_id:
        return "GitHub client ID not configured.", 500

    state = request.args.get("state", "")
    scopes = request.args.get("scopes", "")
    redirect_uri = request.args.get("redirect_uri", os.getenv("GITHUB_REDIRECT_URI"))

    if not redirect_uri:
        return "GitHub redirect URI not configured.", 500

    url = f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}"
    if state:
        url += f"&state={state}"
    if scopes:
        url += f"&scope={scopes}"

    return redirect(url)


@app.route("/api/github/oauth/token", methods=["POST"])
def github_token():
    client_id = os.getenv("GITHUB_CLIENT_ID")
    client_secret = os.getenv("GITHUB_CLIENT_SECRET")
    redirect_uri = os.getenv("GITHUB_REDIRECT_URI")

    if not client_id or not client_secret or not redirect_uri:
        return "GitHub client ID, secret or redirect URI not configured.", 500

    code = request.form.get("code")
    if not code:
        return "GitHub authorization code not provided.", 400

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

    return jsonify(response.json())


@app.route("/api/github/oauth/refresh-token", methods=["POST"])
def github_refresh_token():
    client_id = os.getenv("GITHUB_CLIENT_ID")
    client_secret = os.getenv("GITHUB_CLIENT_SECRET")

    if not client_id or not client_secret:
        return "GitHub client ID or secret not configured.", 500

    refresh_token = request.form.get("refresh_token")
    if not refresh_token:
        return "GitHub refresh token not provided.", 400

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

    return jsonify(response.json())


@app.route("/api/ai/suggest-commit-message", methods=["POST"])
def suggest_commit_message():
    changes = request.json.get("changes")
    if not changes:
        return jsonify({"error": "No changes provided"}), 400

    prompt = f"""Generate a concise git commit message for the following changes:\n\n'''{changes}''' \n\n
            In case quads are removed and added again, consider them as changes. Don't specify which ontology the changes belong to. 
            Only return the message, don't include code, quotes or any other information."""

    chat_completion = openai_client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        model="o1-mini",
        max_tokens=50,
    )

    message = chat_completion.choices[0].message.content.strip()

    return jsonify({"message": message})


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def catch_all(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, ssl_context="adhoc")
