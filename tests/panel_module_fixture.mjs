// Execute the complete portable panel, including its real local dependencies.
// Only declared host/expensive-operation boundaries may be replaced by a test.
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import {createPanelBrowserTimers} from './panel_browser_realm.mjs';

const browserRealms = new WeakMap();
export function disposePanelModule(bindings) { browserRealms.get(bindings)?.dispose(); }
export function panelModuleTimerState(bindings) { return browserRealms.get(bindings)?.state(); }

const require = createRequire(import.meta.url);
let compiler;
function typescript() {
  if (compiler) return compiler;
  const candidates = [
    process.env.SELECTS_TSC && path.resolve(process.env.SELECTS_TSC, '../../lib/typescript.js'),
    process.env.SBS_PANEL_TEST_MODULES && path.join(process.env.SBS_PANEL_TEST_MODULES, 'typescript'),
    process.env.SELECTS_DEV_REPO && path.join(process.env.SELECTS_DEV_REPO, 'node_modules/typescript'),
    'typescript',
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { compiler = require(candidate); return compiler; }
    catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
  }
  throw Error('Panel module fixtures require TypeScript. Set SELECTS_TSC to the CI-installed typescript/bin/tsc.');
}

export function loadPanelModule(source, {names, overrides = {}, React = {}, modules = {}, globals = {}, filename = 'panel.tsx'} = {}) {
  const ts = typescript(), pending = new Set(Object.keys(overrides));
  for (const name of [...names, ...pending]) {
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) throw Error('Invalid panel fixture binding: ' + name);
  }
  const replacement = name => ts.factory.createElementAccessExpression(
    ts.factory.createIdentifier('__panelOverrides'), ts.factory.createStringLiteral(name));
  const compiled = ts.transpileModule(source, {
    fileName: filename, reportDiagnostics: true,
    compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React, esModuleInterop: true},
    transformers: {before: [() => file => {
      // Replace only top-level declarations. Nested bindings of the same name
      // retain their actual implementation and scope.
      const statements = file.statements.map(statement => {
        if (ts.isFunctionDeclaration(statement) && statement.name && pending.has(statement.name.text)) {
          const name = statement.name.text; pending.delete(name);
          // Keep function hoisting, async behavior, parameters and exports intact.
          return ts.factory.updateFunctionDeclaration(statement, statement.modifiers, statement.asteriskToken,
            statement.name, statement.typeParameters, statement.parameters, statement.type,
            ts.factory.createBlock([ts.factory.createReturnStatement(ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(replacement(name), 'apply'), undefined,
              [ts.factory.createThis(), ts.factory.createIdentifier('arguments')]))], true));
        }
        if (ts.isVariableStatement(statement)) {
          return ts.factory.updateVariableStatement(statement, statement.modifiers,
            ts.factory.updateVariableDeclarationList(statement.declarationList, statement.declarationList.declarations.map(declaration => {
              if (!ts.isIdentifier(declaration.name) || !pending.has(declaration.name.text)) return declaration;
              const name = declaration.name.text; pending.delete(name);
              return ts.factory.updateVariableDeclaration(declaration, declaration.name, declaration.exclamationToken, declaration.type, replacement(name));
            })));
        }
        return statement;
      });
      return ts.factory.updateSourceFile(file, statements);
    }]},
  });
  if (pending.size) throw Error('Panel fixture override has no top-level declaration: ' + [...pending].join(', '));
  const errors = (compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw Error(errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
  const module = {exports: {}};
  // Explicit fake schedulers use the same ownership/cleanup contract as real ones.
  const timerBackends = Object.fromEntries(['setTimeout','clearTimeout','setInterval','clearInterval']
    .filter(name => Object.hasOwn(globals, name)).map(name => [name, globals[name]]));
  const timers = createPanelBrowserTimers(timerBackends);
  const context = vm.createContext({
    console, crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, AbortController, DOMException,
    atob, btoa, performance, ...globals, ...timers.globals,
    module, exports: module.exports, __panelOverrides: overrides,
    require: id => {
      if (id === 'react') return {__esModule: true, default: React, ...React};
      if (Object.hasOwn(modules, id)) return modules[id];
      throw Error('Panel fixture has no module boundary for: ' + id);
    },
  });
  timers.bindGlobal(vm.runInContext('globalThis', context));
  try {
    vm.runInContext(compiled.outputText + '\nthis.__panelBindings={' + names.join(',') + '};', context, {filename, timeout: 5000});
    browserRealms.set(context.__panelBindings, timers);
    return context.__panelBindings;
  } catch (error) { timers.dispose(); throw error; }
}
