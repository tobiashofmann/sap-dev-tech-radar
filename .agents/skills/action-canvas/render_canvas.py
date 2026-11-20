#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 Tobias Hofmann
"""Renders an action canvas (Markdown) as SVG (optionally PNG) and checks the mandatory fields.

Usage:
  python3 render_canvas.py docs/action-canvas/<slug>.md            # writes <slug>.svg next to it
  python3 render_canvas.py docs/action-canvas/<slug>.md --png      # additionally PNG (needs cairosvg or rsvg-convert)
  python3 render_canvas.py docs/action-canvas/<slug>.md --check start|plan|final
"""
import argparse, re, sys, shutil, subprocess, textwrap, unicodedata
from pathlib import Path
from xml.sax.saxutils import escape

FIELD_KEYS = ["measure", "description", "background", "value", "stakeholders", "it",
              "success", "resources", "implementation", "activities", "openpoints"]
SCALE_KEYS = ["horizon", "complexity", "cost", "risk"]
PHASES = {
    "start": ["measure", "description", "background"],
    "plan": ["measure", "description", "background", "implementation", "activities", "resources"],
    "final": [k for k in FIELD_KEYS if k != "openpoints"],
}

# Supported output languages. Portuguese is one text for Portugal and Brazil (pt-PT, pt-BR).
# "fields" follow FIELD_KEYS, "scales" follow SCALE_KEYS as (label, low end, high end).
LANGS = {
    "en": {
        "fields": ["Measure", "Description", "Background", "Added Value", "Stakeholders", "IT",
                   "Critical Success Factors", "Resources", "Implementation",
                   "Required Activities for Implementation", "Open Points"],
        "scales": [("Time Horizon", "short-term", "long-term"), ("Complexity", "low", "high"),
                   ("Cost", "low", "high"), ("Risk", "low", "high")],
        "open": ["open"], "default_title": "Action Canvas", "title_prefix": "Action Canvas",
        "act1": "\u2714 Required Activities", "act2": "for Implementation", "www": "What? Who? When?",
        "act_short": "Activities", "done": "done",
        "truncated": "\u2026 (full text in the Markdown)", "missing": "Phase '{phase}': missing fields: {fields}",
        "ok": "Phase '{phase}': all mandatory fields filled.",
        "png_skipped": "PNG skipped: neither cairosvg nor rsvg-convert available.",
        "warn_dup": "Warning: Implementation/{label} appears more than once; only the last entry is shown.",
        "warn_long": "Warning: Implementation/{label}: justification too long, cut after about {max} characters in the image. Shorten it.",
        "warn_ignored": "Warning: Implementation entry without a 1-5 value is not shown in the image: {text}",
    },
    "de": {
        "fields": ["Ma\u00dfnahme", "Beschreibung", "Hintergrund", "Mehrwert", "Stakeholder", "IT",
                   "Kritische Erfolgsfaktoren", "Ressourcen", "Umsetzung",
                   "Erforderliche Aktivit\u00e4ten zur Umsetzung", "Offene Punkte"],
        "scales": [("Zeitlicher Horizont", "kurzfristig", "langfristig"), ("Komplexit\u00e4t", "gering", "hoch"),
                   ("Kosten", "gering", "hoch"), ("Risiko", "gering", "hoch")],
        "open": ["offen"], "default_title": "Ma\u00dfnahmen-Canvas", "title_prefix": "Ma\u00dfnahmen-Canvas",
        "act1": "\u2714 Erforderliche Aktivit\u00e4ten", "act2": "zur Umsetzung", "www": "Was? Wer? Wann?",
        "act_short": "Aktivitäten", "done": "erledigt",
        "truncated": "\u2026 (vollst\u00e4ndig im Markdown)", "missing": "Phase '{phase}': fehlende Felder: {fields}",
        "ok": "Phase '{phase}': alle Pflichtfelder bef\u00fcllt.",
        "png_skipped": "PNG \u00fcbersprungen: weder cairosvg noch rsvg-convert verf\u00fcgbar.",
        "warn_dup": "Warnung: Umsetzung/{label} kommt mehrfach vor; im Bild wird nur der letzte Eintrag gezeigt.",
        "warn_long": "Warnung: Umsetzung/{label}: Begr\u00fcndung zu lang, im Bild nach ca. {max} Zeichen abgeschnitten. Bitte k\u00fcrzen.",
        "warn_ignored": "Warnung: Umsetzung-Eintrag ohne Wert (1\u20135) wird im Bild nicht angezeigt: {text}",
    },
    "pt": {
        "fields": ["Medida", "Descri\u00e7\u00e3o", "Contexto", "Valor agregado", "Partes interessadas", "TI",
                   "Fatores cr\u00edticos de sucesso", "Recursos", "Implementa\u00e7\u00e3o",
                   "Atividades necess\u00e1rias para a implementa\u00e7\u00e3o", "Pontos em aberto"],
        "scales": [("Horizonte de tempo", "curto prazo", "longo prazo"), ("Complexidade", "baixa", "alta"),
                   ("Custos", "baixos", "altos"), ("Risco", "baixo", "alto")],
        "open": ["aberto"], "default_title": "Canvas de a\u00e7\u00e3o", "title_prefix": "Canvas de a\u00e7\u00e3o",
        "act1": "\u2714 Atividades necess\u00e1rias", "act2": "para a implementa\u00e7\u00e3o", "www": "O qu\u00ea? Quem? Quando?",
        "act_short": "Atividades", "done": "concluídas",
        "truncated": "\u2026 (texto completo no Markdown)", "missing": "Fase '{phase}': campos em falta: {fields}",
        "ok": "Fase '{phase}': todos os campos obrigat\u00f3rios preenchidos.",
        "png_skipped": "PNG ignorado: cairosvg e rsvg-convert indispon\u00edveis.",
        "warn_dup": "Aviso: Implementa\u00e7\u00e3o/{label} aparece mais de uma vez; s\u00f3 a \u00faltima entrada \u00e9 mostrada.",
        "warn_long": "Aviso: Implementa\u00e7\u00e3o/{label}: justifica\u00e7\u00e3o demasiado longa, cortada na imagem ap\u00f3s cerca de {max} caracteres. Encurte-a.",
        "warn_ignored": "Aviso: entrada de Implementa\u00e7\u00e3o sem valor (1\u20135) n\u00e3o \u00e9 mostrada na imagem: {text}",
    },
    "fr": {
        "fields": ["Mesure", "Description", "Contexte", "Valeur ajout\u00e9e", "Parties prenantes", "IT",
                   "Facteurs cl\u00e9s de succ\u00e8s", "Ressources", "Mise en \u0153uvre",
                   "Activit\u00e9s requises pour la mise en \u0153uvre", "Points ouverts"],
        "scales": [("Horizon temporel", "court terme", "long terme"), ("Complexit\u00e9", "faible", "\u00e9lev\u00e9e"),
                   ("Co\u00fbts", "faibles", "\u00e9lev\u00e9s"), ("Risque", "faible", "\u00e9lev\u00e9")],
        "open": ["ouvert"], "default_title": "Canvas d'action", "title_prefix": "Canvas d'action",
        "act1": "\u2714 Activit\u00e9s requises", "act2": "pour la mise en \u0153uvre", "www": "Quoi ? Qui ? Quand ?",
        "act_short": "Activités", "done": "terminées",
        "truncated": "\u2026 (texte complet dans le Markdown)", "missing": "Phase \u00ab {phase} \u00bb : champs manquants : {fields}",
        "ok": "Phase \u00ab {phase} \u00bb : tous les champs obligatoires sont remplis.",
        "png_skipped": "PNG ignor\u00e9 : ni cairosvg ni rsvg-convert disponible.",
        "warn_dup": "Avertissement : Mise en \u0153uvre/{label} appara\u00eet plusieurs fois ; seule la derni\u00e8re entr\u00e9e est affich\u00e9e.",
        "warn_long": "Avertissement : Mise en \u0153uvre/{label} : justification trop longue, coup\u00e9e dans l'image apr\u00e8s environ {max} caract\u00e8res. Raccourcissez-la.",
        "warn_ignored": "Avertissement : entr\u00e9e de Mise en \u0153uvre sans valeur (1\u20135), non affich\u00e9e dans l'image : {text}",
    },
    "it": {
        "fields": ["Misura", "Descrizione", "Contesto", "Valore aggiunto", "Stakeholder", "IT",
                   "Fattori critici di successo", "Risorse", "Attuazione",
                   "Attivit\u00e0 necessarie per l'attuazione", "Punti aperti"],
        "scales": [("Orizzonte temporale", "breve termine", "lungo termine"), ("Complessit\u00e0", "bassa", "alta"),
                   ("Costi", "bassi", "alti"), ("Rischio", "basso", "alto")],
        "open": ["aperto"], "default_title": "Canvas d'azione", "title_prefix": "Canvas d'azione",
        "act1": "\u2714 Attivit\u00e0 necessarie", "act2": "per l'attuazione", "www": "Cosa? Chi? Quando?",
        "act_short": "Attività", "done": "completate",
        "truncated": "\u2026 (testo completo nel Markdown)", "missing": "Fase '{phase}': campi mancanti: {fields}",
        "ok": "Fase '{phase}': tutti i campi obbligatori compilati.",
        "png_skipped": "PNG saltato: cairosvg e rsvg-convert non disponibili.",
        "warn_dup": "Avviso: Attuazione/{label} compare pi\u00f9 volte; nell'immagine viene mostrata solo l'ultima voce.",
        "warn_long": "Avviso: Attuazione/{label}: motivazione troppo lunga, tagliata nell'immagine dopo circa {max} caratteri. Accorciala.",
        "warn_ignored": "Avviso: voce di Attuazione senza valore (1\u20135), non mostrata nell'immagine: {text}",
    },
    "es": {
        "fields": ["Medida", "Descripci\u00f3n", "Contexto", "Valor a\u00f1adido", "Partes interesadas", "TI",
                   "Factores cr\u00edticos de \u00e9xito", "Recursos", "Implementaci\u00f3n",
                   "Actividades necesarias para la implementaci\u00f3n", "Puntos abiertos"],
        "scales": [("Horizonte temporal", "corto plazo", "largo plazo"), ("Complejidad", "baja", "alta"),
                   ("Costes", "bajos", "altos"), ("Riesgo", "bajo", "alto")],
        "open": ["abierto"], "default_title": "Canvas de acci\u00f3n", "title_prefix": "Canvas de acci\u00f3n",
        "act1": "\u2714 Actividades necesarias", "act2": "para la implementaci\u00f3n", "www": "\u00bfQu\u00e9? \u00bfQui\u00e9n? \u00bfCu\u00e1ndo?",
        "act_short": "Actividades", "done": "completadas",
        "truncated": "\u2026 (texto completo en el Markdown)", "missing": "Fase '{phase}': campos que faltan: {fields}",
        "ok": "Fase '{phase}': todos los campos obligatorios completados.",
        "png_skipped": "PNG omitido: no hay cairosvg ni rsvg-convert.",
        "warn_dup": "Aviso: Implementaci\u00f3n/{label} aparece m\u00e1s de una vez; solo se muestra la \u00faltima entrada.",
        "warn_long": "Aviso: Implementaci\u00f3n/{label}: justificaci\u00f3n demasiado larga, se corta en la imagen tras unos {max} caracteres. Ac\u00f3rtala.",
        "warn_ignored": "Aviso: la entrada de Implementaci\u00f3n sin valor (1\u20135) no se muestra en la imagen: {text}",
    },
}
DEFAULT_LANG = "en"  # any language that is not supported falls back to English


def norm(text):
    """Lowercase and strip accents, so that headings match regardless of accents."""
    t = unicodedata.normalize("NFKD", text.strip().lower().replace("\u00df", "ss").replace("\u0153", "oe"))
    return "".join(c for c in t if not unicodedata.combining(c))


def normalize_lang(code):
    """'pt-BR', 'pt_PT', 'DE' -> 'pt', 'pt', 'de'; unsupported or empty -> English."""
    base = re.split(r"[-_]", (code or "").strip().lower())[0]
    return base if base in LANGS else DEFAULT_LANG


def heading_keys():
    """normalized heading -> (field key, language) for all supported languages."""
    table = {}
    for lang, d in LANGS.items():
        for k, name in zip(FIELD_KEYS, d["fields"]):
            table.setdefault(norm(name), (k, lang))
    return table


HEADINGS = heading_keys()


def key_for(heading):
    h = norm(re.sub(r"^\d+[.)]?\s*", "", heading))
    if h in HEADINGS:  # exact match also covers the short names "IT"/"TI"
        return HEADINGS[h][0]
    for name, (k, _) in sorted(HEADINGS.items(), key=lambda kv: -len(kv[0])):
        if len(name) > 3 and h.startswith(name):
            return k
    return None


def detect_lang(md):
    """Output language: `lang=` in the canvas-meta comment, else the most frequent heading language, else English."""
    m = re.search(r"<!--\s*canvas-meta:[^>]*\blang=([A-Za-z_-]+)", md)
    if m:
        return normalize_lang(m.group(1))
    votes = {}
    for line in md.splitlines():
        if line.startswith("## "):
            h = norm(re.sub(r"^\d+[.)]?\s*", "", line[3:]))
            hit = HEADINGS.get(h)
            if hit and len(h) > 3:
                votes[hit[1]] = votes.get(hit[1], 0) + 1
    if not votes:
        return DEFAULT_LANG
    best = max(votes.values())
    return next(l for l in LANGS if votes.get(l) == best)  # ties: order of LANGS (English first)


def open_re():
    words = sorted({w for d in LANGS.values() for w in d["open"]})
    return re.compile(r"(_?(" + "|".join(words) + r")_?|tbd|todo|-)", re.I)


OPEN_RE = open_re()


def parse(md):
    title, sections, cur = "", {k: [] for k in FIELD_KEYS}, None
    for raw in md.splitlines():
        line = raw.rstrip()
        if line.startswith("# ") and not title:
            title = line[2:].strip()
        elif line.startswith("## "):
            cur = key_for(line[3:])
        elif cur and re.match(r"^\s*[-*]\s+", line):
            item = re.sub(r"^\s*[-*]\s+", "", line)
            if re.match(r"^\[[xX]\]\s*", item):
                item = "\u2713 " + item[3:].strip()
            elif re.match(r"^\[ \]\s*", item):
                item = "\u25cb " + item[3:].strip()
            if item and not OPEN_RE.fullmatch(item.strip()):
                sections[cur].append(item)
    return title, sections


def scale_entries(items):
    """Yield (item, key, value, justification) for the Implementation list; key is None if the item is no scale entry.
    The label may be written in any supported language."""
    labels = {}
    for d in LANGS.values():
        for k, (label, *_) in zip(SCALE_KEYS, d["scales"]):
            labels[norm(label)] = k
    for it in items:
        m = re.search(r"([1-5])\s*/\s*5(.*)$", it)
        key = None
        if m:
            low = norm(it)
            key = next((k for label, k in labels.items() if low.startswith(label)), None)
        if key:
            yield it, key, int(m.group(1)), re.sub(r"^\s*[\u2013\u2014:-]+\s*", "", m.group(2)).strip()
        else:
            yield it, None, None, None


def scale_data(items):
    """key -> (value, justification); if a scale appears more than once, the last entry wins."""
    return {k: (v, note) for _, k, v, note in scale_entries(items) if k}


def scale_values(items):
    return {k: v[0] for k, v in scale_data(items).items()}


# The Implementation card shows one line per scale: value plus a justification of at most NOTE_LINES lines.
IMPL_W, NOTE_FS, NOTE_LINES = 279, 11, 2


def warnings(sections, lang):
    """Things the image cannot show: duplicate scales, entries without a 1-5 value, too long justifications."""
    L = LANGS[lang]
    names = dict(zip(SCALE_KEYS, (s[0] for s in L["scales"])))
    width = IMPL_W - 44
    cpl = max(6, int(width / (NOTE_FS * 0.55)))
    out, seen = [], {}
    for item, key, _val, note in scale_entries(sections["implementation"]):
        if key is None:
            out.append(L["warn_ignored"].format(text=item))
            continue
        seen[key] = seen.get(key, 0) + 1
        if seen[key] == 2:
            out.append(L["warn_dup"].format(label=names[key]))
        if len(wrap(note, NOTE_FS, width)) > NOTE_LINES:
            out.append(L["warn_long"].format(label=names[key], max=NOTE_LINES * cpl))
    return out


def check(sections, phase, lang):
    d = LANGS[lang]
    names = dict(zip(FIELD_KEYS, d["fields"]))
    scale_names = dict(zip(SCALE_KEYS, (s[0] for s in d["scales"])))
    missing = [names[k] for k in PHASES[phase] if not sections[k]]
    if "implementation" in PHASES[phase] and sections["implementation"]:
        v = scale_values(sections["implementation"])
        missing += [f"{names['implementation']}/{scale_names[k]}" for k in SCALE_KEYS if k not in v]
    return missing


# ---------------- SVG ----------------
EYEBROW = "ACTION CANVAS"
FONT = "Inter, 'DejaVu Sans', Arial, Helvetica, sans-serif"
BG, NAVY, TEXT, MUTED, TRACK = "#f3f4f8", "#0c2a4a", "#1e293b", "#64748b", "#e8eaf0"
ACCENTS = {  # field key -> (accent, tint)
    "value": ("#16a34a", "#dcfce7"), "stakeholders": ("#7c3aed", "#ede9fe"),
    "it": ("#2563eb", "#dbeafe"), "implementation": ("#ea580c", "#ffedd5"),
    "activities": ("#4f46e5", "#e0e7ff"), "success": ("#d97706", "#fef3c7"),
    "resources": ("#0d9488", "#ccfbf1"), "openpoints": ("#64748b", "#e2e8f0"),
}
HORIZON_COLORS = ("#93c5fd", "#2563eb")  # (bar, value text): neutral blue, a longer horizon is not "worse"
SCALE_COLORS = {1: ("#22c55e", "#16a34a"), 2: ("#84cc16", "#65a30d"), 3: ("#eab308", "#ca8a04"),
                4: ("#f97316", "#ea580c"), 5: ("#ef4444", "#dc2626")}  # (bar, value text) by value 1-5

TRUNCATED = LANGS[DEFAULT_LANG]["truncated"]  # set per run in main()


def t(x, y, s, fs, fill=TEXT, weight=None, anchor=None, extra=""):
    attrs = f'x="{x:.1f}" y="{y:.1f}" font-size="{fs:g}" fill="{fill}"'
    if weight:
        attrs += f' font-weight="{weight}"'
    if anchor:
        attrs += f' text-anchor="{anchor}"'
    return f"<text {attrs}{extra}>{escape(s)}</text>"


def wrap(text, fs, width, factor=0.55):
    return textwrap.wrap(text, max(6, int(width / (fs * factor)))) or [""]


def clamp(text, fs, width, max_lines, factor=0.55):
    """Wrap text and cut it after max_lines lines, marking the cut with an ellipsis."""
    lines = wrap(text, fs, width, factor)
    if len(lines) > max_lines:
        cpl = max(6, int(width / (fs * factor)))
        lines = lines[:max_lines]
        lines[-1] = lines[-1][:cpl - 1].rstrip(" ,.;:-\u2013\u2014") + "\u2026"
    return lines


def card(x, y, w, h, accent=None):
    s = [f'<rect x="{x:.1f}" y="{y+3:.1f}" width="{w:.1f}" height="{h}" rx="16" fill="#0f172a" fill-opacity="0.025"/>',
         f'<rect x="{x:.1f}" y="{y+1:.1f}" width="{w:.1f}" height="{h}" rx="16" fill="#0f172a" fill-opacity="0.035"/>',
         f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h}" rx="16" fill="white"/>']
    if accent:
        s.append(f'<rect x="{x:.1f}" y="{y+16:.1f}" width="4" height="{h-32}" rx="2" fill="{accent}"/>')
    return "".join(s)


def header(x, y, w, key, title):
    accent, tint = ACCENTS[key]
    fs = min(17, (w - 64) / (max(len(title), 1) * 0.6))
    return (f'<circle cx="{x+30:.1f}" cy="{y+27}" r="13" fill="{tint}"/>'
            + t(x + 30, y + 32, str(FIELD_KEYS.index(key) + 1), 13, accent, "bold", "middle")
            + t(x + 52, y + 33, title, fs, TEXT, "bold"))


def bullets(items, x, y0, w, h, color, max_fs=13, min_fs=8):
    """Bullet list with hanging indent, first baseline at y0, must end within y0+h; shrinks, then truncates."""
    fs = max_fs
    while True:
        blocks = [wrap(i, fs, w - 13) for i in items]
        n = sum(len(b) for b in blocks)
        lh = fs * 1.4
        if n == 0 or (n - 1) * lh <= h or fs <= min_fs:
            break
        fs -= 0.5
    lines = [(ln, k == 0) for b in blocks for k, ln in enumerate(b)]
    max_lines = int(h // lh) + 1
    trunc = len(lines) > max_lines
    if trunc:
        lines = lines[:max(max_lines - 1, 0)]
    out = []
    for i, (ln, first) in enumerate(lines):
        y = y0 + i * lh
        if first:
            out.append(f'<circle cx="{x+3:.1f}" cy="{y - fs*0.32:.1f}" r="2.6" fill="{color}"/>')
        out.append(t(x + 13, y, ln, fs))
    if trunc:
        out.append(t(x + 13, y0 + len(lines) * lh, TRUNCATED, fs, MUTED))
    return "".join(out)


def hero(items, x, y0, w, h):
    """White bold text for the dark Measure box: no bullets, shrinks to fit."""
    fs = 22
    while True:
        lines = [ln for i in items for ln in wrap(i, fs, w, 0.6)]
        lh = fs * 1.3
        if (len(lines) - 1) * lh <= h or fs <= 12:
            break
        fs -= 1
    maxl = int(h // lh) + 1
    if len(lines) > maxl:
        lines = lines[:maxl - 1] + [TRUNCATED]
    return "".join(t(x, y0 + i * lh, ln, fs, "white", "bold") for i, ln in enumerate(lines))


def scale_rows(x, y, w, S, L, F):
    data = scale_data(S["implementation"])
    out = [card(x, y, w, 370, ACCENTS["implementation"][0]), header(x, y, w, "implementation", F["implementation"])]
    bx, bw = x + 22, w - 44
    seg = (bw - 4 * 5.5) / 5
    for n, (k, (label, lo, hi)) in enumerate(zip(SCALE_KEYS, L["scales"])):
        ry = y + n * 77.8
        val, note = data.get(k, (0, ""))
        bar, txt = HORIZON_COLORS if k == "horizon" else SCALE_COLORS.get(val, ("", ""))
        out.append(t(bx, ry + 60, label, 14, TEXT, "bold"))
        if val:
            out.append(t(bx + bw, ry + 60, f"{val}/5", 14, txt, "bold", "end"))
        for i in range(5):
            fill = bar if i < val else TRACK
            out.append(f'<rect x="{bx + i * (seg + 5.5):.1f}" y="{ry + 68:.1f}" width="{seg:.1f}" height="9" rx="4.5" fill="{fill}"/>')
        out.append(t(bx, ry + 90.5, lo, 9, "#94a3b8"))
        out.append(t(bx + bw, ry + 90.5, hi, 9, "#94a3b8", anchor="end"))
        for i, ln in enumerate(clamp(note, NOTE_FS, bw, NOTE_LINES)):
            out.append(t(bx, ry + 106 + i * 13, ln, NOTE_FS))
    return "".join(out)


def parse_activity(item):
    done = item.startswith("✓ ")
    text = item[2:] if item[:2] in ("✓ ", "○ ") else item
    parts = re.split(r"\s+[—–]\s+", text)
    meta = " · ".join(p.strip("_ ") for p in parts[1:] if p.strip("_ "))
    return done, parts[0], meta


def activity_card(x, y, w, h, items, L):
    acts = [parse_activity(i) for i in items]
    done = sum(1 for a in acts if a[0])
    out = [card(x, y, w, h, ACCENTS["activities"][0]), header(x, y, w, "activities", L["act_short"]),
           t(x + 22, y + 49, L["www"], 10.5, MUTED)]
    if acts:
        out.append(t(x + w - 23, y + 59, f"{done}/{len(acts)} {L['done']}", 10.5, MUTED, anchor="end"))
    bar_w = w - 45
    out.append(f'<rect x="{x+22}" y="{y+63.5}" width="{bar_w}" height="5" rx="2.5" fill="{TRACK}"/>')
    if acts and done:
        out.append(f'<rect x="{x+22}" y="{y+63.5}" width="{bar_w * done / len(acts):.1f}" height="5" rx="2.5" fill="#22c55e"/>')
    cy, limit = y + 97, y + h - 14
    for n, (is_done, what, meta) in enumerate(acts):
        lines = clamp(what, 12.5, w - 62, 2, 0.56)
        height = (len(lines) - 1) * 15 + (14.5 if meta else 0)
        if cy + height > limit:
            out.append(t(x + 46, cy, TRUNCATED, 11, MUTED))
            break
        icx, icy = x + 30, cy - 4.5
        if is_done:
            out.append(f'<circle cx="{icx}" cy="{icy:.1f}" r="8" fill="#22c55e"/>')
            out.append(f'<path d="M{icx-3.6},{icy+0.4:.1f} L{icx-1},{icy+3:.1f} L{icx+3.8},{icy-2.6:.1f}" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>')
        else:
            out.append(f'<circle cx="{icx}" cy="{icy:.1f}" r="7" fill="white" stroke="{ACCENTS["activities"][0]}" stroke-width="2"/>')
        for i, ln in enumerate(lines):
            out.append(t(x + 46, cy + i * 15, ln, 12.5, MUTED if is_done else TEXT, None if is_done else "bold"))
        if meta:
            out.append(t(x + 46, cy + (len(lines) - 1) * 15 + 14.5, meta, 11, ACCENTS["activities"][0]))
        cy += height + 24.4
    return "".join(out)


def render_svg(title, S, lang=DEFAULT_LANG):
    L = LANGS[lang]
    F = dict(zip(FIELD_KEYS, L["fields"]))
    W, H = 1160, 820
    cw = (W - 40 - 32) / 3
    cols = [20, 20 + cw + 16, 20 + 2 * (cw + 16)]
    prefixes = "|".join(re.escape(d["title_prefix"]) for d in LANGS.values())
    name = re.sub(rf"^(?:{prefixes})\s*:\s*", "", title, flags=re.I).strip() or L["default_title"]
    p = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="{FONT}">',
         f'<rect width="{W}" height="{H}" fill="{BG}"/>',
         t(20, 34, EYEBROW, 11.5, MUTED, "bold", extra=' letter-spacing="2.4"'),
         t(20, 62, name, max(14, min(25, (W - 40) / (0.6 * len(name)))), TEXT, "bold")]

    def simple(x, y, w, h, key):
        accent = ACCENTS[key][0]
        return (card(x, y, w, h, accent) + header(x, y, w, key, F[key])
                + bullets(S[key], x + 20, y + 64, w - 38, h - 78, accent))

    # top row
    for x, key in zip(cols, ("value", "stakeholders", "it")):
        p.append(simple(x, 82, cw, 169, key))
    # middle row
    impl_w, act_w = IMPL_W, 300
    mx = 20 + impl_w + 16
    mw = W - 20 - act_w - 16 - mx
    p.append(scale_rows(20, 267, impl_w, S, L, F))
    p.append(f'<rect x="{mx}" y="267" width="{mw}" height="129" rx="16" fill="{NAVY}"/>')
    p.append(t(mx + 24, 298, f"1 · {F['measure'].upper()}", 11.5, "#7cc0f6", "bold", extra=' letter-spacing="1.8"'))
    p.append(hero(S["measure"], mx + 24, 330, mw - 48, 48))
    half = (mw - 16) / 2
    for i, key in enumerate(("description", "background")):
        x = mx + i * (half + 16)
        p.append(card(x, 412, half, 225))
        p.append(t(x + 20, 442, f"{FIELD_KEYS.index(key) + 1} · {F[key].upper()}", 11, MUTED, "bold", extra=' letter-spacing="1.6"'))
        p.append(bullets(S[key], x + 20, 466, half - 38, 225 - 82, TEXT))
    p.append(activity_card(W - 20 - act_w, 267, act_w, 370, S["activities"], L))
    # bottom row
    for x, key in zip(cols, ("success", "resources", "openpoints")):
        p.append(simple(x, 653, cw, 150, key))
    p.append("</svg>")
    return "\n".join(p)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("markdown")
    ap.add_argument("-o", "--out")
    ap.add_argument("--png", action="store_true")
    ap.add_argument("--check", choices=PHASES)
    ap.add_argument("--lang", help="output language (en, de, pt, fr, it, es; pt-BR accepted); default: detected from the canvas, else en")
    a = ap.parse_args()
    md = Path(a.markdown)
    text = md.read_text(encoding="utf-8")
    title, S = parse(text)
    lang = normalize_lang(a.lang) if a.lang else detect_lang(text)
    global TRUNCATED
    TRUNCATED = LANGS[lang]["truncated"]
    warns = warnings(S, lang)
    if a.check:
        miss = check(S, a.check, lang)
        if miss:
            print(LANGS[lang]["missing"].format(phase=a.check, fields=", ".join(miss)))
        else:
            print(LANGS[lang]["ok"].format(phase=a.check))
        for w in warns:
            print(w)
        if miss:
            sys.exit(1)
        return
    out = Path(a.out) if a.out else md.with_suffix(".svg")
    out.write_text(render_svg(title, S, lang), encoding="utf-8")
    print(f"SVG: {out}")
    for w in warns:
        print(w)
    if a.png:
        png = out.with_suffix(".png")
        try:
            import cairosvg
            cairosvg.svg2png(url=str(out), write_to=str(png), output_width=2320)
        except ImportError:
            if shutil.which("rsvg-convert"):
                subprocess.run(["rsvg-convert", "-w", "2320", "-o", str(png), str(out)], check=True)
            else:
                print(LANGS[lang]["png_skipped"])
                return
        print(f"PNG: {png}")


if __name__ == "__main__":
    main()
