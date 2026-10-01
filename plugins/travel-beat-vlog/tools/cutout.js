// Cut the people (or the main subject) out of one photo: writes an RGBA PNG the size of
// the input, transparent everywhere except what Apple Vision finds. Runs on a stock Mac
// through JavaScript for Automation, so nothing is compiled:
//   osascript -l JavaScript cutout.js input.jpg output.png [person|foreground]
// Prints {"width","height"}; on failure writes one line to stderr and exits non-zero.
ObjC.import('Foundation'); ObjC.import('stdlib'); ObjC.import('Vision'); ObjC.import('CoreImage');
ObjC.import('CoreGraphics'); ObjC.import('ImageIO'); ObjC.import('AppKit');

function fail(message, code) {
  $.NSFileHandle.fileHandleWithStandardError.writeData($(message + '\n').dataUsingEncoding($.NSUTF8StringEncoding));
  $.exit(code);
}

function run(argv) {
  if (argv.length < 2) fail('Usage: cutout input output.png [person|foreground]', 2);
  const mode = argv[2] || 'person';
  // A CoreFoundation null comes back as a Ref, never as null, so test the size instead.
  if (!$.NSFileManager.defaultManager.isReadableFileAtPath(argv[0])) fail('Cannot read the photo.', 3);
  const source = $.CGImageSourceCreateWithURL($.NSURL.fileURLWithPath(argv[0]), null);
  const cg = $.CGImageSourceCreateImageAtIndex(source, 0, $({kCGImageSourceShouldAllowFloat: false}));
  const W = Number($.CGImageGetWidth(cg)), H = Number($.CGImageGetHeight(cg));
  if (!(W > 0 && H > 0)) fail('Cannot read the photo.', 3);
  const image = $.CIImage.imageWithCGImage(cg), extent = image.extent;
  const handler = $.VNImageRequestHandler.alloc.initWithCGImageOptions(cg, $({}));
  let mask;
  if (mode === 'foreground') {
    const req = $.VNGenerateForegroundInstanceMaskRequest.alloc.init;
    if (!handler.performRequestsError($([req]), null) || !(req.results.count > 0)) fail('No subject found.', 4);
    const obs = req.results.objectAtIndex(0);
    mask = $.CIImage.imageWithCVPixelBuffer(obs.generateScaledMaskForImageForInstancesFromRequestHandlerError(obs.allInstances, handler, null));
  } else {
    // Person instance masks (macOS 14+) keep light clothing and hair that plain person
    // segmentation drops against a bright sky. Run on the whole photo and, for small people,
    // on a padded crop around the people Vision detects; the union of both is the mask.
    const full = $.CGRectMake(0, 0, W, H);
    const people = (img, r) => {
      const req = $.VNGeneratePersonInstanceMaskRequest.alloc.init;
      const h = $.VNImageRequestHandler.alloc.initWithCGImageOptions(img, $({}));
      if (!h.performRequestsError($([req]), null)) fail('No person found.', 4);
      if (!(req.results.count > 0)) return null;
      const obs = req.results.objectAtIndex(0);
      if (!(obs.allInstances.count > 0)) return null;
      const m = $.CIImage.imageWithCVPixelBuffer(obs.generateScaledMaskForImageForInstancesFromRequestHandlerError(obs.allInstances, h, null));
      return m.imageByApplyingTransform($.CGAffineTransformMakeScale(r.size.width / m.extent.size.width, r.size.height / m.extent.size.height))
        .imageByApplyingTransform($.CGAffineTransformMakeTranslation(r.origin.x, H - (r.origin.y + r.size.height)));
    };
    // Instance masks can also pick up person-like shapes (a window frame), so a detected person is required.
    const humans = $.VNDetectHumanRectanglesRequest.alloc.init;
    humans.upperBodyOnly = false;
    if (!handler.performRequestsError($([humans]), null)) fail('No person found.', 4);
    const n = humans.results.count;
    if (!(n > 0)) fail('No person found.', 4);
    let found = people(cg, full);
    let u = humans.results.objectAtIndex(0).boundingBox;
    for (let i = 1; i < n; i++) u = $.CGRectUnion(u, humans.results.objectAtIndex(i).boundingBox);
    const side = Math.max(u.size.width * W, u.size.height * H) * 1.6;
    const cx = (u.origin.x + u.size.width / 2) * W, cy = (1 - (u.origin.y + u.size.height / 2)) * H;
    const crop = $.CGRectIntegral($.CGRectIntersection($.CGRectMake(cx - side / 2, cy - side / 2, side, side), full));
    const part = $.CGImageCreateWithImageInRect(cg, crop);
    const m = part ? people(part, crop) : null;
    if (m) found = found ? m.imageByApplyingFilterWithInputParameters('CIMaximumCompositing', $({inputBackgroundImage: found})) : m;
    if (found) found = found.imageByCompositingOverImage($.CIImage.imageWithColor($.CIColor.blackColor).imageByCroppingToRect(extent));
    if (!found) fail('No person found.', 4);
    mask = found.imageByCroppingToRect(extent);
    // An empty mask would silently leave the title over the people.
    const peak = mask.imageByApplyingFilterWithInputParameters('CIAreaMaximum', $({inputExtent: $.CIVector.vectorWithCGRect(extent)}));
    if ($.NSBitmapImageRep.alloc.initWithCIImage(peak).colorAtXY(0, 0).redComponent < 0.5) fail('No person found.', 4);
  }
  const clear = $.CIImage.imageWithColor($.CIColor.clearColor).imageByCroppingToRect(extent);
  const out = image.imageByApplyingFilterWithInputParameters('CIBlendWithMask', $({inputBackgroundImage: clear, inputMaskImage: mask}));
  const result = $.CIContext.context.createCGImageFromRectFormatColorSpace(out, extent, $.kCIFormatRGBA8, $.CGColorSpaceCreateDeviceRGB());
  const dest = result ? $.CGImageDestinationCreateWithURL($.NSURL.fileURLWithPath(argv[1]), $('public.png'), 1, null) : null;
  if (!dest) fail('Cannot write the cutout.', 5);
  $.CGImageDestinationAddImage(dest, result, null);
  if (!$.CGImageDestinationFinalize(dest)) fail('Cannot write the cutout.', 5);
  return JSON.stringify({width: W, height: H});
}
