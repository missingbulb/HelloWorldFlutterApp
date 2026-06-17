"""
Generates a representative screenshot of the Flutter app's initial screen.
This script simulates what the Flutter golden test would produce.
"""
from PIL import Image, ImageDraw, ImageFont
import os

WIDTH, HEIGHT = 390, 844  # iPhone 14 logical resolution

img = Image.new("RGB", (WIDTH, HEIGHT), color=(255, 152, 0))  # orange
draw = ImageDraw.Draw(img)

# Try to load a font, fall back to default
try:
    font_bold_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
    font_bold_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
except Exception:
    font_bold_large = ImageFont.load_default()
    font_bold_medium = ImageFont.load_default()

# --- "hello world" text ---
text = "hello world"
bbox = draw.textbbox((0, 0), text, font=font_bold_large)
text_w = bbox[2] - bbox[0]
text_x = (WIDTH - text_w) // 2
text_y = HEIGHT // 2 - 80
draw.text((text_x, text_y), text, fill=(255, 255, 255), font=font_bold_large)

# --- "hi!" button ---
btn_w, btn_h = 130, 52
btn_x = (WIDTH - btn_w) // 2
btn_y = text_y + 80
radius = 8

# Button shadow
draw.rounded_rectangle(
    [btn_x + 2, btn_y + 4, btn_x + btn_w + 2, btn_y + btn_h + 4],
    radius=radius,
    fill=(200, 100, 0),
)
# Button face
draw.rounded_rectangle(
    [btn_x, btn_y, btn_x + btn_w, btn_y + btn_h],
    radius=radius,
    fill=(255, 255, 255),
)
# Button label
btn_text = "hi!"
btn_bbox = draw.textbbox((0, 0), btn_text, font=font_bold_medium)
btn_text_w = btn_bbox[2] - btn_bbox[0]
btn_text_h = btn_bbox[3] - btn_bbox[1]
draw.text(
    (btn_x + (btn_w - btn_text_w) // 2, btn_y + (btn_h - btn_text_h) // 2),
    btn_text,
    fill=(255, 152, 0),
    font=font_bold_medium,
)

# --- Status bar placeholder ---
draw.rectangle([0, 0, WIDTH, 44], fill=(230, 120, 0))
draw.text((16, 14), "9:41", fill=(255, 255, 255), font=font_bold_medium)

out_path = os.path.join(os.path.dirname(__file__), "test", "goldens", "initial_screen.png")
img.save(out_path)
print(f"Screenshot saved to {out_path}")
