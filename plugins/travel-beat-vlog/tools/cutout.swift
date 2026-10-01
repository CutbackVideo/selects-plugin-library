import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers
// Cut the people out of one photo: writes an RGBA PNG the size of the input, transparent
// everywhere except the people Apple Vision finds. Usage: cutout input.jpg output.png [person|foreground]
let args = CommandLine.arguments
guard args.count >= 3 else { fputs("Usage: cutout input output.png [person|foreground]\n", stderr); exit(2) }
let input = URL(fileURLWithPath: args[1]), output = URL(fileURLWithPath: args[2])
let mode = args.count > 3 ? args[3] : "person"
guard let src = CGImageSourceCreateWithURL(input as CFURL, nil),
      let cg = CGImageSourceCreateImageAtIndex(src, 0, [kCGImageSourceShouldAllowFloat: false] as CFDictionary) else { fputs("Cannot read the photo.\n", stderr); exit(3) }
let image = CIImage(cgImage: cg)
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
var mask: CIImage
if mode == "foreground" {
  let req = VNGenerateForegroundInstanceMaskRequest()
  try handler.perform([req])
  guard let obs = req.results?.first else { fputs("No subject found.\n", stderr); exit(4) }
  let buf = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler)
  mask = CIImage(cvPixelBuffer: buf)
} else {
  // Person segmentation misses small people, so segment a padded crop around the people Vision detects
  // and place that mask back; without detections, segment the whole photo.
  func segment(_ img: CGImage) throws -> CIImage? {
    let req = VNGeneratePersonSegmentationRequest(); req.qualityLevel = .accurate; req.outputPixelFormat = kCVPixelFormatType_OneComponent8
    try VNImageRequestHandler(cgImage: img, options: [:]).perform([req])
    guard let buf = req.results?.first?.pixelBuffer else { return nil }
    let m = CIImage(cvPixelBuffer: buf)
    return m.transformed(by: CGAffineTransform(scaleX: CGFloat(img.width) / m.extent.width, y: CGFloat(img.height) / m.extent.height))
  }
  let humans = VNDetectHumanRectanglesRequest(); humans.upperBodyOnly = false
  try handler.perform([humans])
  let W = CGFloat(cg.width), H = CGFloat(cg.height)
  var found: CIImage? = nil
  if let boxes = humans.results, !boxes.isEmpty {
    let u = boxes.map { $0.boundingBox }.reduce(boxes[0].boundingBox) { $0.union($1) }
    let side = max(u.width * W, u.height * H) * 1.6
    let cx = u.midX * W, cy = (1 - u.midY) * H
    let crop = CGRect(x: cx - side / 2, y: cy - side / 2, width: side, height: side).intersection(CGRect(x: 0, y: 0, width: W, height: H)).integral
    if let part = cg.cropping(to: crop), let m = try segment(part) {
      found = m.transformed(by: CGAffineTransform(translationX: crop.minX, y: H - crop.maxY))
        .composited(over: CIImage(color: .black).cropped(to: image.extent))
    }
  } else {
    found = try segment(cg)
  }
  guard let m = found else { fputs("No person found.\n", stderr); exit(4) }
  mask = m.cropped(to: image.extent)
  // An empty mask would silently leave the title over the people.
  var avg = [UInt8](repeating: 0, count: 4)
  CIContext().render(mask.applyingFilter("CIAreaMaximum", parameters: [kCIInputExtentKey: CIVector(cgRect: image.extent)]), toBitmap: &avg, rowBytes: 4, bounds: CGRect(x: 0, y: 0, width: 1, height: 1), format: .RGBA8, colorSpace: nil)
  if avg[0] < 128 { fputs("No person found.\n", stderr); exit(4) }
}
let clear = CIImage(color: .clear).cropped(to: image.extent)
let out = image.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: clear, kCIInputMaskImageKey: mask])
let ctx = CIContext()
guard let res = ctx.createCGImage(out, from: image.extent, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB()),
      let dest = CGImageDestinationCreateWithURL(output as CFURL, UTType.png.identifier as CFString, 1, nil) else { fputs("Cannot write the cutout.\n", stderr); exit(5) }
CGImageDestinationAddImage(dest, res, nil)
guard CGImageDestinationFinalize(dest) else { fputs("Cannot write the cutout.\n", stderr); exit(5) }
print("{\"width\":\(cg.width),\"height\":\(cg.height)}")
