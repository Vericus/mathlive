import { Atom } from './core/atom-class';

import { defaultGlobalContext } from './core/core';
import { parseLatex } from './core/parser';
import { Context } from './core/context';
import { adjustInterAtomSpacing, coalesce, makeStruts, Box } from './core/box';
import { DEFAULT_FONT_SIZE } from './core/font-metrics';

/**
 * Convert a LaTeX string to a string of HTML markup.
 *
 * **(Note)**
 *
 * This function does not interact with the DOM. The function does not load
 * fonts or inject stylesheets in the document. It can be used
 * on the server side.
 *
 * To get the output of this function to correctly display
 * in a document, use the mathlive static style sheet by adding the following
 * to the `<head>` of the document:
 *
 * ```html
 * <link rel="stylesheet" href="https://unpkg.com/mathlive/dist/mathlive-static.css" />
 * ```
 *
 * ---
 *
 * @param text A string of valid LaTeX. It does not have to start
 * with a mode token such as `$$` or `\(`.
 *
 * @param options.mathstyle If `"displaystyle"` the "display" mode of TeX
 * is used to typeset the formula, which is most appropriate for formulas that are
 * displayed in a standalone block.
 *
 * If `"textstyle"` is used, the "text" mode
 * of TeX is used, which is most appropriate when displaying math "inline"
 * with other text (on the same line).
 *
 * @param  options.macros A dictionary of LaTeX macros
 *
 *
 * @category Converting
 * @keywords convert, latex, markup
 */
export function convertLatexToMarkup(
  text: string,
  options?: {
    mathstyle?: 'displaystyle' | 'textstyle';
    format?: string;
  }
): string {
  options = options ?? {};
  options.mathstyle = options.mathstyle ?? 'displaystyle';

  const context = defaultGlobalContext();

  //
  // 1. Parse the formula and return a tree of atoms, e.g. 'genfrac'.
  //
  const root = new Atom('root', context);
  root.body = parseLatex(text, context, {
    parseMode: 'math',
    mathstyle: options.mathstyle,
  });

  //
  // 2. Transform the math atoms into elementary boxes
  // for example from genfrac to VBox.
  //
  const box = root.render(
    new Context(
      {
        registers: context.registers,
        renderPlaceholder: () => new Box(0xa0, { maxFontSize: 1.0 }),
      },
      {
        fontSize: DEFAULT_FONT_SIZE,
        letterShapeStyle: context.letterShapeStyle,
      },
      options.mathstyle
    )
  );

  if (!box) return '';

  //
  // 3. Adjust to `mord` according to TeX spacing rules
  //
  adjustInterAtomSpacing(box);

  //
  // 2. Simplify by coalescing adjacent boxes
  //    for example, from <span>1</span><span>2</span>
  //    to <span>12</span>
  //
  coalesce(box);

  //
  // 4. Wrap the expression with struts
  //
  const wrapper = makeStruts(box, { classes: 'ML__mathlive' });

  //
  // 5. Generate markup
  //

  return wrapper.toMarkup();
}
