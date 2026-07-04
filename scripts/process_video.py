import os
import json
import subprocess
import tempfile

WATERMARK_PATH = os.path.join(os.path.dirname(__file__), '..', 'assets', 'watermark.png')
OUTRO_PATH = os.path.join(os.path.dirname(__file__), '..', 'assets', 'outro.mp4')

def load_watermark_config():
    with open('config.json', 'r') as f:
        cfg = json.load(f)
    return cfg.get('watermark', {'x_percent': 75, 'y_percent': 85, 'width_percent': 15})

def get_video_dimensions(video_path):
    result = subprocess.run([
        'ffprobe', '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'csv=p=0',
        video_path
    ], capture_output=True, text=True)
    parts = result.stdout.strip().split(',')
    if len(parts) == 2:
        return int(parts[0]), int(parts[1])
    raise ValueError(f"Could not read dimensions from {video_path}: {result.stderr}")

def process_video(input_path, output_path=None):
    wm_cfg = load_watermark_config()
    x_pct = wm_cfg.get('x_percent', 75)
    y_pct = wm_cfg.get('y_percent', 85)
    w_pct = wm_cfg.get('width_percent', 15)

    width, height = get_video_dimensions(input_path)

    wm_w = int(width * w_pct / 100)
    wm_x = int(width * x_pct / 100) - wm_w // 2
    wm_y = int(height * y_pct / 100)

    tmp_dir = tempfile.mkdtemp()
    watermarked_path = os.path.join(tmp_dir, 'watermarked.mp4')

    watermark_abs = os.path.abspath(WATERMARK_PATH)
    outro_abs = os.path.abspath(OUTRO_PATH)

    print(f"Adding watermark at x={wm_x}px y={wm_y}px width={wm_w}px on {width}x{height} video...")
    result = subprocess.run([
        'ffmpeg', '-y',
        '-i', input_path,
        '-i', watermark_abs,
        '-filter_complex',
        f'[1:v]scale={wm_w}:-1,format=rgba,colorchannelmixer=aa=0.7[wm];[0:v][wm]overlay={wm_x}:{wm_y}[out]',
        '-map', '[out]',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-shortest',
        watermarked_path
    ], capture_output=True, text=True)

    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg watermark failed:\n{result.stderr}")
    print("Watermark added successfully.")

    if not os.path.exists(outro_abs):
        print("No outro found, skipping concat step.")
        final_path = watermarked_path
    else:
        print("Appending outro...")
        final_path = output_path or os.path.join(tmp_dir, 'final_output.mp4')
        concat_list = os.path.join(tmp_dir, 'concat_list.txt')
        with open(concat_list, 'w') as f:
            f.write(f"file '{watermarked_path}'\n")
            f.write(f"file '{outro_abs}'\n")

        result2 = subprocess.run([
            'ffmpeg', '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', concat_list,
            '-c:v', 'libx264',
            '-c:a', 'aac',
            final_path
        ], capture_output=True, text=True)

        if result2.returncode != 0:
            raise RuntimeError(f"FFmpeg concat (outro) failed:\n{result2.stderr}")
        print("Outro appended successfully.")

    if output_path and final_path != output_path:
        import shutil
        shutil.move(final_path, output_path)
        final_path = output_path

    print(f"Processed video ready at: {final_path}")
    return final_path
