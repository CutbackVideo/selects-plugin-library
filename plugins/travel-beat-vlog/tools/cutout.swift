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
  // Person instance masks (macOS 14+) keep light clothing and hair that plain person segmentation drops against a
  // bright sky. Run on the whole photo and, for small people, on a padded crop around the people Vision detects;
  // the union of both is the mask.
  let W = CGFloat(cg.width), H = CGFloat(cg.height), full = CGRect(x: 0, y: 0, width: W, height: H)
  func people(_ img: CGImage, at r: CGRect) throws -> CIImage? {
    let req = VNGeneratePersonInstanceMaskRequest(); let h = VNImageRequestHandler(cgImage: img, options: [:])
    try h.perform([req])
    guard let obs = req.results?.first, !obs.allInstances.isEmpty else { return nil }
    let m = CIImage(cvPixelBuffer: try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: h))
    return m.transformed(by: CGAffineTransform(scaleX: r.width / m.extent.width, y: r.height / m.extent.height))
      .transformed(by: CGAffineTransform(translationX: r.minX, y: H - r.maxY))
  }
  // Instance masks can also pick up person-like shapes (a window frame), so a detected person is required.
  let humans = VNDetectHumanRectanglesRequest(); humans.upperBodyOnly = false
  try handler.perform([humans])
  guard let boxes = humans.results, !boxes.isEmpty else { fputs("No person found.\n", stderr); exit(4) }
  var found: CIImage? = try people(cg, at: full)
  do {
    let u = boxes.map { $0.boundingBox }.reduce(boxes[0].boundingBox) { $0.union($1) }
    let side = max(u.width * W, u.height * H) * 1.6
    let crop = CGRect(x: u.midX * W - side / 2, y: (1 - u.midY) * H - side / 2, width: side, height: side).intersection(full).integral
    if let part = cg.cropping(to: crop), let m = try people(part, at: crop) {
      found = found.map { m.applyingFilter("CIMaximumCompositing", parameters: [kCIInputBackgroundImageKey: $0]) } ?? m
    }
  }
  found = found?.composited(over: CIImage(color: .black).cropped(to: image.extent))
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
