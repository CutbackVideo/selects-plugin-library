// Loader hook: `node --import ./plugins/the-end-credits/dev/readback-hook.mjs <kit>/tools/drive/build-driver.mjs ...`
// makes the kit driver's `import ... from './readback.mjs'` load dev/readback-tec.mjs instead (which re-uses the kit
// readback and adds the Classic lead-in gap, effect order, photo-aware levels and cover transforms). The kit is not
// edited; every other import resolves normally.
import { register } from 'node:module';
import { isMainThread } from 'node:worker_threads';

if (isMainThread) register(import.meta.url);

const TEC = new URL('./readback-tec.mjs', import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier === './readback.mjs' && context.parentURL && /\/tools\/drive\/build-driver\.mjs$/.test(context.parentURL)) {
    return { url: TEC + '?kit=' + encodeURIComponent(new URL('./readback.mjs', context.parentURL).href), shortCircuit: true };
  }
  return next(specifier, context);
}
