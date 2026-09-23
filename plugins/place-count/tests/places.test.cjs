const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'places.js'), 'utf8');
const box = {Math, Number, Object, Array, String, Set, Map, Infinity};
vm.createContext(box);
vm.runInContext(source + ';globalThis.infer=inferPlaces;', box);
// Round-trip through JSON: the vm realm's arrays fail deepEqual's prototype check.
const infer = (...files) => JSON.parse(JSON.stringify(box.infer(files)));

// The panel runs its own copy; a copy that drifts from the tested one is untested.
assert(fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8').includes(source.trim()), 'panel.tsx must embed places.js verbatim');

// Two venues one street apart in downtown LA: 107 m, closer than GPS error.
const DISNEY_HALL = {latitude: 34.0553, longitude: -118.2498};
const THE_BROAD = {latitude: 34.0546, longitude: -118.2506};
const SANTA_MONICA = {latitude: 34.0089, longitude: -118.4973};
const clip = (id, at, location = null, duration = 30) => ({path: '/card/' + id + '.MP4', start: at == null ? null : Date.parse(at), duration, location});
const at = minute => '2026-03-15T21:' + String(minute).padStart(2, '0') + ':00Z';

// A pause between two venues a street apart separates them where GPS cannot.
let r = infer(clip('A1', at(30), DISNEY_HALL), clip('A2', at(33), DISNEY_HALL), clip('A3', at(36), DISNEY_HALL),
  clip('B1', at(54), THE_BROAD), clip('B2', at(57), THE_BROAD), clip('B3', '2026-03-15T22:00:00Z', THE_BROAD));
assert.deepEqual(r.places.map(p => p.paths), [['/card/A1.MP4', '/card/A2.MP4', '/card/A3.MP4'], ['/card/B1.MP4', '/card/B2.MP4', '/card/B3.MP4']]);
assert(r.places.every(p => p.confidence === 'high'));

// A lone GPS fix anchors its session rather than splitting it.
r = infer(clip('C1', at(30)), clip('C2', at(33), DISNEY_HALL), clip('C3', at(36)), clip('C4', at(39)), clip('C5', at(42)));
assert.equal(r.places.length, 1);
assert.equal(r.places[0].paths.length, 5);
assert.equal(r.places[0].confidence, 'medium');
assert.deepEqual(r.places[0].reasons, ['gps-cluster', 'capture-session']);
assert.deepEqual(r.unassigned, []);

// GPS scatter inside one session stays one place.
r = infer(clip('D1', at(30), DISNEY_HALL), clip('D2', at(33), {latitude: 34.0562, longitude: -118.2491}), clip('D3', at(36), {latitude: 34.0547, longitude: -118.2505}));
assert.equal(r.places.length, 1);
assert.equal(r.places[0].confidence, 'high');

// No GPS anywhere still yields places, marked low and with no center.
r = infer(clip('E1', '2026-03-15T17:00:00Z'), clip('E2', '2026-03-15T17:03:00Z'), clip('E3', '2026-03-15T20:00:00Z'));
assert.deepEqual(r.places.map(p => p.confidence), ['low', 'low']);
assert.deepEqual(r.places.map(p => p.center), [null, null]);

// A clip midway between two places is left out instead of guessed.
r = infer(clip('F1', at(30), DISNEY_HALL), clip('F2', at(32)), clip('F3', at(34), SANTA_MONICA));
assert.equal(r.places.length, 2);
assert.deepEqual(r.unassigned, ['/card/F2.MP4']);

// A clip with neither capture time nor GPS is unassigned.
r = infer(clip('G1', at(30), DISNEY_HALL), clip('G2', at(33), DISNEY_HALL), clip('P1', null), clip('P2', null));
assert.equal(r.places.length, 1);
assert.deepEqual(r.unassigned, ['/card/P1.MP4', '/card/P2.MP4']);

// GPS without capture time lands in the one place that contains it.
r = infer(clip('H1', at(30), DISNEY_HALL), clip('H2', at(36), DISNEY_HALL), clip('H3', null, DISNEY_HALL));
assert.equal(r.places.length, 1);
assert(r.places[0].paths.includes('/card/H3.MP4'));

// Confidence follows how many fixes corroborate a place.
assert.equal(infer(clip('I1', at(30), DISNEY_HALL), clip('I2', at(33), DISNEY_HALL)).places[0].confidence, 'high');
assert.equal(infer(clip('J1', at(30), DISNEY_HALL), clip('J2', at(33))).places[0].confidence, 'medium');

// Nothing in, nothing out.
assert.deepEqual(infer(), {places: [], unassigned: []});

console.log(JSON.stringify({placeInference: 'passed'}));
