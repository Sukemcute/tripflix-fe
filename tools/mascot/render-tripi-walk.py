"""Xuất vòng bước đi của Tripi từ rig Rive thành ảnh động WebP nền trong suốt cho mobile.

Chỉ dùng các lệnh Rive CLI không cần đăng nhập (dựng headless và chụp khung), nên chạy được trên mọi máy
có Rive CLI 1.9.2 trở lên. Ảnh chụp của CLI có nền đặc, nên dựng hai lần trên nền đen và nền trắng rồi
tính độ trong suốt từ chênh lệch hai lần (viền lông giữ được độ mịn như bản gốc).

    RIVE_BIN=/đường/dẫn/rive python tools/mascot/render-tripi-walk.py
"""
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PROJECT = ROOT / 'design/tripi-rive'
OUT = ROOT / 'apps/mobile/assets/brand/tripi-library/animations/walking.webp'
RIVE = os.environ.get('RIVE_BIN', 'rive')
WALK_FRAMES = 64  # khớp WALK trong build-tripi-rive.py, 60 khung/giây
STEP = 2  # lấy một khung mỗi hai khung: 30 khung/giây là đủ mượt cho màn chờ
SIZE = 512  # cùng cỡ với các ảnh động khác trong thư viện
SETTLE = '300ms'  # đợi lớp Walk chuyển từ đứng sang bước xong


def render(background: str, work: Path) -> list[Path]:
    copy = work / f'project-{background}'
    shutil.copytree(PROJECT, copy, ignore=shutil.ignore_patterns('build'))
    scene_path = copy / 'scene.rml'
    scene = scene_path.read_text(encoding='utf-8')
    # Hình nền khai báo cuối artboard nên vẽ dưới cùng (Rive vẽ từ trước ra sau).
    backdrop = (
        f'<Shape x="384" y="384" name="Backdrop" id="0:9999"><Rectangle width="4000" height="4000" name="Path"/>'
        f'<Fill name="Fill"><SolidColor colorValue="{background}" name="Color"/></Fill></Shape>\n    '
    )
    at = scene.index('<StateMachine')
    scene_path.write_text(scene[:at] + backdrop + scene[at:], encoding='utf-8')
    frames_dir = work / f'frames-{background}'
    frames_dir.mkdir()
    commands = ['data walking=true', f'advance {SETTLE}']
    for frame in range(0, WALK_FRAMES, STEP):
        commands += [f'screenshot {(frames_dir / f"{frame:03d}.png").as_posix()}', f'advance {STEP}']
    commands.append('quit')
    result = subprocess.run(
        [RIVE, str(copy), '--commands'], input='\n'.join(commands), capture_output=True, text=True, check=True
    )
    errors = [line for line in result.stdout.splitlines() if line.startswith('err')]
    if errors:
        raise SystemExit('\n'.join(errors))
    return sorted(frames_dir.glob('*.png'))


def unmatte(on_black: Path, on_white: Path) -> Image.Image:
    black = np.asarray(Image.open(on_black).convert('RGB'), dtype=float)
    white = np.asarray(Image.open(on_white).convert('RGB'), dtype=float)
    alpha = np.clip(1 - (white - black).mean(axis=2) / 255, 0, 1)
    colour = np.where(alpha[..., None] > 0.003, black / np.maximum(alpha[..., None], 1e-3), 0)
    rgba = np.dstack([np.clip(colour, 0, 255), alpha * 255]).astype('uint8')
    return Image.fromarray(rgba, 'RGBA').resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def main() -> None:
    with tempfile.TemporaryDirectory() as temp:
        work = Path(temp)
        frames = [unmatte(b, w) for b, w in zip(render('FF000000', work), render('FFFFFFFF', work))]
    duration = round(1000 * STEP / 60)
    frames[0].save(
        OUT, save_all=True, append_images=frames[1:], duration=duration, loop=0, quality=82, method=6, exact=False
    )
    print(f'{OUT.relative_to(ROOT)}: {len(frames)} khung, {OUT.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
