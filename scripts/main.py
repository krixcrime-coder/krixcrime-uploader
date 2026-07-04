import os
import sys
import json
import datetime
import subprocess
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from drive_utils import pick_and_download_video, load_used_ids
from process_video import process_video
from upload_youtube import upload_video

LOG_FILE = os.path.join(os.path.dirname(__file__), '..', 'uploaded_log.json')
USED_IDS_FILE = os.path.join(os.path.dirname(__file__), '..', 'used_video_ids.json')
CONFIG_FILE = os.path.join(os.path.dirname(__file__), '..', 'config.json')

def load_log():
    try:
        with open(LOG_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_log(log):
    with open(LOG_FILE, 'w') as f:
        json.dump(log, f, indent=2)

def load_used_ids_file():
    try:
        with open(USED_IDS_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def save_used_ids(used):
    with open(USED_IDS_FILE, 'w') as f:
        json.dump(used, f, indent=2)

def load_config():
    with open(CONFIG_FILE, 'r') as f:
        return json.load(f)

def commit_state_files(message="chore: update upload state [skip ci]"):
    gh_token = os.environ.get('GH_PAT')
    github_repo = os.environ.get('GITHUB_REPOSITORY')
    if not gh_token or not github_repo:
        print("GH_PAT or GITHUB_REPOSITORY not set; skipping git commit")
        return
    try:
        subprocess.run(['git', 'config', 'user.email', 'actions@github.com'], check=True)
        subprocess.run(['git', 'config', 'user.name', 'GitHub Actions Bot'], check=True)
        subprocess.run(['git', 'add', 'uploaded_log.json', 'used_video_ids.json'], check=True)
        result = subprocess.run(['git', 'diff', '--cached', '--quiet'])
        if result.returncode == 0:
            print("No changes to commit.")
            return
        subprocess.run(['git', 'commit', '-m', message], check=True)
        remote_url = f"https://x-access-token:{gh_token}@github.com/{github_repo}.git"
        subprocess.run(['git', 'push', remote_url, 'HEAD:main'], check=True)
        print("State files committed and pushed.")
    except subprocess.CalledProcessError as e:
        print(f"Git commit/push failed: {e}")

def run_upload():
    cfg = load_config()
    drive_folder_url = cfg.get('drive_folder_url', '')
    if not drive_folder_url or 'XXXX' in drive_folder_url:
        raise ValueError("drive_folder_url is not set in config.json")

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
        print("=== Step 1: Picking and downloading video from Drive ===")
        video_info = pick_and_download_video(drive_folder_url)
        log_entry["folder_name"] = video_info["folder_name"]
        log_entry["file_name"] = video_info["file_name"]
        log_entry["drive_file_id"] = video_info["file_id"]

        print("\n=== Step 2: Processing video (watermark + outro) ===")
        processed_path = process_video(video_info["local_path"])

        print("\n=== Step 3: Uploading to YouTube ===")
        video_id, video_url = upload_video(processed_path)
        log_entry["youtube_video_id"] = video_id
        log_entry["youtube_url"] = video_url
        log_entry["status"] = "success"

        used = load_used_ids_file()
        used[video_info["file_id"]] = {
            "status": "uploaded",
            "file_name": video_info["file_name"],
            "folder_name": video_info["folder_name"],
            "youtube_video_id": video_id,
            "youtube_url": video_url,
            "uploaded_at": now.isoformat()
        }
        save_used_ids(used)
        print(f"\n✅ Upload complete! YouTube URL: {video_url}")

    except Exception as e:
        error_msg = traceback.format_exc()
        log_entry["error"] = str(e)
        log_entry["status"] = "failed"
        print(f"\n❌ Upload failed: {e}\n{error_msg}")

        if log_entry["drive_file_id"]:
            used = load_used_ids_file()
            if log_entry["drive_file_id"] in used:
                used[log_entry["drive_file_id"]]["status"] = "failed"
                used[log_entry["drive_file_id"]]["error"] = str(e)
                save_used_ids(used)

    finally:
        log = load_log()
        log.append(log_entry)
        save_log(log)
        print("\n=== Step 4: Committing state to repo ===")
        commit_state_files()

    return log_entry["status"] == "success"

if __name__ == "__main__":
    success = run_upload()
    sys.exit(0 if success else 1)
