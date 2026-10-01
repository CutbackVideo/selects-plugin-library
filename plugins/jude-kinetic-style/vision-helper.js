// Jude Kinetic Style — Apple Vision helper, run by engine.mjs through the system's JavaScript for Automation:
//
//   osascript -l JavaScript vision-helper.js faces <img>...    one JSON line per image: {file, w, h, faces: [[x,y,w,h]...]}
//   osascript -l JavaScript vision-helper.js matte-dir <dir>   every f_*.png gets f_*.m.png (white = any person)
//
// Face boxes are top-left based fractions of the image, largest first. Needs macOS 14 or later; nothing to build.
ObjC.import('Foundation');
ObjC.import('Vision');
ObjC.import('ImageIO');
ObjC.import('CoreGraphics');
ObjC.import('CoreImage');

const ONE_COMPONENT_8 = 1278226488; // kCVPixelFormatType_OneComponent8
const ACCURATE = 0; // VNGeneratePersonSegmentationRequestQualityLevelAccurate

function cgImage(path) {
  // A missing or unreadable file still yields a source object, with no images in it.
  const source = $.CGImageSourceCreateWithURL($.NSURL.fileURLWithPath(path), null);
  if (!(Number($.CGImageSourceGetCount(source)) > 0)) throw new Error('Could not read image: ' + path);
  return $.CGImageSourceCreateImageAtIndex(source, 0, null);
}

function perform(image, request) {
  const error = Ref();
  if (!$.VNImageRequestHandler.alloc.initWithCGImageOptions(image, $({})).performRequestsError($([request]), error)) {
    throw new Error(error[0] && !error[0].isNil() ? ObjC.unwrap(error[0].localizedDescription) : 'Vision request failed');
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

// A frame without people gives a black mask.
function matteDir(dir) {
  const names = ObjC.deepUnwrap($.NSFileManager.defaultManager.contentsOfDirectoryAtPathError(dir, null)) || [];
  const files = names.filter((f) => f.startsWith('f_') && f.endsWith('.png') && !f.endsWith('.m.png')).sort();
  const context = $.CIContext.context, colorSpace = $.CGColorSpaceCreateWithName($.kCGColorSpaceSRGB);
  let withPeople = 0;
  for (const f of files) {
    const path = dir + '/' + f, image = cgImage(path);
    const width = Number($.CGImageGetWidth(image)), height = Number($.CGImageGetHeight(image));
    const request = $.VNGeneratePersonSegmentationRequest.alloc.init;
    request.qualityLevel = ACCURATE;
    request.outputPixelFormat = ONE_COMPONENT_8;
    perform(image, request);
    const extent = $.CGRectMake(0, 0, width, height);
    let mask = $.CIImage.imageWithColor($.CIColor.blackColor).imageByCroppingToRect(extent);
    if (request.results.count > 0) {
      const raw = $.CIImage.imageWithCVPixelBuffer(request.results.objectAtIndex(0).pixelBuffer), e = raw.extent;
      mask = raw.imageByApplyingTransform($.CGAffineTransformMakeScale(width / e.size.width, height / e.size.height)).imageByCroppingToRect(extent);
      withPeople++;
    }
    const out = $.NSURL.fileURLWithPath(path.slice(0, -4) + '.m.png');
    if (!context.writePNGRepresentationOfImageToURLFormatColorSpaceOptionsError(mask, out, $.kCIFormatRGBA8, colorSpace, $({}), null)) throw new Error('Could not write the mask for ' + f);
  }
  return JSON.stringify({ frames: files.length, withPeople });
}

function run(argv) {
  if (argv[0] === 'faces' && argv.length > 1) return faces(argv.slice(1));
  if (argv[0] === 'matte-dir' && argv.length === 2) return matteDir(argv[1]);
  throw new Error('usage: vision-helper.js faces <img>... | matte-dir <dir>');
}
