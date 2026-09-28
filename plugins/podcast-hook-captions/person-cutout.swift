import Foundation
import Vision
import CoreImage
import CoreGraphics
import CoreVideo

enum CutoutError: LocalizedError {
    case usage
    case unsupported
    case noPerson
    case noImage

    var errorDescription: String? {
        switch self {
        case .usage: return "Usage: person-cutout input-image output-png"
        case .unsupported: return "Person segmentation requires macOS 14 or newer."
        case .noPerson: return "No person was detected in the incoming frame."
        case .noImage: return "Vision could not create the transparent person image."
        }
    }
}

@available(macOS 14.0, *)
func primaryPerson(in observation: VNInstanceMaskObservation) -> IndexSet {
    let buffer = observation.instanceMask
    guard CVPixelBufferGetPixelFormatType(buffer) == kCVPixelFormatType_OneComponent8 else {
        return observation.allInstances
    }
    CVPixelBufferLockBaseAddress(buffer, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(buffer, .readOnly) }
    guard let base = CVPixelBufferGetBaseAddress(buffer) else { return observation.allInstances }

    let width = CVPixelBufferGetWidth(buffer)
    let height = CVPixelBufferGetHeight(buffer)
    let stride = CVPixelBufferGetBytesPerRow(buffer)
    var counts: [Int: Int] = [:]
    for y in 0..<height {
        let row = base.advanced(by: y * stride).assumingMemoryBound(to: UInt8.self)
        for x in 0..<width {
            let label = Int(row[x])
            if label > 0 && observation.allInstances.contains(label) {
                counts[label, default: 0] += 1
            }
        }
    }
    guard let largest = counts.max(by: { $0.value < $1.value })?.key else {
        return observation.allInstances
    }
    return IndexSet(integer: largest)
}

func run() throws {
    guard CommandLine.arguments.count == 3 else { throw CutoutError.usage }
    guard #available(macOS 14.0, *) else { throw CutoutError.unsupported }

    let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
    let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
    let handler = VNImageRequestHandler(url: inputURL, options: [:])
    let request = VNGeneratePersonInstanceMaskRequest()
    try handler.perform([request])

    guard let observation = request.results?.first,
          !observation.allInstances.isEmpty else {
        throw CutoutError.noPerson
    }

    let pixelBuffer = try observation.generateMaskedImage(
        ofInstances: primaryPerson(in: observation),
        from: handler,
        croppedToInstancesExtent: false
    )

    let image = CIImage(cvPixelBuffer: pixelBuffer)
    let context = CIContext()
    guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) else {
        throw CutoutError.noImage
    }
    try context.writePNGRepresentation(
        of: image,
        to: outputURL,
        format: .RGBA8,
        colorSpace: colorSpace
    )
}

do {
    try run()
    print("ok")
} catch {
    FileHandle.standardError.write(Data((error.localizedDescription + "\n").utf8))
    exit(1)
}
