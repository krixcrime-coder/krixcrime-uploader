import os
import json
import random
import tempfile
import requests
import re

def get_api_key():
    key = os.environ.get('GOOGLE_API_KEY')
    if not key:
        raise ValueError("GOOGLE_API_KEY environment variable not set")
    return key

def extract_folder_id(url):
    match = re.search(r'/folders/([a-zA-Z0-9_-]+)', url)
    if match:
        return match.group(1)
    # If it's already just an ID
    if re.match(r'^[a-zA-Z0-9_-]+$', url):
        return url
    raise ValueError(f"Could not extract folder ID from URL: {url}")

def list_subfolders(parent_folder_id, api_key):
    results = []
    page_token = None
    while True:
        params = {
            'q': f"'{parent_folder_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
            'fields': 'nextPageToken, files(id, name)',
            'key': api_key,
            'pageSize': 1000,
            'supportsAllDrives': 'true',
            'includeItemsFromAllDrives': 'true',
        }
        if page_token:
            params['pageToken'] = page_token
        resp = requests.get('https://www.googleapis.com/drive/v3/files', params=params)
        if resp.status_code == 403:
            print(f"403 Forbidden listing subfolders of {parent_folder_id}. Response: {resp.text}")
        resp.raise_for_status()
        data = resp.json()
        results.extend(data.get('files', []))
        page_token = data.get('nextPageToken')
        if not page_token:
            break
    return results

def list_videos_in_folder(folder_id, api_key):
    results = []
    page_token = None
    while True:
        params = {
            'q': f"'{folder_id}' in parents and mimeType contains 'video/' and trashed=false",
            'fields': 'nextPageToken, files(id, name, size)',
            'key': api_key,
            'pageSize': 1000,
            'supportsAllDrives': 'true',
            'includeItemsFromAllDrives': 'true',
        }
        if page_token:
            params['pageToken'] = page_token
        resp = requests.get('https://www.googleapis.com/drive/v3/files', params=params)
        if resp.status_code == 403:
            print(f"403 Forbidden listing videos in {folder_id}. Response: {resp.text}")
        resp.raise_for_status()
        data = resp.json()
        results.extend(data.get('files', []))
        page_token = data.get('nextPageToken')
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
    api_key = get_api_key()
    parent_id = extract_folder_id(drive_folder_url)
    used_ids = load_used_ids()

    subfolders = list_subfolders(parent_id, api_key)
    if not subfolders:
        raise ValueError("No subfolders found in the main Drive folder")

    attempts = 0
    while attempts < max_attempts:
        subfolder = random.choice(subfolders)
        videos = list_videos_in_folder(subfolder['id'], api_key)
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

def download_video(file_id, file_name, api_key):
    tmp_dir = tempfile.mkdtemp()
    output_path = os.path.join(tmp_dir, file_name)

    url = f"https://www.googleapis.com/drive/v3/files/{file_id}"
    params = {'alt': 'media', 'key': api_key}

    with requests.get(url, params=params, stream=True) as resp:
        resp.raise_for_status()
        total = int(resp.headers.get('content-length', 0))
        downloaded = 0
        with open(output_path, 'wb') as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
                downloaded += len(chunk)
                if total:
                    pct = int(downloaded * 100 / total)
                    print(f"Download progress: {pct}%", end='\r')
    print()
    return output_path

def pick_and_download_video(drive_folder_url):
    api_key = get_api_key()
    video, folder_name = pick_random_unused_video(drive_folder_url)
    file_id = video['id']
    file_name = video['name']

    print(f"Selected video: {file_name} from folder: {folder_name}")
    print(f"Marking as in_progress before download...")
    mark_video_in_progress(file_id, file_name, folder_name)

    print(f"Downloading video...")
    local_path = download_video(file_id, file_name, api_key)
    print(f"Downloaded to: {local_path}")

    return {
        "file_id": file_id,
        "file_name": file_name,
        "folder_name": folder_name,
        "local_path": local_path
    }
