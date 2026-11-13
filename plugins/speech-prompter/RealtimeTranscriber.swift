import Foundation
import AVFoundation
import Darwin

// Microphone PCM stays in memory. Only the latest transcript/status is written locally.
final class Transcriber: @unchecked Sendable {
    let stateURL: URL
    let language: String
    let token: String
    let mode: String
    let testPath: String?
    var socket: URLSessionWebSocketTask!
    var session: URLSession!
    let engine = AVAudioEngine()
    let lock = NSLock()
    var pending = Data()
    var alive = true
    var ready = false
    var order = [String]()
    var texts = [String:String]()
    var heard = ""
    var signalSource: DispatchSourceSignal?
    var sampleCount = 0
    var quietSamples = 0
    var speechSeen = false
    var finishedTest = false
    init(_ args: [String]) {
        stateURL = URL(fileURLWithPath: args[1]); language = args[2]; token = args[3]; mode = args[4]
        testPath = args.count > 5 ? args[5] : nil
    }
    func state(_ phase: String, _ error: String = "") {
        let object: [String:Any] = ["session":token,"phase":phase,"heard":heard,"error":error,"provider":"openai","model":"gpt-live-transcribe","updatedAt":Date().timeIntervalSince1970]
        if let data = try? JSONSerialization.data(withJSONObject: object) { try? data.write(to:stateURL,options:.atomic); chmod(stateURL.path, 0o600) }
    }
    func finish(_ error: String = "", code: Int32 = 0) -> Never {
        alive = false
        engine.stop()
        socket?.cancel(with:.goingAway,reason:nil)
        state(error.isEmpty ? "stopped" : "error",error)
        exit(code)
    }
    func send(_ object: [String:Any]) async throws {
        let data = try JSONSerialization.data(withJSONObject:object)
        try await socket.send(.string(String(decoding:data,as:UTF8.self)))
    }
    func receive() async throws -> [String:Any] {
        let message = try await socket.receive()
        let data: Data
        switch message { case .string(let s): data = Data(s.utf8); case .data(let d): data=d; @unknown default: return [:] }
        return (try JSONSerialization.jsonObject(with:data)) as? [String:Any] ?? [:]
    }
    func handle(_ e: [String:Any]) {
        let type = e["type"] as? String ?? ""
        if type == "error" || type == "conversation.item.input_audio_transcription.failed" {
            let err = e["error"] as? [String:Any] ?? [:]
            let code = err["code"] as? String ?? "api_error"
            let message = err["message"] as? String ?? "OpenAI transcription failed."
            // The API error contains no request headers; never log environment/credentials.
            finish("OpenAI [\(code)]: \(message)",code:1)
        }
        if type == "input_audio_buffer.committed", let id=e["item_id"] as? String, !order.contains(id) {
            if let previous=e["previous_item_id"] as? String, let index=order.firstIndex(of:previous) { order.insert(id,at:index+1) } else { order.append(id) }
        }
        if type == "conversation.item.input_audio_transcription.delta" || type == "conversation.item.input_audio_transcription.completed" {
            let id=e["item_id"] as? String ?? "current"
            if !order.contains(id) { order.append(id) }
            if type.hasSuffix(".delta") { texts[id,default:""] += e["delta"] as? String ?? "" }
            else { texts[id] = e["transcript"] as? String ?? texts[id] ?? ""; if mode == "test" { finishedTest = true } }
            heard=String(order.suffix(4).compactMap { texts[$0] }.joined(separator:" ").suffix(300))
            if order.count > 12 { let old=order.removeFirst(); texts.removeValue(forKey:old) }
            state("listening")
        }
    }
    func setupMicrophone() async throws {
        let granted: Bool
        switch AVCaptureDevice.authorizationStatus(for:.audio) {
        case .authorized: granted=true
        case .notDetermined: granted=await AVCaptureDevice.requestAccess(for:.audio)
        default: granted=false
        }
        guard granted else { throw NSError(domain:"Prompter",code:1,userInfo:[NSLocalizedDescriptionKey:"마이크 권한이 없습니다. 시스템 설정 → 개인정보 보호 및 보안 → 마이크를 확인하세요."]) }
        let node=engine.inputNode
        let input=node.outputFormat(forBus:0)
        guard input.sampleRate > 0, input.channelCount > 0,
              let output=AVAudioFormat(commonFormat:.pcmFormatFloat32,sampleRate:24000,channels:1,interleaved:false),
              let converter=AVAudioConverter(from:input,to:output) else {
            throw NSError(domain:"Prompter",code:2,userInfo:[NSLocalizedDescriptionKey:"마이크 입력 장치를 찾지 못했습니다."])
        }
        node.installTap(onBus:0,bufferSize:2048,format:input) { buffer,_ in
            let count=AVAudioFrameCount(ceil(Double(buffer.frameLength)*24000/input.sampleRate))+64
            guard let converted=AVAudioPCMBuffer(pcmFormat:output,frameCapacity:count) else { return }
            var supplied=false; var conversionError:NSError?
            converter.convert(to:converted,error:&conversionError) { _,status in
                if supplied { status.pointee = .noDataNow; return nil }; supplied=true; status.pointee = .haveData; return buffer
            }
            guard conversionError == nil, let channel=converted.floatChannelData?[0] else { return }
            var pcm=[Int16](); pcm.reserveCapacity(Int(converted.frameLength))
            for i in 0..<Int(converted.frameLength) { pcm.append(Int16(max(-32767,min(32767,channel[i]*32767))).littleEndian) }
            let bytes=pcm.withUnsafeBytes { Data($0) }
            self.lock.lock()
            if self.pending.count < 24000*2*5 { self.pending.append(bytes) }
            else { self.alive=false }
            self.lock.unlock()
        }
        engine.prepare(); try engine.start()
    }
    func drainAudio() -> Data {
        lock.lock(); defer { lock.unlock() }
        let bytes=pending; pending=Data(); return bytes
    }
    func append(_ bytes: Data) async throws {
        guard !bytes.isEmpty else { return }
        try await send(["type":"input_audio_buffer.append","audio":bytes.base64EncodedString()])
        let n=bytes.count/2
        var power=0.0
        bytes.withUnsafeBytes { raw in
            for i in 0..<n { let v=Double(Int16(littleEndian:raw.loadUnaligned(fromByteOffset:i*2,as:Int16.self)))/32768; power+=v*v }
        }
        let rms=sqrt(power/Double(max(1,n)))
        sampleCount+=n
        if rms > 0.012 { speechSeen=true; quietSamples=0 } else { quietSamples+=n }
        if (speechSeen && quietSamples >= 14400 && sampleCount >= 12000) || sampleCount >= 240000 {
            if speechSeen { try await send(["type":"input_audio_buffer.commit"]) }
            else { try await send(["type":"input_audio_buffer.clear"]) }
            sampleCount=0; quietSamples=0; speechSeen=false
        }
    }
    func run() async {
        signal(SIGTERM,SIG_IGN); signal(SIGINT,SIG_IGN)
        signalSource=DispatchSource.makeSignalSource(signal:SIGTERM,queue:.global())
        signalSource?.setEventHandler { self.finish() }; signalSource?.resume()
        state("starting")
        DispatchQueue.global().asyncAfter(deadline:.now()+18) { if !self.ready { self.finish("OpenAI 연결 시간이 초과되었습니다.",code:1) } }
        do {
            guard let key=ProcessInfo.processInfo.environment["OPENAI_API_KEY"], !key.isEmpty else { finish("OPENAI_API_KEY를 찾지 못했습니다.",code:1) }
            var request=URLRequest(url:URL(string:"wss://api.openai.com/v1/realtime?intent=transcription")!)
            request.setValue("Bearer \(key)",forHTTPHeaderField:"Authorization")
            session=URLSession(configuration:.ephemeral)
            socket=session.webSocketTask(with:request); socket.resume()
            try await send(["type":"session.update","session":["type":"transcription","audio":["input":["format":["type":"audio/pcm","rate":24000],"transcription":["model":"gpt-live-transcribe","language":language],"turn_detection":NSNull()]]]])
            while true {
                let e=try await receive(); handle(e)
                if e["type"] as? String == "session.updated" { break }
            }
            ready=true
            if mode == "probe" { state("verified"); print("OpenAI realtime session verified"); exit(0) }
            if mode != "test" { try await setupMicrophone() }
            state("listening")
            Task { do { while self.alive { self.handle(try await self.receive()) } } catch { self.finish("OpenAI 연결이 종료되었습니다: \(error.localizedDescription)",code:1) } }
            if mode == "test", let path=testPath {
                let file=try AVAudioFile(forReading:URL(fileURLWithPath:path),commonFormat:.pcmFormatInt16,interleaved:true)
                guard file.processingFormat.sampleRate == 24000, file.processingFormat.channelCount == 1 else { finish("Test input must be mono 24kHz PCM",code:1) }
                while file.framePosition < file.length {
                    let buffer=AVAudioPCMBuffer(pcmFormat:file.processingFormat,frameCapacity:2400)!
                    try file.read(into:buffer)
                    let b=buffer.audioBufferList.pointee.mBuffers
                    try await append(Data(bytes:b.mData!,count:Int(b.mDataByteSize)))
                    try await Task.sleep(nanoseconds:50_000_000)
                }
                if sampleCount > 2400 { try await send(["type":"input_audio_buffer.commit"]) }
                for _ in 0..<200 { if finishedTest && !heard.isEmpty { print("Transcription test passed"); finish() }; try await Task.sleep(nanoseconds:100_000_000) }
                finish("전사 테스트 시간 초과",code:1)
            }
            var pings=0
            while alive {
                let bytes=drainAudio()
                try await append(bytes)
                pings+=1
                if pings%200 == 0 { socket.sendPing { error in if error != nil { self.finish("OpenAI 연결이 끊겼습니다.",code:1) } } }
                try await Task.sleep(nanoseconds:100_000_000)
            }
            finish("네트워크가 오디오 전송 속도를 따라가지 못했습니다. 다시 시작하세요.",code:1)
        } catch { finish(error.localizedDescription,code:1) }
    }
}
@main struct Main { static func main() async { await Transcriber(CommandLine.arguments).run() } }
