import { jsPDF } from 'jspdf';

/**
 * Moteur de rendu de texte enrichi pour jsPDF.
 *
 * jsPDF n'a aucune API native de texte multi-styles inline : `doc.text()`
 * n'applique qu'un seul style à la fois. On parse donc le HTML produit par
 * l'éditeur (Tiptap) en « runs » stylés, puis on fait nous-mêmes le word-wrap
 * et le placement mot à mot, ce qui permet de conserver la justification.
 *
 * Styles gérés : gras, italique, souligné, couleur de police, surlignage.
 * Rétrocompatible : un texte brut (sans balise) est rendu tel quel, les
 * retours à la ligne `\n` étant respectés.
 */

export type RGB = [number, number, number];

interface Style {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color?: RGB;
  highlight?: RGB;
}

interface Run {
  text: string; // '\n' = saut de ligne forcé
  style: Style;
}

interface Segment {
  text: string;
  style: Style;
  width: number;
}

interface Word {
  segments: Segment[];
  width: number;
}

interface Line {
  words: Word[];
  wordsWidth: number;
  justify: boolean; // ligne coupée par débordement => justifiable
}

export interface RichTextRenderOptions {
  fontSize?: number;
  lineHeight?: number;
  justify?: boolean;
  defaultColor?: RGB;
}

const BASE: Style = { bold: false, italic: false, underline: false };

const PT_TO_MM = 0.352778;

// ---------------------------------------------------------------------------
// Détection HTML / parsing
// ---------------------------------------------------------------------------

const HTML_TAG_RE = /<(p|br|strong|b|em|i|u|s|mark|span|div|ul|ol|li)[\s/>]/i;

export const isRichHtml = (value: string): boolean => HTML_TAG_RE.test(value);

const parseColor = (raw?: string | null): RGB | undefined => {
  if (!raw) return undefined;
  const value = raw.trim();

  const rgbMatch = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  }

  let hex = value.startsWith('#') ? value.slice(1) : '';
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (hex.length === 6 && /^[0-9a-f]{6}$/i.test(hex)) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  return undefined;
};

const getStyleProp = (el: Element, prop: string): string | undefined => {
  const style = el.getAttribute('style');
  if (!style) return undefined;
  const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i');
  const m = style.match(re);
  return m ? m[1].trim() : undefined;
};

const collapseWhitespace = (text: string): string => text.replace(/\s+/g, ' ');

const BLOCK_TAGS = new Set(['P', 'DIV', 'LI', 'UL', 'OL']);

/** Parcourt le DOM et produit une liste plate de runs stylés. */
const walk = (node: Node, style: Style, runs: Run[]): void => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = collapseWhitespace(node.textContent || '');
    if (text) runs.push({ text, style });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as Element;
  const tag = el.tagName.toUpperCase();

  if (tag === 'BR') {
    runs.push({ text: '\n', style });
    return;
  }

  const next: Style = { ...style };
  if (tag === 'STRONG' || tag === 'B') next.bold = true;
  if (tag === 'EM' || tag === 'I') next.italic = true;
  if (tag === 'U') next.underline = true;
  if (getStyleProp(el, 'text-decoration')?.includes('underline')) next.underline = true;

  if (tag === 'MARK') {
    next.highlight =
      parseColor(getStyleProp(el, 'background-color')) ??
      parseColor(el.getAttribute('data-color')) ??
      [253, 230, 138]; // jaune par défaut
  }
  const bg = parseColor(getStyleProp(el, 'background-color'));
  if (bg && tag !== 'MARK') next.highlight = bg;

  const color = parseColor(getStyleProp(el, 'color'));
  if (color) next.color = color;

  const isBlock = BLOCK_TAGS.has(tag);
  if (isBlock && runs.length > 0 && runs[runs.length - 1].text !== '\n') {
    runs.push({ text: '\n', style });
  }

  el.childNodes.forEach((child) => walk(child, next, runs));

  if (isBlock && runs.length > 0 && runs[runs.length - 1].text !== '\n') {
    runs.push({ text: '\n', style });
  }
};

/** Convertit une valeur stockée (HTML enrichi OU texte brut) en runs. */
export const parseRichText = (value: string | null | undefined): Run[] => {
  const raw = value ?? '';
  if (!raw.trim()) return [];

  if (!isRichHtml(raw)) {
    // Texte brut hérité : on respecte les retours à la ligne.
    const runs: Run[] = [];
    raw.split('\n').forEach((part, index) => {
      if (index > 0) runs.push({ text: '\n', style: BASE });
      if (part) runs.push({ text: part, style: BASE });
    });
    return runs;
  }

  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const runs: Run[] = [];
  doc.body.childNodes.forEach((child) => walk(child, BASE, runs));

  // Nettoie un éventuel saut de ligne terminal superflu.
  while (runs.length && runs[runs.length - 1].text === '\n') runs.pop();
  return runs;
};

// ---------------------------------------------------------------------------
// Mise en page (word-wrap sur runs)
// ---------------------------------------------------------------------------

const fontStyle = (s: Style): string => {
  if (s.bold && s.italic) return 'bolditalic';
  if (s.bold) return 'bold';
  if (s.italic) return 'italic';
  return 'normal';
};

const measureSegment = (doc: jsPDF, text: string, style: Style): number => {
  doc.setFont('helvetica', fontStyle(style));
  return doc.getTextWidth(text);
};

/** Découpe les runs en lignes word-wrappées tenant dans maxWidth. */
const layout = (
  doc: jsPDF,
  runs: Run[],
  maxWidth: number,
  fontSize: number
): Line[] => {
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'normal');
  const spaceWidth = doc.getTextWidth(' ');

  // 1. Tokenisation en mots (un mot peut chevaucher plusieurs styles).
  type Token = { type: 'word'; word: Word } | { type: 'break' };
  const tokens: Token[] = [];
  let current: Word | null = null;

  const flushWord = () => {
    if (current && current.segments.length) tokens.push({ type: 'word', word: current });
    current = null;
  };

  runs.forEach((run) => {
    if (run.text === '\n') {
      flushWord();
      tokens.push({ type: 'break' });
      return;
    }
    const parts = run.text.split(/(\s+)/);
    parts.forEach((part) => {
      if (part === '') return;
      if (/^\s+$/.test(part)) {
        flushWord();
        return;
      }
      const width = measureSegment(doc, part, run.style);
      if (!current) current = { segments: [], width: 0 };
      current.segments.push({ text: part, style: run.style, width });
      current.width += width;
    });
  });
  flushWord();

  // 2. Répartition en lignes.
  const lines: Line[] = [];
  let line: Line = { words: [], wordsWidth: 0, justify: false };

  const pushLine = (justify: boolean) => {
    line.justify = justify;
    lines.push(line);
    line = { words: [], wordsWidth: 0, justify: false };
  };

  tokens.forEach((token) => {
    if (token.type === 'break') {
      pushLine(false);
      return;
    }
    const { word } = token;
    const needed = line.words.length > 0 ? spaceWidth + word.width : word.width;
    if (line.words.length > 0 && line.wordsWidth + needed > maxWidth) {
      pushLine(true); // coupée par débordement => justifiable
      line.words.push(word);
      line.wordsWidth = word.width;
    } else {
      line.words.push(word);
      line.wordsWidth += needed;
    }
  });
  if (line.words.length) pushLine(false); // dernière ligne : non justifiée

  return lines;
};

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

/** Hauteur (mm) requise pour rendre la valeur dans maxWidth. */
export const measureRichTextHeight = (
  doc: jsPDF,
  value: string | null | undefined,
  maxWidth: number,
  fontSize: number,
  lineHeight: number
): number => {
  const runs = parseRichText(value);
  if (!runs.length) return 0;
  return layout(doc, runs, maxWidth, fontSize).length * lineHeight;
};

/** Dessine une ligne déjà mise en page à la ligne de base baselineY. */
const renderLineAt = (
  doc: jsPDF,
  line: Line,
  x: number,
  baselineY: number,
  maxWidth: number,
  fontSize: number,
  justifyEnabled: boolean,
  defaultColor: RGB,
  spaceWidth: number,
  ascent: number
): void => {
  let gap = spaceWidth;
  const gaps = line.words.length - 1;
  if (justifyEnabled && line.justify && gaps > 0) {
    const computed = (maxWidth - line.wordsWidth) / gaps;
    if (computed > spaceWidth) gap = computed;
  }

  let cursorX = x;
  line.words.forEach((word, wordIndex) => {
    word.segments.forEach((seg) => {
      const color = seg.style.color ?? defaultColor;

      if (seg.style.highlight) {
        const [hr, hg, hb] = seg.style.highlight;
        doc.setFillColor(hr, hg, hb);
        doc.rect(cursorX, baselineY - ascent, seg.width, fontSize * PT_TO_MM * 1.05, 'F');
      }

      doc.setFont('helvetica', fontStyle(seg.style));
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(seg.text, cursorX, baselineY);

      if (seg.style.underline) {
        const uy = baselineY + fontSize * PT_TO_MM * 0.12;
        doc.setDrawColor(color[0], color[1], color[2]);
        doc.setLineWidth(0.2);
        doc.line(cursorX, uy, cursorX + seg.width, uy);
      }

      cursorX += seg.width;
    });
    if (wordIndex < gaps) cursorX += gap;
  });
};

/**
 * Rend la valeur enrichie à partir de (x, y) (y = haut du bloc).
 * Retourne la hauteur totale dessinée (mm).
 */
export const renderRichText = (
  doc: jsPDF,
  value: string | null | undefined,
  x: number,
  y: number,
  maxWidth: number,
  options: RichTextRenderOptions = {}
): number => {
  const fontSize = options.fontSize ?? 9;
  const lineHeight = options.lineHeight ?? 4;
  const justifyEnabled = options.justify ?? false;
  const defaultColor = options.defaultColor ?? [0, 0, 0];

  const runs = parseRichText(value);
  if (!runs.length) return 0;

  const lines = layout(doc, runs, maxWidth, fontSize);
  doc.setFontSize(fontSize);

  const ascent = fontSize * PT_TO_MM * 0.76;
  doc.setFont('helvetica', 'normal');
  const spaceWidth = doc.getTextWidth(' ');

  lines.forEach((lineItem, lineIndex) => {
    const baselineY = y + lineHeight * 0.8 + lineIndex * lineHeight;
    renderLineAt(doc, lineItem, x, baselineY, maxWidth, fontSize, justifyEnabled, defaultColor, spaceWidth, ascent);
  });

  // Restaure un état neutre pour la suite du rendu.
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  return lines.length * lineHeight;
};

export interface PaginatedRichTextOptions extends RichTextRenderOptions {
  /** y maximale (bas de zone) au-delà de laquelle on saute de page. */
  pageBottom: number;
  /** Ajoute une page et retourne la nouvelle y de départ (haut du contenu). */
  onNewPage: () => number;
}

/**
 * Rend la valeur enrichie avec saut de page automatique au niveau des lignes
 * (jamais au milieu d'une balise, contrairement à un découpage par caractères).
 * Retourne la y finale (bas du dernier texte rendu).
 */
export const renderRichTextPaginated = (
  doc: jsPDF,
  value: string | null | undefined,
  x: number,
  y: number,
  maxWidth: number,
  options: PaginatedRichTextOptions
): number => {
  const fontSize = options.fontSize ?? 9;
  const lineHeight = options.lineHeight ?? 5;
  const justifyEnabled = options.justify ?? false;
  const defaultColor = options.defaultColor ?? [0, 0, 0];

  const runs = parseRichText(value);
  if (!runs.length) return y;

  const lines = layout(doc, runs, maxWidth, fontSize);
  doc.setFontSize(fontSize);

  const ascent = fontSize * PT_TO_MM * 0.76;
  doc.setFont('helvetica', 'normal');
  const spaceWidth = doc.getTextWidth(' ');

  let topY = y;
  lines.forEach((lineItem) => {
    if (topY + lineHeight > options.pageBottom) {
      topY = options.onNewPage();
      doc.setFontSize(fontSize);
    }
    const baselineY = topY + lineHeight * 0.8;
    renderLineAt(doc, lineItem, x, baselineY, maxWidth, fontSize, justifyEnabled, defaultColor, spaceWidth, ascent);
    topY += lineHeight;
  });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  return topY;
};
