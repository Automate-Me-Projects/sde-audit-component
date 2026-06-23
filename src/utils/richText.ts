/**
 * Sanitisation du HTML enrichi côté UI.
 *
 * On ne conserve qu'une liste blanche stricte de balises et de propriétés de
 * style (gras, italique, souligné, couleur, surlignage). Tout le reste est
 * supprimé : protège la vue éditeur (dangerouslySetInnerHTML) contre toute
 * injection, et garantit un HTML que le moteur PDF sait interpréter.
 */

const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'MARK', 'SPAN']);
const ALLOWED_STYLE_PROPS = new Set(['color', 'background-color', 'text-decoration']);

const HTML_TAG_RE = /<(p|br|strong|b|em|i|u|s|mark|span|div|ul|ol|li)[\s/>]/i;

export const isRichHtml = (value: string): boolean => HTML_TAG_RE.test(value || '');

const sanitizeStyle = (style: string): string =>
  style
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .filter((decl) => {
      const prop = decl.split(':')[0]?.trim().toLowerCase();
      const value = decl.slice(decl.indexOf(':') + 1).toLowerCase();
      if (!prop || !ALLOWED_STYLE_PROPS.has(prop)) return false;
      // Bloque les valeurs dangereuses (url(), expression(), etc.).
      return !/url\(|expression|javascript:/i.test(value);
    })
    .join('; ');

const cleanElement = (el: Element): void => {
  // Profondeur d'abord : on nettoie/déballe les enfants avant le parent.
  Array.from(el.children).forEach(cleanElement);

  if (!ALLOWED_TAGS.has(el.tagName.toUpperCase())) {
    // Balise interdite : on la remplace par son contenu.
    const parent = el.parentNode;
    if (parent) {
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    }
    return;
  }

  // Nettoie les attributs.
  Array.from(el.attributes).forEach((attr) => {
    const name = attr.name.toLowerCase();
    if (name === 'style') {
      const cleaned = sanitizeStyle(attr.value);
      if (cleaned) el.setAttribute('style', cleaned);
      else el.removeAttribute('style');
    } else if (name === 'data-color' && el.tagName.toUpperCase() === 'MARK') {
      // conservé (Tiptap Highlight)
    } else {
      el.removeAttribute(attr.name);
    }
  });
};

export const sanitizeRichHtml = (html: string): string => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  Array.from(doc.body.children).forEach(cleanElement);
  return doc.body.innerHTML;
};
