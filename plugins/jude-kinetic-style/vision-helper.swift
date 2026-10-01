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
        case .usage: return "usage: vision-helper faces <img>... | matte-dir <dir>"
        case .unsupported: return "Person segmentation is unavailable on this Mac."
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


// Every f_*.png in the folder gets f_*.m.png: white = any person, black = the rest. A frame without people gives a black mask.
let ciContext = CIContext()
func matteDir(_ dir: String) throws {
    let files = try FileManager.default.contentsOfDirectory(atPath: dir).filter { $0.hasPrefix("f_") && $0.hasSuffix(".png") && !$0.hasSuffix(".m.png") }.sorted()
    guard let cs = CGColorSpace(name: CGColorSpace.sRGB) else { throw HelperError.unsupported }
    var withPeople = 0
    for f in files {
        let path = (dir as NSString).appendingPathComponent(f)
        let img = try cgImage(path)
        let req = VNGeneratePersonSegmentationRequest()
        req.qualityLevel = .accurate
        req.outputPixelFormat = kCVPixelFormatType_OneComponent8
        try VNImageRequestHandler(cgImage: img, options: [:]).perform([req])
        let extent = CGRect(x: 0, y: 0, width: img.width, height: img.height)
        var mask = CIImage(color: .black).cropped(to: extent)
        if let buffer = req.results?.first?.pixelBuffer {
            let raw = CIImage(cvPixelBuffer: buffer)
            mask = raw.transformed(by: CGAffineTransform(scaleX: extent.width / raw.extent.width, y: extent.height / raw.extent.height)).cropped(to: extent)
            withPeople += 1
        }
        try ciContext.writePNGRepresentation(of: mask, to: URL(fileURLWithPath: String(path.dropLast(4)) + ".m.png"), format: .RGBA8, colorSpace: cs)
    }
    print(String(data: try JSONSerialization.data(withJSONObject: ["frames": files.count, "withPeople": withPeople]), encoding: .utf8)!)
}

do {
    let a = CommandLine.arguments
    guard a.count > 2 else { throw HelperError.usage }
    switch a[1] {
    case "faces": try faces(Array(a[2...]))
    case "matte-dir": try matteDir(a[2])
    default: throw HelperError.usage
    }
} catch { FileHandle.standardError.write(Data((error.localizedDescription + "\n").utf8)); exit(1) }
