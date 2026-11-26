(() => {
  // Déjà injecté dans cet onglet : on bascule simplement l'état.
  if (window.__fontInspect) {
    window.__fontInspect.toggle();
    return;
  }

  const t = (key, ...subs) => browser.i18n.getMessage(key, subs);

  // ---------- Préférences ----------

  const DEFAULT_SETTINGS = { displayMode: "full" }; // "full" | "compact"
  let settings = { ...DEFAULT_SETTINGS };

  browser.storage.sync
    .get(DEFAULT_SETTINGS)
    .then((stored) => { settings = { ...DEFAULT_SETTINGS, ...stored }; })
    .catch(() => {});

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes.displayMode) return;
    settings.displayMode = changes.displayMode.newValue || DEFAULT_SETTINGS.displayMode;
    rerenderPanel();
  });

  const isCompact = () => settings.displayMode === "compact";

  const WEIGHT_NAMES = {
    100: "Thin",
    200: "Extra Light",
    300: "Light",
    400: "Regular",
    500: "Medium",
    600: "Semi Bold",
    700: "Bold",
    800: "Extra Bold",
    900: "Black",
  };

  const PANEL_CSS = `
    :host { all: initial; }
    .panel {
      position: fixed;
      z-index: 2147483647;
      min-width: 260px;
      max-width: 360px;
      background: #1e1b2e;
      color: #ece9f7;
      border: 1px solid #3b3557;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, .35);
      font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      overflow: hidden;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 10px;
      background: #2a2540;
      border-bottom: 1px solid #3b3557;
    }
    .tag { color: #b6a6ff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    button.close {
      all: unset;
      cursor: pointer;
      color: #a39dbf;
      font-size: 16px;
      line-height: 1;
      padding: 0 2px;
    }
    button.close:hover { color: #fff; }
    .actions { display: flex; align-items: center; gap: 6px; flex: none; }
    button.mode {
      all: unset;
      cursor: pointer;
      color: #a39dbf;
      font-size: 13px;
      line-height: 1;
      padding: 0 2px;
    }
    button.mode:hover { color: #fff; }

    /* Mode compact : panneau le plus petit possible */
    .panel.compact { min-width: 0; max-width: 260px; border-radius: 8px; }
    .panel.compact header { padding: 4px 8px; }
    .panel.compact dl { gap: 2px 10px; padding: 6px 8px; }
    .panel.compact dd { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .panel.compact .swatch { width: 10px; height: 10px; margin-right: 4px; vertical-align: -1px; }
    .preview {
      padding: 10px;
      font-size: 22px;
      line-height: 1.2;
      color: #fff;
      border-bottom: 1px solid #3b3557;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 6px 12px;
      margin: 0;
      padding: 10px;
    }
    dt { color: #8f88ad; }
    dd { margin: 0; cursor: copy; word-break: break-word; }
    dd:hover { color: #fff; text-decoration: underline dotted; }
    dd .sub { color: #8f88ad; }
    dd.copied { color: #7ee2a8; }
    .swatch {
      display: inline-block;
      width: 12px;
      height: 12px;
      margin-right: 6px;
      vertical-align: -2px;
      border-radius: 3px;
      border: 1px solid rgba(255, 255, 255, .35);
    }
    .note {
      display: block;
      margin-top: 2px;
      color: #6f6990;
      font-size: 11px;
    }
    footer {
      padding: 6px 10px;
      color: #6f6990;
      font-size: 11px;
      border-top: 1px solid #3b3557;
    }
  `;

  let active = false;
  let hovered = null;
  let highlight = null;
  let host = null; // shadow host du panneau
  let shadow = null;

  // ---------- Lecture des propriétés ----------

  function px(value) {
    return Math.round(parseFloat(value) * 100) / 100;
  }

  function getFontInfo(el) {
    const cs = getComputedStyle(el);
    const fontSize = parseFloat(cs.fontSize);

    const weight = cs.fontWeight;
    const weightName = WEIGHT_NAMES[Math.round(Number(weight) / 100) * 100];

    let lineHeight = cs.lineHeight;
    let lineHeightSub = "";
    if (lineHeight !== "normal") {
      const lh = parseFloat(lineHeight);
      lineHeight = `${px(lh)}px`;
      lineHeightSub = `${px(lh / fontSize)}`;
    }

    let letterSpacing = cs.letterSpacing;
    let letterSpacingSub = "";
    if (letterSpacing !== "normal") {
      const ls = parseFloat(letterSpacing);
      letterSpacing = `${px(ls)}px`;
      letterSpacingSub = `${px(ls / fontSize)}em`;
    }

    return {
      fontFamily: cs.fontFamily,
      fontSize: `${px(fontSize)}px`,
      fontSizeSub: `${px(fontSize / 16)}rem`,
      fontWeight: weight,
      fontWeightSub: weightName || "",
      fontStyle: cs.fontStyle,
      lineHeight,
      lineHeightSub,
      letterSpacing,
      letterSpacingSub,
      color: getColorInfo(el, cs.color),
    };
  }

  // ---------- Couleur : valeur définie (cascade) ----------

  // Découpe "a, b:is(c, d)" en ["a", "b:is(c, d)"] en respectant les parenthèses.
  function splitTopLevel(str, sep = ",") {
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === "\\") i++;
      else if (ch === "(" || ch === "[") depth++;
      else if (ch === ")" || ch === "]") depth--;
      else if (ch === sep && depth === 0) {
        parts.push(str.slice(start, i));
        start = i + 1;
      }
    }
    parts.push(str.slice(start));
    return parts.map((p) => p.trim()).filter(Boolean);
  }

  // Lit le contenu entre parenthèses à partir de str[open] === "(".
  function readParens(str, open) {
    let depth = 0;
    for (let i = open; i < str.length; i++) {
      if (str[i] === "\\") i++;
      else if (str[i] === "(") depth++;
      else if (str[i] === ")" && --depth === 0) return { inner: str.slice(open + 1, i), end: i + 1 };
    }
    return { inner: str.slice(open + 1), end: str.length };
  }

  const LEGACY_PSEUDO_ELEMENTS = new Set(["before", "after", "first-line", "first-letter"]);
  const cmpSpec = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  const maxSpec = (list) =>
    splitTopLevel(list).map(specificity).reduce((m, s) => (cmpSpec(s, m) > 0 ? s : m), [0, 0, 0]);

  // Spécificité [ids, classes/attributs/pseudo-classes, types/pseudo-éléments].
  function specificity(sel) {
    const s = [0, 0, 0];
    const add = (o) => { s[0] += o[0]; s[1] += o[1]; s[2] += o[2]; };
    let rest = "";
    let i = 0;
    while (i < sel.length) {
      const ch = sel[i];
      if (ch === "\\") {
        rest += sel.slice(i, i + 2);
        i += 2;
      } else if (ch === "[") {
        s[1]++;
        while (i < sel.length && sel[i] !== "]") i++;
        i++;
        rest += " ";
      } else if (ch === ":") {
        const m = /^(::?)([\w-]+)/.exec(sel.slice(i));
        if (!m) { i++; continue; }
        const name = m[2].toLowerCase();
        i += m[0].length;
        let inner = null;
        if (sel[i] === "(") {
          const p = readParens(sel, i);
          inner = p.inner;
          i = p.end;
        }
        if (m[1] === "::" || LEGACY_PSEUDO_ELEMENTS.has(name)) s[2]++;
        else if (name === "where") { /* spécificité nulle */ }
        else if (["is", "not", "has", "matches", "-moz-any"].includes(name)) add(maxSpec(inner || ""));
        else {
          s[1]++;
          const of = inner && /\sof\s(.+)$/i.exec(inner);
          if (of) add(maxSpec(of[1]));
        }
        rest += " ";
      } else {
        rest += ch;
        i++;
      }
    }
    const ident = "(?:[\\w-]|\\\\.)+";
    s[0] += (rest.match(new RegExp(`#${ident}`, "g")) || []).length;
    s[1] += (rest.match(new RegExp(`\\.${ident}`, "g")) || []).length;
    const types = rest
      .replace(new RegExp(`[#.]${ident}`, "g"), " ")
      .split(/[\s>+~]+/)
      .filter((t) => /^(?:[\w-]*\|)?[a-zA-Z][\w-]*$/.test(t));
    s[2] += types.length;
    return s;
  }

  function matchSpecificity(el, selectorText) {
    let best = null;
    for (const sel of splitTopLevel(selectorText)) {
      try {
        if (el.matches(sel)) {
          const sp = specificity(sel);
          if (!best || cmpSpec(sp, best) > 0) best = sp;
        }
      } catch { /* sélecteur non supporté */ }
    }
    return best;
  }

  const mediaMatches = (media) => !media || !media.mediaText || matchMedia(media.mediaText).matches;

  // Cherche la déclaration `color` gagnante pour un élément (approximation de la cascade).
  function findColorDeclaration(el) {
    const candidates = [];
    let order = 0;
    let blocked = 0;

    const visitRules = (rules) => {
      for (const rule of rules) {
        switch (rule.type) {
          case 1: { // CSSStyleRule
            const value = rule.style.getPropertyValue("color");
            if (!value) break;
            const spec = matchSpecificity(el, rule.selectorText);
            if (spec) {
              candidates.push({
                value: value.trim(),
                important: rule.style.getPropertyPriority("color") === "important",
                inline: false,
                spec,
                order: order++,
                selector: rule.selectorText,
              });
            }
            break;
          }
          case 3: // @import
            if (rule.styleSheet && mediaMatches(rule.media)) visitSheet(rule.styleSheet);
            break;
          case 4: // @media
            if (mediaMatches(rule.media)) visitRules(rule.cssRules);
            break;
          case 12: // @supports
            if (CSS.supports(rule.conditionText)) visitRules(rule.cssRules);
            break;
          default: // @layer, @container, @scope… (approximation : on prend tout)
            if (rule.cssRules) visitRules(rule.cssRules);
        }
      }
    };

    const visitSheet = (sheet) => {
      if (sheet.disabled || !mediaMatches(sheet.media)) return;
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        blocked++; // feuille cross-origin non lisible
        return;
      }
      visitRules(rules);
    };

    const root = el.getRootNode();
    for (const sheet of [...(root.styleSheets || []), ...(root.adoptedStyleSheets || [])]) {
      visitSheet(sheet);
    }

    const inlineValue = el.style?.getPropertyValue("color");
    if (inlineValue) {
      candidates.push({
        value: inlineValue.trim(),
        important: el.style.getPropertyPriority("color") === "important",
        inline: true,
        spec: [0, 0, 0],
        order: order++,
      });
    }

    candidates.sort(
      (x, y) =>
        y.important - x.important ||
        y.inline - x.inline ||
        cmpSpec(y.spec, x.spec) ||
        y.order - x.order,
    );
    return { decl: candidates[0] || null, blocked };
  }

  const INHERIT_KEYWORDS = /^(inherit|unset|currentcolor|revert|revert-layer)$/i;

  // Remonte les ancêtres tant que la couleur est héritée.
  function findColorSource(el) {
    let blocked = false;
    for (let cur = el; cur; cur = cur.parentElement || cur.getRootNode().host || null) {
      const { decl, blocked: b } = findColorDeclaration(cur);
      blocked ||= b > 0;
      if (decl && !INHERIT_KEYWORDS.test(decl.value)) {
        return { decl, element: cur, inherited: cur !== el, blocked };
      }
    }
    return { decl: null, blocked };
  }

  // Remplace les var(--x, fallback) par la valeur des custom properties.
  function resolveVars(value, el, depth = 0) {
    if (depth > 10 || !value.includes("var(")) return value;
    const cs = getComputedStyle(el);
    let out = "";
    let i = 0;
    while (i < value.length) {
      const idx = value.indexOf("var(", i);
      if (idx === -1) { out += value.slice(i); break; }
      out += value.slice(i, idx);
      const { inner, end } = readParens(value, idx + 3);
      const [name, ...fallback] = splitTopLevel(inner);
      const v = cs.getPropertyValue(name).trim() || fallback.join(", ");
      out += resolveVars(v, el, depth + 1);
      i = end;
    }
    return out;
  }

  // ---------- Couleur : conversion hexa ----------

  let colorCtx = null;
  function canvasRGB(color) {
    if (!colorCtx) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      colorCtx = canvas.getContext("2d", { willReadFrequently: true });
    }
    colorCtx.clearRect(0, 0, 1, 1);
    colorCtx.fillStyle = "#000";
    colorCtx.fillStyle = color; // le canvas convertit (et clippe) en sRGB
    colorCtx.fillRect(0, 0, 1, 1);
    const [r, g, b] = colorCtx.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  }

  const parseAlpha = (a) => (a.endsWith("%") ? parseFloat(a) / 100 : parseFloat(a));

  // Valeur calculée (rgb(), oklch(), color(srgb …)…) → #rrggbb ou #rrggbbaa.
  function toHex(color) {
    let rgb;
    let alpha = 1;
    const m = /^rgba?\(([^)]+)\)$/i.exec(color);
    if (m) {
      const parts = m[1].split(/[\s,/]+/).filter(Boolean);
      rgb = parts.slice(0, 3).map((p) => (p.endsWith("%") ? parseFloat(p) * 2.55 : parseFloat(p)));
      if (parts[3] != null) alpha = parseAlpha(parts[3]);
    } else {
      // On isole l'alpha ("… / 0.5)") pour lire la teinte opaque via le canvas.
      let opaque = color;
      const a = /^(.*)\/\s*([\d.]+%?)\s*\)$/.exec(color);
      if (a) {
        alpha = parseAlpha(a[2]);
        opaque = `${a[1].trim()})`;
      }
      rgb = canvasRGB(opaque);
    }
    const byte = (v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, "0");
    let hex = `#${rgb.map(byte).join("")}`;
    if (alpha < 1) hex += byte(alpha * 255);
    return hex;
  }

  const shorten = (s, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

  function getColorInfo(el, computed) {
    const { decl, element, inherited, blocked } = findColorSource(el);
    const authored = decl ? decl.value : computed;

    let source;
    if (!decl) {
      source = blocked ? t("colorSourceBlocked") : t("colorSourceDefault");
    } else {
      const where = decl.inline ? t("colorSourceInline") : shorten(decl.selector);
      source = inherited ? `${t("colorInheritedFrom", describe(element))} · ${where}` : where;
    }

    const resolved = decl && authored.includes("var(") ? resolveVars(authored, element) : null;
    const needsComputed = /color-mix\(|light-dark\(|\bfrom\b|calc\(/i.test(resolved || authored);

    return {
      authored,
      resolved: resolved && resolved !== authored ? resolved : null,
      computed: needsComputed ? computed : null,
      hex: toHex(computed),
      swatch: computed,
      source,
    };
  }

  function describe(el) {
    let s = el.tagName.toLowerCase();
    if (el.id) s += `#${el.id}`;
    const classes = [...el.classList].slice(0, 2);
    if (classes.length) s += `.${classes.join(".")}`;
    return s;
  }

  function sampleText(el) {
    const text = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
    return text.slice(0, 40) || "Aa Bb Cc 123";
  }

  // ---------- Surbrillance au survol ----------

  function ensureHighlight() {
    if (highlight) return;
    highlight = document.createElement("div");
    Object.assign(highlight.style, {
      position: "fixed",
      zIndex: "2147483646",
      pointerEvents: "none",
      background: "rgba(109, 74, 255, .12)",
      outline: "2px solid rgba(109, 74, 255, .8)",
      borderRadius: "2px",
      transition: "all 60ms ease-out",
      display: "none",
    });
    document.documentElement.appendChild(highlight);
  }

  function moveHighlight(el) {
    const r = el.getBoundingClientRect();
    Object.assign(highlight.style, {
      display: "block",
      top: `${r.top}px`,
      left: `${r.left}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    });
  }

  // ---------- Panneau ----------

  function ensurePanelHost() {
    if (host) return;
    host = document.createElement("font-inspect-panel");
    shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = PANEL_CSS;
    shadow.appendChild(style);
    document.documentElement.appendChild(host);
  }

  // `copy` : valeur copiée si différente de la valeur affichée.
  // `title` : détail affiché au survol (mode compact).
  function row(label, value, sub, { swatch, note, copy = value, title } = {}) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.title = title ? `${title}\n\n${t("copyHint")}` : t("copyHint");
    if (swatch) {
      const chip = document.createElement("span");
      chip.className = "swatch";
      chip.style.background = `linear-gradient(${swatch}, ${swatch}), repeating-conic-gradient(#aaa 0 25%, #fff 0 50%) 0 0 / 6px 6px`;
      dd.appendChild(chip);
    }
    dd.append(value);
    if (sub) {
      const span = document.createElement("span");
      span.className = "sub";
      span.textContent = `  (${sub})`;
      dd.appendChild(span);
    }
    if (note) {
      const small = document.createElement("span");
      small.className = "note";
      small.textContent = note;
      dd.appendChild(small);
    }
    dd.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(copy);
        dd.classList.add("copied");
        setTimeout(() => dd.classList.remove("copied"), 700);
      } catch {
        /* clipboard indisponible */
      }
    });
    return [dt, dd];
  }

  // Lignes du mode complet : toutes les infos, valeurs secondaires et origine de la couleur.
  function fullRows(info) {
    const rows = [
      ...row("font-family", info.fontFamily),
      ...row("font-size", info.fontSize, info.fontSizeSub),
      ...row("font-weight", info.fontWeight, info.fontWeightSub),
      ...row("line-height", info.lineHeight, info.lineHeightSub),
      ...row("letter-spacing", info.letterSpacing, info.letterSpacingSub),
      ...row("color", info.color.authored, null, { swatch: info.color.swatch, note: info.color.source }),
    ];
    if (info.color.resolved) rows.push(...row("→ var", info.color.resolved));
    if (info.color.computed) rows.push(...row(t("computedLabel"), info.color.computed));
    rows.push(...row("hex", info.color.hex, null, { swatch: info.color.swatch }));
    return rows;
  }

  // Lignes du mode compact : une ligne par propriété, le détail passe au survol.
  function compactRows(info) {
    const families = splitTopLevel(info.fontFamily).map((f) => f.replace(/^["']|["']$/g, ""));
    const more = families.length > 1 ? `+${families.length - 1}` : null;
    const colorDetail = [info.color.authored, info.color.resolved, info.color.source]
      .filter(Boolean)
      .join("\n");
    return [
      ...row("family", families[0] || info.fontFamily, more, {
        copy: info.fontFamily,
        title: info.fontFamily,
      }),
      ...row("size", info.fontSize, null, { title: info.fontSizeSub }),
      ...row("weight", info.fontWeight, info.fontWeightSub),
      ...row("line", info.lineHeight, info.lineHeightSub),
      ...row("spacing", info.letterSpacing, null, { title: info.letterSpacingSub }),
      ...row("color", info.color.hex, null, { swatch: info.color.swatch, title: colorDetail }),
    ];
  }

  let current = null; // { el, left, top } du panneau affiché

  function showPanel(el, x, y, keepPosition = false) {
    ensurePanelHost();
    const previous = shadow.querySelector(".panel");
    const prevRect = previous?.getBoundingClientRect();
    previous?.remove();

    const compact = isCompact();
    const info = getFontInfo(el);
    const panel = document.createElement("div");
    panel.className = compact ? "panel compact" : "panel";

    const header = document.createElement("header");
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = describe(el);

    const mode = document.createElement("button");
    mode.className = "mode";
    mode.textContent = compact ? "⊞" : "⊟";
    mode.title = compact ? t("switchToFull") : t("switchToCompact");
    mode.addEventListener("click", () => {
      settings.displayMode = compact ? "full" : "compact";
      browser.storage.sync.set({ displayMode: settings.displayMode }).catch(() => {});
      rerenderPanel();
    });

    const close = document.createElement("button");
    close.className = "close";
    close.textContent = "×";
    close.title = t("close");
    close.addEventListener("click", () => {
      panel.remove();
      current = null;
    });

    const actions = document.createElement("span");
    actions.className = "actions";
    actions.append(mode, close);
    header.append(tag, actions);
    panel.append(header);

    if (!compact) {
      const preview = document.createElement("div");
      preview.className = "preview";
      preview.textContent = sampleText(el);
      Object.assign(preview.style, {
        fontFamily: info.fontFamily,
        fontWeight: info.fontWeight,
        fontStyle: info.fontStyle,
        letterSpacing: info.letterSpacing,
      });
      panel.append(preview);
    }

    const dl = document.createElement("dl");
    dl.append(...(compact ? compactRows(info) : fullRows(info)));
    panel.append(dl);

    if (!compact) {
      const footer = document.createElement("footer");
      footer.textContent = t("footerHint");
      panel.append(footer);
    }

    shadow.appendChild(panel);

    // Positionnement : près du clic, ou au même endroit lors d'un changement de mode.
    const margin = 12;
    const { width, height } = panel.getBoundingClientRect();
    let left;
    let top;
    if (keepPosition && prevRect) {
      left = Math.min(prevRect.left, innerWidth - width - margin);
      top = Math.min(prevRect.top, innerHeight - height - margin);
    } else {
      left = x + margin;
      top = y + margin;
      if (left + width > innerWidth - margin) left = x - width - margin;
      if (top + height > innerHeight - margin) top = y - height - margin;
    }
    left = Math.max(margin, left);
    top = Math.max(margin, top);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    current = { el };
  }

  // Réaffiche le panneau ouvert (changement de mode), sans le déplacer.
  function rerenderPanel() {
    if (!active || !current || !current.el.isConnected) return;
    showPanel(current.el, 0, 0, true);
  }

  // ---------- Événements ----------

  const isOwnUI = (target) => target === host || target === highlight;

  function onMouseMove(e) {
    const el = e.target;
    if (isOwnUI(el) || el === hovered || !(el instanceof Element)) return;
    hovered = el;
    moveHighlight(el);
  }

  function onClick(e) {
    if (isOwnUI(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (e.target instanceof Element) showPanel(e.target, e.clientX, e.clientY);
  }

  // Empêche les liens / boutons de réagir pendant l'inspection.
  function swallow(e) {
    if (isOwnUI(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      setActive(false);
    }
  }

  function onScroll() {
    if (hovered) moveHighlight(hovered);
  }

  const listeners = [
    ["mousemove", onMouseMove],
    ["click", onClick],
    ["mousedown", swallow],
    ["mouseup", swallow],
    ["auxclick", swallow],
    ["keydown", onKeyDown],
    ["scroll", onScroll],
  ];

  function setActive(value) {
    if (value === active) return;
    active = value;

    if (active) {
      ensureHighlight();
      for (const [type, fn] of listeners) window.addEventListener(type, fn, true);
      document.documentElement.style.cursor = "crosshair";
    } else {
      for (const [type, fn] of listeners) window.removeEventListener(type, fn, true);
      document.documentElement.style.cursor = "";
      highlight?.remove();
      host?.remove();
      highlight = host = shadow = hovered = current = null;
    }

    browser.runtime.sendMessage({ type: "font-inspect:state", active }).catch(() => {});
  }

  window.__fontInspect = { toggle: () => setActive(!active) };
  setActive(true);
})();
