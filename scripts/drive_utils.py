import os
import json
import random
import tempfile
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google.oauth2 import service_account
import io

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

def get_drive_service():
    creds_json = os.environ.get('DRIVE_CREDENTIALS_JSON')
    if not creds_json:
        raise ValueError("DRIVE_CREDENTIALS_JSON environment variable not set")
    creds_dict = json.loads(creds_json)
    creds = service_account.Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    return build('drive', 'v3', credentials=creds)

def extract_folder_id(url):
    import re
    match = re.search(r'/folders/([a-zA-Z0-9_-]+)', url)
    if match:
        return match.group(1)
    raise ValueError(f"Could not extract folder ID from URL: {url}")

def list_subfolders(service, parent_folder_id):
    results = []
    page_token = None
    while True:
        response = service.files().list(
            q=f"'{parent_folder_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields="nextPageToken, files(id, name)",
            pageToken=page_token
        ).execute()
        results.extend(response.get('files', []))
        page_token = response.get('nextPageToken')
        if not page_token:
            break
    return results

def list_videos_in_folder(service, folder_id):
    results = []
    page_token = None
    while True:
        response = service.files().list(
            q=f"'{folder_id}' in parents and mimeType contains 'video/' and trashed=false",
            fields="nextPageToken, files(id, name, size)",
            pageToken=page_token
        ).execute()
        results.extend(response.get('files', []))
        page_token = response.get('nextPageToken')
        if not page_token:
            break
    return results

def load_used_ids():
    try:
        with open('used_video_ids.json', 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def mark_video_in_progress(file_id, file_name, folder_name):
    used = load_used_ids()
    used[file_id] = {
        "status": "in_progress",
        "file_name": file_name,
        "folder_name": folder_name
    }
    with open('used_video_ids.json', 'w') as f:
        json.dump(used, f, indent=2)
    return used

def pick_random_unused_video(drive_folder_url, max_attempts=50):
    service = get_drive_service()
    parent_id = extract_folder_id(drive_folder_url)
    used_ids = load_used_ids()

    subfolders = list_subfolders(service, parent_id)
    if not subfolders:
        raise ValueError("No subfolders found in the main Drive folder")

    attempts = 0
    while attempts < max_attempts:
        subfolder = random.choice(subfolders)
        videos = list_videos_in_folder(service, subfolder['id'])
        if not videos:
            attempts += 1
            continue

        unused = [v for v in videos if v['id'] not in used_ids]
        if not unused:
            attempts += 1
            continue

        video = random.choice(unused)
        return video, subfolder['name']

    raise RuntimeError(f"Could not find an unused video after {max_attempts} attempts")

def download_video(service, file_id, file_name):
    tmp_dir = tempfile.mkdtemp()
    output_path = os.path.join(tmp_dir, file_name)

    request = service.files().get_media(fileId=file_id)
    with open(output_path, 'wb') as f:
        downloader = MediaIoBaseDownload(f, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()
            if status:
                print(f"Download progress: {int(status.progress() * 100)}%")

    return output_path

def pick_and_download_video(drive_folder_url):
    service = get_drive_service()
    video, folder_name = pick_random_unused_video(drive_folder_url)
    file_id = video['id']
    file_name = video['name']

    print(f"Selected video: {file_name} from folder: {folder_name}")
    print(f"Marking as in_progress before download...")
    mark_video_in_progress(file_id, file_name, folder_name)

    print(f"Downloading video...")
    local_path = download_video(service, file_id, file_name)
    print(f"Downloaded to: {local_path}")

    return {
        "file_id": file_id,
        "file_name": file_name,
        "folder_name": folder_name,
        "local_path": local_path
    }
