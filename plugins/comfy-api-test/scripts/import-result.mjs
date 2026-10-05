export function importScript(projectId, paths) {
  return `
const project = selects.project(${JSON.stringify(projectId)});
const paths = ${JSON.stringify(paths)};
async function inventory() {
  const overview = await project.sourceFiles();
  const trees = [];
  if ('fileTree' in overview) trees.push(overview.fileTree);
  else for (const folder of overview.folders) {
    const detail = await project.sourceFiles({ folder: folder.name });
    if (!('fileTree' in detail)) throw new Error('Source inventory unavailable');
    trees.push(detail.fileTree);
  }
  const found = new Map();
  function walk(nodes) {
    for (const node of nodes) {
      if (node.type === 'dir') walk(node.children);
      else if (node.path) found.set(node.path, node.resourceId);
    }
  }
  for (const tree of trees) walk(tree);
  return found;
}
const before = await inventory();
const missing = paths.filter(path => !before.has(path));
if (missing.length) await project.importFiles({ paths: missing });
const after = await inventory();
if (paths.some(path => !after.has(path))) throw new Error('Some outputs could not be saved; retry saving');
return { resourceIds: paths.map(path => after.get(path)), added: missing.length, existing: paths.length - missing.length };
`;
}
