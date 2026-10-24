// Replace generated factories in both source functions and serialized run_script
// bodies. Parse each string layer; JSON and template literals escape differently.
export function syncShaderFactories(code, expression, ts, kind = ts.ScriptKind.TSX, depth = 0) {
  const sf = ts.createSourceFile('plugin.tsx', code, ts.ScriptTarget.Latest, true, kind);
  const patches = [];
  const edit = (node, text) => patches.push([node.getStart(sf), node.getEnd(), text]);
  const escapeTemplate = text => text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(sf) === 'pluginShaderOptions' &&
        node.initializer && ts.isCallExpression(node.initializer) && node.initializer.getText(sf).includes('return options;')) {
      edit(node.initializer, expression); return;
    }
    if (ts.isTaggedTemplateExpression(node) && node.tag.getText(sf) === 'String.raw') {
      literal(node.template, true, node); return;
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
      literal(node, false, node); return;
    }
    ts.forEachChild(node, visit);
  }
  function literal(node, raw, target) {
    const holes = [];
    let text;
    if (ts.isTemplateExpression(node)) {
      text = (raw ? node.head.rawText : node.head.text) || '';
      for (const span of node.templateSpans) {
        const key = `__SHADER_HOLE_${depth}_${holes.length}__`;
        holes.push({key, expression: span.expression.getText(sf)});
        text += key + (raw ? span.literal.rawText : span.literal.text);
      }
    } else text = raw ? node.rawText : node.text;
    if (!text?.includes('const pluginShaderOptions=') && !text?.includes('const pluginShaderOptions =')) return;
    const next = syncShaderFactories(text, expression, ts, ts.ScriptKind.TS, depth + 1);
    if (next === text) return;
    if (holes.length) {
      let result = escapeTemplate(next);
      for (const hole of holes) result = result.replaceAll(hole.key, '${' + hole.expression + '}');
      edit(target, '`' + result + '`');
    } else edit(target, JSON.stringify(next));
  }
  visit(sf);
  for (const [start, end, text] of patches.sort((a,b) => b[0] - a[0])) code = code.slice(0,start) + text + code.slice(end);
  return code;
}
