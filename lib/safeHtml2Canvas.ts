import html2canvas, { Options } from 'html2canvas';

/**
 * Convert any CSS color containing oklch(...) or oklab(...) into standard rgb/rgba or hex
 * Modern browsers automatically convert any CSS color to sRGB via canvas 2D context fillStyle.
 */
export function convertOklchColor(colorStr: string): string {
  if (!colorStr || typeof colorStr !== 'string') return colorStr;
  if (!colorStr.includes('oklch') && !colorStr.includes('oklab')) return colorStr;

  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = colorStr;
        const resolved = ctx.fillStyle;
        if (resolved && !resolved.includes('oklch') && !resolved.includes('oklab')) {
          return resolved;
        }
      }
    } catch {
      // Ignore and fallback to regex replacement
    }
  }

  // Fallback safe slate colors if canvas context fails
  return colorStr
    .replace(/oklch\([^)]+\)/gi, '#334155')
    .replace(/oklab\([^)]+\)/gi, '#334155');
}

/**
 * Creates a safe proxy around CSSStyleDeclaration to intercept and translate
 * any oklch/oklab color values before html2canvas parses them.
 */
function wrapStyleWithOklchSanitizer(style: CSSStyleDeclaration): CSSStyleDeclaration {
  return new Proxy(style, {
    get(target, prop: string) {
      const val = (target as any)[prop];
      if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
        return convertOklchColor(val);
      }
      if (typeof val === 'function' && prop === 'getPropertyValue') {
        return function (propName: string) {
          const propVal = target.getPropertyValue(propName);
          if (typeof propVal === 'string' && (propVal.includes('oklch') || propVal.includes('oklab'))) {
            return convertOklchColor(propVal);
          }
          return propVal;
        };
      }
      return val;
    },
  });
}

/**
 * Safe html2canvas wrapper that prevents "unsupported color function oklch" errors
 * caused by Tailwind CSS v4 color tokens.
 */
export async function safeHtml2Canvas(
  element: HTMLElement,
  options: Partial<Options> = {}
): Promise<HTMLCanvasElement> {
  const originalGetComputedStyle = window.getComputedStyle.bind(window);

  // Temporary patch on main window to catch direct window.getComputedStyle calls
  window.getComputedStyle = function (el: Element, pseudo?: string | null) {
    const style = originalGetComputedStyle(el, pseudo);
    return wrapStyleWithOklchSanitizer(style);
  };

  const userOnClone = options.onclone;

  try {
    return await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      ...options,
      onclone: (clonedDoc, clonedElement) => {
        // 1. Hook getComputedStyle on the cloned iframe window
        const clonedWin = clonedDoc.defaultView || window;
        if (clonedWin && clonedWin.getComputedStyle) {
          const origClonedGCS = clonedWin.getComputedStyle.bind(clonedWin);
          clonedWin.getComputedStyle = function (el: Element, pseudo?: string | null) {
            const style = origClonedGCS(el, pseudo);
            return wrapStyleWithOklchSanitizer(style);
          };
        }

        // 2. Scan and sanitize all elements in the cloned DOM tree
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((node) => {
          if (node instanceof HTMLElement || node instanceof SVGElement) {
            // Clean inline style attribute
            const inlineStyle = node.getAttribute('style');
            if (inlineStyle && (inlineStyle.includes('oklch') || inlineStyle.includes('oklab'))) {
              node.setAttribute(
                'style',
                inlineStyle.replace(/okl(ch|ab)\([^)]+\)/gi, (m) => convertOklchColor(m))
              );
            }
          }
        });

        // 3. Inject fallback style overrides for common Tailwind variables
        const styleTag = clonedDoc.createElement('style');
        styleTag.textContent = `
          *, *::before, *::after {
            --tw-border-color: #cbd5e1 !important;
            --tw-ring-color: #3b82f6 !important;
            --tw-shadow-color: rgba(0, 0, 0, 0.1) !important;
          }
        `;
        clonedDoc.head.appendChild(styleTag);

        if (userOnClone) {
          userOnClone(clonedDoc, clonedElement);
        }
      },
    });
  } finally {
    // Restore original window.getComputedStyle
    window.getComputedStyle = originalGetComputedStyle;
  }
}
