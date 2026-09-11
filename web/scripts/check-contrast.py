import re
import pathlib

# resolved from this file, so the checker runs from any working directory
CSS_PATH = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'index.css'


def luminance(hex_colour):
    hex_colour = hex_colour.lstrip('#')
    parts = [int(hex_colour[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in parts]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def ratio(fg, bg):
    a, b = luminance(fg), luminance(bg)
    light, dark = max(a, b), min(a, b)
    return (light + 0.05) / (dark + 0.05)


def read_tokens(block):
    css = CSS_PATH.read_text(encoding='utf-8')
    body = css.split(block, 1)[1].split('}', 1)[0]
    return dict(re.findall(r'--(c-[a-z-]+):\s*(#[0-9a-fA-F]{6})', body))


# foreground / background pairs that actually occur in the UI
PAIRS = [
    ('c-ink', 'c-surface', 'body text on a card'),
    ('c-ink', 'c-canvas', 'body text on the page'),
    ('c-ink-muted', 'c-surface', 'secondary text on a card'),
    ('c-ink-muted', 'c-canvas', 'secondary text on the page'),
    ('c-ink-subtle', 'c-surface', 'timestamps, task numbers, section labels'),
    ('c-ink-subtle', 'c-canvas', 'the same on the page background'),
    ('c-ink-muted', 'c-raised', 'text on a subtle fill'),
    ('c-ink-subtle', 'c-raised', 'faint text on a subtle fill'),
    ('c-accent', 'c-surface', 'links'),
    ('c-accent', 'c-accent-soft', 'accent badge / active nav item'),
    ('c-success', 'c-success-soft', 'Done badge'),
    ('c-warn', 'c-warn-soft', 'In Review badge'),
    ('c-danger', 'c-danger-soft', 'Critical badge'),
    ('c-info', 'c-info-soft', 'In Progress badge'),
    ('c-accent-ink', 'c-accent', 'button label on a primary button'),
]

failed = []

for label, block in (('LIGHT', ':root {'), ('DARK', '.dark {')):
    tokens = read_tokens(block)
    if label == 'DARK':
        base = read_tokens(':root {')
        base.update(tokens)
        tokens = base

    print(f'\n{label}')
    worst = []
    for fg, bg, usage in PAIRS:
        if fg not in tokens or bg not in tokens:
            continue
        value = ratio(tokens[fg], tokens[bg])
        ok = 'ok  ' if value >= 4.5 else ('weak' if value >= 3 else 'BAD ')
        if value < 4.5:
            worst.append((usage, round(value, 2)))
        print(f'  {ok} {value:5.2f}:1  {fg:14} on {bg:16} {usage}')

    if worst:
        print(f'  --> below the 4.5:1 minimum for normal text: {worst}')
        failed.extend(worst)

print()
if failed:
    print(f'{len(failed)} token pair(s) below WCAG AA')
    raise SystemExit(1)
print('every token pair meets WCAG AA for normal text')
