// Chris Williamson Style — Apple Vision helper, run by engine.mjs through the system's JavaScript for Automation:
//
//   osascript -l JavaScript vision-helper.js faces <img>...    one JSON line per image: {file, w, h, faces: [[x,y,w,h]...]}
//
// Face boxes are top-left based fractions of the image, largest first. Nothing to build.
ObjC.import('Foundation');
ObjC.import('Vision');
ObjC.import('ImageIO');
ObjC.import('CoreGraphics');

function cgImage(path) {
  // A missing or unreadable file still yields a source object, with no images in it.
  const source = $.CGImageSourceCreateWithURL($.NSURL.fileURLWithPath(path), null);
  if (!(Number($.CGImageSourceGetCount(source)) > 0)) throw new Error('Could not read image: ' + path);
  return $.CGImageSourceCreateImageAtIndex(source, 0, null);
}

function perform(image, request) {
  // An NSError** out-parameter takes $(): after a failed call it is the NSError.
  // (Reading [0] of a Ref() there crashes osascript.)
  const error = $();
  if (!$.VNImageRequestHandler.alloc.initWithCGImageOptions(image, $({})).performRequestsError($([request]), error)) {
    throw new Error((error.localizedDescription && error.localizedDescription.js) || 'Vision request failed');
  }
}

function faces(paths) {
  const lines = [];
  for (const path of paths) {
    const image = cgImage(path);
    const request = $.VNDetectFaceRectanglesRequest.alloc.init;
    perform(image, request);
    const results = request.results, boxes = [];
    for (let i = 0; i < results.count; i++) {
      const b = results.objectAtIndex(i).boundingBox;
      boxes.push([b.origin.x, 1 - (b.origin.y + b.size.height), b.size.width, b.size.height]);
    }
    boxes.sort((a, b) => b[2] * b[3] - a[2] * a[3]);
    lines.push(JSON.stringify({ file: path, w: Number($.CGImageGetWidth(image)), h: Number($.CGImageGetHeight(image)), faces: boxes }));
  }
  return lines.join('\n');
}

function run(argv) {
  if (argv[0] === 'faces' && argv.length > 1) return faces(argv.slice(1));
  throw new Error('usage: vision-helper.js faces <img>...');
}
