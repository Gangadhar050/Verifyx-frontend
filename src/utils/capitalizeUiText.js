const DISPLAY_ATTRIBUTES = ['placeholder', 'title', 'aria-label'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA']);

export function capitalizeFirstLetter(value) {
  if (value === null || value === undefined) return value;
  const text = String(value);
  const match = text.match(/[A-Za-z]/);
  if (!match) return text;

  const index = match.index ?? 0;
  const char = text.charAt(index);
  if (char !== char.toLowerCase() || char === char.toUpperCase()) return text;

  return `${text.slice(0, index)}${char.toUpperCase()}${text.slice(index + 1)}`;
}

function shouldSkip(node) {
  const parent = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  if (!parent) return true;
  return SKIP_TAGS.has(parent.tagName) || Boolean(parent.closest('script, style, noscript, code, pre, textarea'));
}

function capitalizeTextNode(node) {
  if (!node || node.nodeType !== Node.TEXT_NODE || shouldSkip(node)) return;
  const next = capitalizeFirstLetter(node.nodeValue);
  if (next !== node.nodeValue) node.nodeValue = next;
}

function capitalizeElementAttributes(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE || shouldSkip(element)) return;

  DISPLAY_ATTRIBUTES.forEach((attribute) => {
    if (!element.hasAttribute(attribute)) return;
    const current = element.getAttribute(attribute);
    const next = capitalizeFirstLetter(current);
    if (next !== current) element.setAttribute(attribute, next);
  });
}

function capitalizeTree(root) {
  if (!root) return;

  if (root.nodeType === Node.TEXT_NODE) {
    capitalizeTextNode(root);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE) return;
  capitalizeElementAttributes(root);

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  );

  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) capitalizeTextNode(node);
    else capitalizeElementAttributes(node);
    node = walker.nextNode();
  }
}

function wrapBrowserDialog(name) {
  const original = window[name];
  if (typeof original !== 'function') return;
  window[name] = function capitalizedDialog(message, ...args) {
    return original.call(window, capitalizeFirstLetter(message), ...args);
  };
}

export function enableUiFirstLetterCapitalization(rootElement = document.getElementById('root')) {
  if (!rootElement) return () => {};

  capitalizeTree(rootElement);
  wrapBrowserDialog('alert');
  wrapBrowserDialog('confirm');
  wrapBrowserDialog('prompt');

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData') {
        capitalizeTextNode(mutation.target);
        return;
      }

      if (mutation.type === 'attributes') {
        capitalizeElementAttributes(mutation.target);
        return;
      }

      mutation.addedNodes.forEach((node) => capitalizeTree(node));
    });
  });

  observer.observe(rootElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: DISPLAY_ATTRIBUTES,
  });

  return () => observer.disconnect();
}
