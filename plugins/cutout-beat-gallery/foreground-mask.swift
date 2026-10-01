import Foundation
import Vision
import CoreImage
import AppKit

let args = CommandLine.arguments
if args.count != 3 { fputs("usage: foreground-mask input output\n", stderr); exit(2) }
let inputURL = URL(fileURLWithPath: args[1])
let outputURL = URL(fileURLWithPath: args[2])
let request = VNGenerateForegroundInstanceMaskRequest()
request.usesCPUOnly = true
let handler = VNImageRequestHandler(url: inputURL, options: [:])
do {
    try handler.perform([request])
    guard let observation = request.results?.first else { throw NSError(domain: "Mask", code: 1, userInfo: [NSLocalizedDescriptionKey: "No foreground observation"]) }
    let mask = try observation.generateScaledMaskForImage(forInstances: observation.allInstances, from: handler)
    let ci = CIImage(cvPixelBuffer: mask)
    let context = CIContext()
    let rect = ci.extent
    guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
          let cg = context.createCGImage(ci, from: rect, format: .RGBA8, colorSpace: colorSpace),
          let png = NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:]) else { throw NSError(domain: "Mask", code: 2) }
    try png.write(to: outputURL)
    print("\(Int(rect.width))x\(Int(rect.height))")
} catch { fputs("Mask error: \(error)\n", stderr); exit(1) }
