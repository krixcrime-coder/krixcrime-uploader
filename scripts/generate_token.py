"""
One-time script to generate a YouTube OAuth2 Refresh Token.
Run this locally (NOT on GitHub Actions). Copy the refresh token output
and store it as a GitHub Secret named YT_REFRESH_TOKEN.

Usage:
  pip install google-auth-oauthlib
  python scripts/generate_token.py

You'll need:
  - YT_CLIENT_ID env var (or paste it directly below)
  - YT_CLIENT_SECRET env var (or paste it directly below)
"""

import os
import json
from google_auth_oauthlib.flow import InstalledAppFlow

CLIENT_ID = os.environ.get('YT_CLIENT_ID') or input("Enter YouTube Client ID: ")
CLIENT_SECRET = os.environ.get('YT_CLIENT_SECRET') or input("Enter YouTube Client Secret: ")

SCOPES = ['https://www.googleapis.com/auth/youtube.upload']

client_config = {
    "installed": {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"]
    }
}

flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
creds = flow.run_local_server(port=0)

print("\n" + "="*60)
print("SUCCESS! Save this as your YT_REFRESH_TOKEN GitHub Secret:")
print("="*60)
print(creds.refresh_token)
print("="*60)
print("\nDo NOT share this token with anyone.")
