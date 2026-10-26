'use strict';
const fs = require('node:fs');
const path = require('node:path');
exports.available = () => ['chosun-ilbo', 'hankook-ilbo', 'huick', 'sbs-radio'].every(id => fs.existsSync(path.join(__dirname, '../template-packs', id, 'pack.json'))) && ['chosun-legacy-template-summary.json', 'chosun-premiere-corrections.json', 'legacy-template-packs.json'].every(name => fs.existsSync(path.join(__dirname, 'fixtures', name)));
