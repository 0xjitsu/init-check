"""Render the link-preview video (public/og/preview.mp4) and still (public/og/preview.png).

An illustrative day of hourly heat-index values fills in band by band, then the
safe-window sentence appears. Needs ffmpeg with libx264 and drawtext.
Usage: python3 -I scripts/make-preview.py
"""
import subprocess

W, H, DUR = 1200, 630, 7.5
FONT = "/usr/share/fonts/truetype/lato/Lato-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/lato/Lato-Regular.ttf"

# Illustrative hourly heat index (deg C) for a hot Metro Manila day.
HI = [29, 28, 28, 28, 26, 26, 28, 30, 33, 36, 39, 42, 44, 45, 45, 43, 40, 36, 33, 31, 30, 30, 29, 29]
COLORS = {0: "bfe3c8", 1: "fde047", 2: "fb923c", 3: "dc2626", 4: "7f1d1d"}
TEXT = {0: "10331c", 1: "3a2e00", 2: "3b1800", 3: "ffffff", 4: "ffffff"}
REVEAL = {0: 0.6, 1: 1.6, 2: 2.8, 3: 4.0, 4: 4.0}
LEGEND = [(0, "Below 27"), (1, "Caution 27-32"), (2, "Extreme Caution 33-41"), (3, "Danger 42-51"), (4, "Extreme Danger 52+")]


def level(v):
    return 4 if v >= 52 else 3 if v >= 42 else 2 if v >= 33 else 1 if v >= 27 else 0


def hour_label(h):
    return f"{h % 12 or 12}{'a' if h < 12 else 'p'}"


f = [f"color=c=0x1b1210:s={W}x{H}:r=30:d={DUR}[bg0]"]
cur = "bg0"
n = 0


def step(expr):
    global cur, n
    n += 1
    nxt = f"s{n}"
    f.append(f"[{cur}]{expr}[{nxt}]")
    cur = nxt


def text(txt, x, y, size, color="ffffff", font=FONT, start=0.0):
    step(
        f"drawtext=fontfile={font}:text='{txt}':x={x}:y={y}:fontsize={size}:fontcolor=0x{color}"
        f":enable='gte(t\\,{start})'"
    )


text("Init Check", 72, 56, 84)
text("Heat-safe hours for any Philippine city", 72, 156, 38, "f3d9c9", FONT_REG)

CELL, GAP, X0, Y0, CH = 40, 4, 72, 250, 230
for i, v in enumerate(HI):
    x = X0 + i * (CELL + GAP)
    lv = level(v)
    step(f"drawbox=x={x}:y={Y0}:w={CELL}:h={CH}:color=0x3a2a25:t=fill")
    # Bar height scales with the heat index so the day reads as a curve.
    bh = int(60 + (v - 26) / (45 - 26) * (CH - 60))
    step(f"drawbox=x={x}:y={Y0 + CH - bh}:w={CELL}:h={bh}:color=0x{COLORS[lv]}:t=fill:enable='gte(t\\,{REVEAL[lv]})'")
    text(str(v), x + (6 if v < 100 else 2), Y0 + CH - bh + 10, 22, TEXT[lv], FONT, REVEAL[lv])
    if i % 3 == 0:
        text(hour_label(i), x, Y0 + CH + 10, 20, "d8c3b8", FONT_REG)

lx = 72
for lv, label in LEGEND:
    step(f"drawbox=x={lx}:y=530:w=22:h=22:color=0x{COLORS[lv]}:t=fill")
    text(label, lx + 30, 527, 22, "f3d9c9", FONT_REG)
    lx += 30 + len(label) * 11 + 28

text("Safest outdoor hours today  -  before 8 AM and after 7 PM", 72, 574, 34, "ffffff", FONT, 5.2)

f.append(f"[{cur}]format=yuv420p[out]")

cmd = [
    "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
    "-filter_complex", ";".join(f), "-map", "[out]",
    "-t", str(DUR), "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "26",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", "public/og/preview.mp4",
]
subprocess.run(cmd, check=True)
subprocess.run(
    ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", "7.0", "-i", "public/og/preview.mp4",
     "-frames:v", "1", "public/og/preview.png"],
    check=True,
)
print("wrote public/og/preview.mp4 and preview.png")
