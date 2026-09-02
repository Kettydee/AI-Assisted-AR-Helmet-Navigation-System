"""Create a simulated MP4 preview of navigation and pothole HUD behavior.

The road scenes are generated test inputs. Detection rectangles are scripted
because trained YOLO weights are not stored in this repository; the avoidance
direction itself is calculated by vision-ai/avoidance.py.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "vision-ai"))
sys.path.insert(0, str(ROOT / "demo" / ".deps"))

from avoidance import choose_avoidance_direction  # noqa: E402
from imageio_ffmpeg import get_ffmpeg_exe  # noqa: E402


WIDTH = 1280
HEIGHT = 720
FPS = 24
OUTPUT_DIR = ROOT / "demo" / "output"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/seguisb.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else
             "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def fit_frame(image: Image.Image) -> Image.Image:
    image = image.convert("RGB")
    source_ratio = image.width / image.height
    target_ratio = WIDTH / HEIGHT
    if source_ratio < target_ratio:
        crop_height = int(image.width / target_ratio)
        top = max(0, (image.height - crop_height) // 2)
        image = image.crop((0, top, image.width, top + crop_height))
    else:
        crop_width = int(image.height * target_ratio)
        left = max(0, (image.width - crop_width) // 2)
        image = image.crop((left, 0, left + crop_width, image.height))
    return image.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)


def centered_text(draw: ImageDraw.ImageDraw, text: str, y: int, text_font, fill="white") -> None:
    bounds = draw.textbbox((0, 0), text, font=text_font)
    x = (WIDTH - (bounds[2] - bounds[0])) // 2
    draw.text((x, y), text, font=text_font, fill=fill, stroke_width=2, stroke_fill=(0, 0, 0))


def draw_arrow(draw: ImageDraw.ImageDraw, direction: str, center=(640, 265), size=145) -> None:
    x, y = center
    color = (255, 235, 65, 255)
    shadow = (0, 0, 0, 210)
    width = 20

    def line(points):
        draw.line([(px + 4, py + 4) for px, py in points], fill=shadow, width=width + 8, joint="curve")
        draw.line(points, fill=color, width=width, joint="curve")

    if direction == "LEFT":
        line([(x, y + size // 2), (x, y), (x - size // 2, y)])
        draw.polygon([(x - size // 2, y), (x - size // 5, y - size // 4),
                      (x - size // 5, y + size // 4)], fill=color)
    elif direction == "RIGHT":
        line([(x, y + size // 2), (x, y), (x + size // 2, y)])
        draw.polygon([(x + size // 2, y), (x + size // 5, y - size // 4),
                      (x + size // 5, y + size // 4)], fill=color)
    elif direction == "U-TURN":
        line([(x + size // 3, y + size // 2), (x + size // 3, y - size // 5),
              (x - size // 3, y - size // 5), (x - size // 3, y + size // 4)])
        draw.polygon([(x - size // 3, y + size // 2),
                      (x - size // 2, y + size // 5),
                      (x - size // 6, y + size // 5)], fill=color)
    else:
        line([(x, y + size // 2), (x, y - size // 2)])
        draw.polygon([(x, y - size // 2), (x - size // 4, y - size // 5),
                      (x + size // 4, y - size // 5)], fill=color)


def warning_icon(draw: ImageDraw.ImageDraw) -> None:
    draw.polygon([(75, 55), (35, 125), (115, 125)], fill=(255, 196, 0), outline="white", width=4)
    draw.text((68, 70), "!", font=font(42, bold=True), fill=(20, 20, 20))
    draw.text((135, 70), "POTHOLE", font=font(40, bold=True), fill="white",
              stroke_width=2, stroke_fill=(0, 0, 0))


def hud_frame(background: Image.Image, direction: str, distance: int | None,
              hazard: bool) -> Image.Image:
    frame = background.convert("RGBA")
    draw = ImageDraw.Draw(frame)

    if hazard:
        warning_icon(draw)

    draw_arrow(draw, direction)
    centered_text(draw, direction, 355, font(54, bold=True), fill=(255, 255, 255))
    if distance is not None:
        centered_text(draw, f"{distance} m", 415, font(44, bold=True), fill=(255, 255, 255))
    return frame.convert("RGB")


def title_frame(background: Image.Image, subtitle: str) -> Image.Image:
    bg = background.filter(ImageFilter.GaussianBlur(7))
    bg = ImageEnhance.Brightness(bg).enhance(0.35).convert("RGBA")
    draw = ImageDraw.Draw(bg)
    centered_text(draw, "AR HELMET HUD DEMO", 240, font(58, bold=True), fill=(255, 235, 65))
    centered_text(draw, subtitle, 330, font(30), fill=(255, 255, 255))
    centered_text(draw, "Floating instructions + voice prompts", 390, font(26), fill=(215, 215, 215))
    return bg.convert("RGB")


def fade(first: Image.Image, second: Image.Image, progress: float) -> Image.Image:
    return Image.blend(first, second, max(0.0, min(1.0, progress)))


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    inputs = ROOT / "demo" / "inputs"
    left_image = Image.open(inputs / "pothole-left.png")
    center_image = Image.open(inputs / "pothole-center.png")
    wide_image = Image.open(inputs / "pothole-left-center.png")

    decisions = {
        "left": choose_avoidance_direction([(260, 440, 520, 650)], left_image.width, left_image.height),
        "center": choose_avoidance_direction([(640, 510, 896, 760)], center_image.width, center_image.height),
        "wide": choose_avoidance_direction([(250, 210, 1000, 900)], wide_image.width, wide_image.height),
    }
    expected = {"left": "CENTER", "center": "LEFT", "wide": "RIGHT"}
    if decisions != expected:
        raise RuntimeError(f"Unexpected avoidance decisions: {decisions}")

    backgrounds = {
        "left": fit_frame(left_image),
        "center": fit_frame(center_image),
        "wide": fit_frame(wide_image),
    }

    scenes: list[tuple[Image.Image, float]] = []
    scenes.append((title_frame(backgrounds["left"], "MAP + POTHOLE VOICE GUIDANCE"), 2.0))
    scenes.append((hud_frame(backgrounds["left"], "RIGHT", 120, False), 3.0))
    scenes.append((hud_frame(backgrounds["left"], decisions["left"], None, True), 3.0))
    scenes.append((hud_frame(backgrounds["center"], decisions["center"], None, True), 3.0))
    scenes.append((hud_frame(backgrounds["wide"], decisions["wide"], None, True), 3.0))
    scenes.append((hud_frame(backgrounds["wide"], "STRAIGHT", 40, False), 2.0))

    # Save representative still outputs alongside the video.
    scenes[1][0].save(OUTPUT_DIR / "map-right-120m.png")
    scenes[2][0].save(OUTPUT_DIR / "pothole-output-center.png")
    scenes[3][0].save(OUTPUT_DIR / "pothole-output-left.png")
    scenes[4][0].save(OUTPUT_DIR / "pothole-output-right.png")

    silent_output_path = OUTPUT_DIR / "ar-helmet-navigation-demo-silent.mp4"
    output_path = OUTPUT_DIR / "ar-helmet-navigation-voice-demo.mp4"
    ffmpeg = get_ffmpeg_exe()
    command = [
        ffmpeg, "-y", "-f", "rawvideo", "-vcodec", "rawvideo",
        "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS),
        "-i", "-", "-an", "-vcodec", "libx264", "-preset", "medium",
        "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        str(silent_output_path),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL,
                               stderr=subprocess.PIPE)
    assert process.stdin is not None
    transition_frames = int(0.35 * FPS)

    for index, (scene, duration) in enumerate(scenes):
        frame_count = int(duration * FPS)
        previous = scenes[index - 1][0] if index > 0 else scene
        for frame_index in range(frame_count):
            current = scene
            if index > 0 and frame_index < transition_frames:
                current = fade(previous, scene, frame_index / transition_frames)
            process.stdin.write(current.tobytes())

    process.stdin.close()
    stderr = process.stderr.read().decode("utf-8", errors="replace") if process.stderr else ""
    return_code = process.wait()
    if return_code != 0:
        raise RuntimeError(f"ffmpeg failed ({return_code}):\n{stderr}")

    narration_dir = OUTPUT_DIR / "narration"
    narration_files = [
        narration_dir / "01-map-right.wav",
        narration_dir / "02-pothole-center.wav",
        narration_dir / "03-pothole-left.wav",
        narration_dir / "04-pothole-right.wav",
        narration_dir / "05-map-straight.wav",
    ]
    if not all(path.exists() for path in narration_files):
        raise RuntimeError("Narration WAV files are missing. Run demo/create_narration.ps1 first.")

    mux_command = [ffmpeg, "-y", "-i", str(silent_output_path)]
    for narration_file in narration_files:
        mux_command.extend(["-i", str(narration_file)])

    delays = [2200, 5200, 8200, 11200, 14200]
    delayed = []
    filters = []
    for index, delay_ms in enumerate(delays, start=1):
        label = f"voice{index}"
        filters.append(f"[{index}:a]adelay={delay_ms}|{delay_ms}[{label}]")
        delayed.append(f"[{label}]")
    filters.append(f"{''.join(delayed)}amix=inputs=5:duration=longest:normalize=0[voice]")

    mux_command.extend([
        "-filter_complex", ";".join(filters),
        "-map", "0:v:0", "-map", "[voice]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
        "-t", str(sum(duration for _, duration in scenes)),
        "-movflags", "+faststart", str(output_path),
    ])
    mux_result = subprocess.run(mux_command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if mux_result.returncode != 0:
        raise RuntimeError(mux_result.stderr.decode("utf-8", errors="replace"))
    silent_output_path.unlink()

    print(f"Decisions: {decisions}")
    print(f"Video: {output_path}")


if __name__ == "__main__":
    main()
