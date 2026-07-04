import os
import json
import time
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

YOUTUBE_SCOPES = ['https://www.googleapis.com/auth/youtube.upload']

def get_youtube_service():
    client_id = os.environ.get('YT_CLIENT_ID')
    client_secret = os.environ.get('YT_CLIENT_SECRET')
    refresh_token = os.environ.get('YT_REFRESH_TOKEN')

    if not all([client_id, client_secret, refresh_token]):
        raise ValueError("YT_CLIENT_ID, YT_CLIENT_SECRET, and YT_REFRESH_TOKEN must be set")

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri='https://oauth2.googleapis.com/token',
        client_id=client_id,
        client_secret=client_secret,
        scopes=YOUTUBE_SCOPES
    )
    creds.refresh(Request())
    return build('youtube', 'v3', credentials=creds)

def load_config():
    with open('config.json', 'r') as f:
        return json.load(f)

def upload_video(video_path, title=None, description=None, tags=None):
    cfg = load_config()
    title = title or cfg.get('title', 'Auto Uploaded Video')
    description = description or cfg.get('description', '')
    tags = tags or cfg.get('tags', [])

    youtube = get_youtube_service()

    body = {
        'snippet': {
            'title': title,
            'description': description,
            'tags': tags,
            'categoryId': '22'
        },
        'status': {
            'privacyStatus': 'public',
            'selfDeclaredMadeForKids': False
        }
    }

    media = MediaFileUpload(
        video_path,
        mimetype='video/mp4',
        resumable=True,
        chunksize=10 * 1024 * 1024
    )

    print(f"Starting YouTube upload: {title}")
    request = youtube.videos().insert(
        part='snippet,status',
        body=body,
        media_body=media
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"Upload progress: {int(status.progress() * 100)}%")

    video_id = response.get('id')
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    print(f"Upload complete! Video ID: {video_id}")
    print(f"URL: {video_url}")

    return video_id, video_url
