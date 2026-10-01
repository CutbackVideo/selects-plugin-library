// Apple Vision helper for the Chris Williamson Style plugin (same helper as Mike Sunday Style).
//   vision-helper faces <image>...          -> one JSON line per image: {"file","w","h","faces":[[x,y,w,h],...]}
//                                               boxes are 0..1 of the image, origin top-left, largest first
//   vision-helper matte <in-image> <out.png> -> grayscale-in-RGBA PNG, white = the primary person, black = rest
//   vision-helper matte-dir <dir>            -> every <dir>/*.jpg becomes <dir>/*.m.png (one process, faster)
import Foundation
import Vision
import CoreImage
import CoreGraphics
import CoreVideo
import ImageIO

enum HelperError: LocalizedError {
    case usage, unsupported, noImage(String)
    var errorDescription: String? {
        switch self {
        case .usage: return "usage: vision-helper faces <img>... | matte <in> <out.png> | matte-dir <dir>"
        case .unsupported: return "Person segmentation requires macOS 14 or newer."
        case .noImage(let p): return "Could not read image: \(p)"
        }
    }
}

func cgImage(_ path: String) throws -> CGImage {
    guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
          let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { throw HelperError.noImage(path) }
    return img
}

func faces(_ paths: [String]) throws {
    for p in paths {
        let img = try cgImage(p)
        let req = VNDetectFaceRectanglesRequest()
        try VNImageRequestHandler(cgImage: img, options: [:]).perform([req])
        let boxes = (req.results ?? []).map { o -> [Double] in
            let b = o.boundingBox
            return [Double(b.minX), Double(1 - b.maxY), Double(b.width), Double(b.height)]
        }.sorted { $0[2] * $0[3] > $1[2] * $1[3] }
        let obj: [String: Any] = ["file": p, "w": img.width, "h": img.height, "faces": boxes]
        let data = try JSONSerialization.data(withJSONObject: obj)
        print(String(data: data, encoding: .utf8)!)
    }
}

@available(macOS 14.0, *)
func largestInstance(_ o: VNInstanceMaskObservation) -> IndexSet {
    let buf = o.instanceMask
    CVPixelBufferLockBaseAddress(buf, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(buf, .readOnly) }
    guard let base = CVPixelBufferGetBaseAddress(buf) else { return o.allInstances }
    let w = CVPixelBufferGetWidth(buf), h = CVPixelBufferGetHeight(buf), stride = CVPixelBufferGetBytesPerRow(buf)
    var counts: [Int: Int] = [:]
    for y in 0..<h {
        let row = base.advanced(by: y * stride).assumingMemoryBound(to: UInt8.self)
        for x in 0..<w { let l = Int(row[x]); if l > 0 { counts[l, default: 0] += 1 } }
    }
    guard let best = counts.max(by: { $0.value < $1.value })?.key else { return o.allInstances }
    return IndexSet(integer: best)
}

let ciContext = CIContext()

@available(macOS 14.0, *)
func matte(_ input: String, _ output: String) throws {
    let img = try cgImage(input)
    let handler = VNImageRequestHandler(cgImage: img, options: [:])
    let req = VNGeneratePersonInstanceMaskRequest()
    try handler.perform([req])
    var mask: CIImage
    if let o = req.results?.first, !o.allInstances.isEmpty {
        let pb = try o.generateScaledMaskForImage(forInstances: largestInstance(o), from: handler)
        mask = CIImage(cvPixelBuffer: pb)
    } else {
        mask = CIImage(color: .black).cropped(to: CGRect(x: 0, y: 0, width: img.width, height: img.height))
    }
    let extent = CGRect(x: 0, y: 0, width: img.width, height: img.height)
    let sx = CGFloat(img.width) / mask.extent.width, sy = CGFloat(img.height) / mask.extent.height
    mask = mask.transformed(by: CGAffineTransform(scaleX: sx, y: sy)).cropped(to: extent)
    guard let cs = CGColorSpace(name: CGColorSpace.sRGB) else { throw HelperError.unsupported }
    try ciContext.writePNGRepresentation(of: mask, to: URL(fileURLWithPath: output), format: .RGBA8, colorSpace: cs)
}

func run() throws {
    let a = CommandLine.arguments
    guard a.count >= 3 else { throw HelperError.usage }
    switch a[1] {
    case "faces": try faces(Array(a[2...]))
    case "matte":
        guard a.count == 4 else { throw HelperError.usage }
        guard #available(macOS 14.0, *) else { throw HelperError.unsupported }
        try matte(a[2], a[3])
    case "matte-dir":
        guard #available(macOS 14.0, *) else { throw HelperError.unsupported }
        let dir = a[2]
        let files = try FileManager.default.contentsOfDirectory(atPath: dir).filter { $0.hasSuffix(".jpg") }.sorted()
        for f in files {
            let inPath = (dir as NSString).appendingPathComponent(f)
            try matte(inPath, String(inPath.dropLast(4)) + ".m.png")
        }
        print("ok \(files.count)")
    default: throw HelperError.usage
    }
}

do { try run() } catch {
    FileHandle.standardError.write(Data((error.localizedDescription + "\n").utf8))
    exit(1)
}
