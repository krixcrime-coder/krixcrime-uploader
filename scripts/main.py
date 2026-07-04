import os
import sys
import json
import datetime
import subprocess
import traceback
import base64
import urllib.request
import urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from drive_utils import pick_and_download_video
from process_video import process_video
from upload_youtube import upload_video

REPO_ROOT = os.path.join(os.path.dirname(__file__), '..')
LOG_FILE = os.path.join(REPO_ROOT, 'uploaded_log.json')
USED_IDS_FILE = os.path.join(REPO_ROOT, 'used_video_ids.json')
CONFIG_FILE = os.path.join(REPO_ROOT, 'config.json')

GH_TOKEN = os.environ.get('GH_PAT', '')
GH_REPO = os.environ.get('GITHUB_REPOSITORY', '')
GH_API = 'https://api.github.com'


def gh_headers():
    return {
        'Authorization': f'token {GH_TOKEN}',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'KrixCrime-Uploader/1.0'
    }


def gh_get_file(path):
    url = f'{GH_API}/repos/{GH_REPO}/contents/{path}'
    req = urllib.request.Request(url, headers=gh_headers())
    try:
        with urllib.request.urlopen(req) as r:
            data = json.loads(r.read())
        content = json.loads(base64.b64decode(data['content']).decode('utf-8'))
        return content, data['sha']
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None, None
        raise


def gh_put_file(path, content, sha, message):
    url = f'{GH_API}/repos/{GH_REPO}/contents/{path}'
    encoded = base64.b64encode(json.dumps(content, indent=2).encode()).decode()
    body = {'message': message, 'content': encoded}
    if sha:
        body['sha'] = sha
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=gh_headers(), method='PUT')
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"GitHub API PUT error {e.code}: {e.read().decode()}")
        raise


def load_json_local(path, fallback):
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return fallback


def save_json_local(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)


def load_config():
    return load_json_local(CONFIG_FILE, {})


def load_log():
    return load_json_local(LOG_FILE, [])


def save_log(log):
    save_json_local(LOG_FILE, log)


def load_used_ids():
    return load_json_local(USED_IDS_FILE, {})


def save_used_ids(used):
    save_json_local(USED_IDS_FILE, used)


def commit_state_to_github():
    """Push uploaded_log.json and used_video_ids.json back to GitHub via API."""
    if not GH_TOKEN or not GH_REPO:
        print("GH_PAT / GITHUB_REPOSITORY not set — falling back to git commit")
        _git_commit_fallback()
        return

    files = {
        'uploaded_log.json': load_log(),
        'used_video_ids.json': load_used_ids()
    }
    for path, content in files.items():
        try:
            _, sha = gh_get_file(path)
            gh_put_file(path, content, sha, f'chore: update {path} [skip ci]')
            print(f"✓ Pushed {path} to GitHub")
        except Exception as e:
            print(f"Warning: could not push {path} via API: {e}")
            _git_commit_fallback()
            return


def _git_commit_fallback():
    try:
        subprocess.run(['git', 'config', 'user.email', 'actions@github.com'], check=True)
        subprocess.run(['git', 'config', 'user.name', 'GitHub Actions Bot'], check=True)
        subprocess.run(['git', 'add', 'uploaded_log.json', 'used_video_ids.json'], check=True)
        diff = subprocess.run(['git', 'diff', '--cached', '--quiet'])
        if diff.returncode == 0:
            print("Nothing to commit.")
            return
        subprocess.run(['git', 'commit', '-m', 'chore: update upload state [skip ci]'], check=True)
        remote = f"https://x-access-token:{GH_TOKEN}@github.com/{GH_REPO}.git"
        subprocess.run(['git', 'push', remote, 'HEAD:main'], check=True)
        print("✓ Pushed via git")
    except subprocess.CalledProcessError as e:
        print(f"git fallback failed: {e}")


def run_upload():
    cfg = load_config()
    drive_folder_url = cfg.get('drive_folder_url', '')
    if not drive_folder_url or 'XXXX' in drive_folder_url:
        raise ValueError("drive_folder_url is not configured in config.json")

    now = datetime.datetime.utcnow()
    log_entry = {
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S"),
        "folder_name": "",
        "file_name": "",
        "drive_file_id": "",
        "youtube_video_id": "",
        "youtube_url": "",
        "status": "failed",
        "error": ""
    }

    try:
        print("=" * 60)
        print("STEP 1: Picking & downloading video from Google Drive")
        print("=" * 60)
        video_info = pick_and_download_video(drive_folder_url)
        log_entry.update({
            "folder_name": video_info["folder_name"],
            "file_name": video_info["file_name"],
            "drive_file_id": video_info["file_id"]
        })

        print("\n" + "=" * 60)
        print("STEP 2: Processing video (watermark + outro)")
        print("=" * 60)
        processed_path = process_video(video_info["local_path"])

        print("\n" + "=" * 60)
        print("STEP 3: Uploading to YouTube")
        print("=" * 60)
        video_id, video_url = upload_video(processed_path)
        log_entry.update({
            "youtube_video_id": video_id,
            "youtube_url": video_url,
            "status": "success"
        })

        used = load_used_ids()
        used[video_info["file_id"]] = {
            "status": "uploaded",
            "file_name": video_info["file_name"],
            "folder_name": video_info["folder_name"],
            "youtube_video_id": video_id,
            "youtube_url": video_url,
            "uploaded_at": now.isoformat()
        }
        save_used_ids(used)
        print(f"\n✅ Done! YouTube URL: {video_url}")

    except Exception as e:
        error_msg = traceback.format_exc()
        log_entry["error"] = str(e)
        log_entry["status"] = "failed"
        print(f"\n❌ Upload failed: {e}\n{error_msg}")

        if log_entry["drive_file_id"]:
            used = load_used_ids()
            if log_entry["drive_file_id"] in used:
                used[log_entry["drive_file_id"]]["status"] = "failed"
                used[log_entry["drive_file_id"]]["error"] = str(e)
                save_used_ids(used)

    finally:
        log = load_log()
        log.append(log_entry)
        save_log(log)
        print("\n" + "=" * 60)
        print("STEP 4: Pushing state back to GitHub")
        print("=" * 60)
        commit_state_to_github()

    return log_entry["status"] == "success"


if __name__ == "__main__":
    success = run_upload()
    sys.exit(0 if success else 1)
