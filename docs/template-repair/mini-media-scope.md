# Mini / Archive: invocation-owned temporary audio

Scope: Mini `0.1.0-alpha.14`, Archive `0.1.0-alpha.8`, and Gallery
`0.3.23` reservation extraction. Parent: `f74c03e558de65369856ff853f9043e8e0411200`.
This is a feature checkpoint, not a completed template or completed module pool.
Chan's apps and template packs remain excluded.

## Reproduced failures

The legacy `hostDecodePcm` captured the media producer but later read and removed
its output through mutable `hostSdk`. A two-client interleaving in the actual
Mini helper returns the other client's samples and cleans its file. This is a
code-level reproduction; independent Panel iframe realms may isolate that global,
so it is not evidence that two installed panels reproduced a customer incident.

Mini's actual nested `preview()` did not pass cancellation to its FFmpeg job.
`stopPreview()` invalidated a result token but the producer continued. Its direct
temporary-file read had no declared output budget. Own-music decoding also accepted
unaligned trailing bytes and non-finite samples; `parseFloat` duration observation
accepted `Infinity` and `19extra`.

The new transient owner initially inherited best-effort cleanup from persistent
derived media. RED cases showed that a deletion failure or unknown deletion could
still return samples. Archive's actual fallback caller could also hide a terminal
ownership failure by successfully decoding with WebAudio. These cases now stop the
sample handoff while preserving the primary error and private cleanup diagnostics.

## Ownership decisions and contracts

| Feature | Decision | Input/output, dependencies and effects |
| --- | --- | --- |
| Local async files/media and connection bootstrap | Reuse `shared/local-client.ts` unchanged | Mini and Archive regenerate the canonical private adapter; public SDK identity stays the same. Existing per-SDK/Project/library/run bootstrap timeout and completion rules now apply to both. No new SDK/IPC surface or app binary change. |
| Temporary media reservation, bounded read, process scope and cleanup | Extend `shared/bundled-assets.js` | Capture one `files`/`media` pair per invocation; directory, f32/mp3 extension, producer, byte budget, AbortSignal/liveness and absolute deadline are explicit. Return an independent Uint8Array only after producer settlement, bounded stat/read/stat and cleanup. Maximum temporary read: 32 MiB. No Project Resource import, persistent index or retained output. |
| PCM decode | Extend the same asset feature | Path, sample rate in Hz and positive maximum seconds produce mono little-endian Float32Array. Budget is `ceil(rate * maxSeconds) * 4`; reject overflow, oversized, empty, unaligned and non-finite output. Own music retains 22,050 Hz / 240 seconds and existing beat worker/detector constants. |
| Mini preview recipe | Keep template-specific | Section start/length in seconds, mono 22,050 Hz MP3 at 48 kbit/s and 0.4-second fade remain Mini policy. Budget is `ceil(seconds * 6000) + 65536`. The actual preview/Stop functions now own an AbortController and use the common temporary owner. |
| Archive playback and WebAudio fallback | Keep template-specific | Archive still reads the selected track for seek/fade playback and supports ordinary FFmpeg failure through WebAudio. Captured client is carried into that fallback. Cancellation, deadline and unknown reservation/cleanup failures stop fallback. Whole-file input budgeting, source-content attestation and full fallback analysis remain open. |
| Existing persistent derived assets | Reuse existing owner, extracting its reservation mechanism | Gallery still fingerprints a private source, publishes complete content-addressed objects/indexes and retains referenced assets. Its established best-effort cleanup policy is unchanged; cleanup failure/GC acceptance is still open. |

`readTransientAsset` reserves an invocation-unique output by reusing the existing
exclusive-marker / bounded-observation / single-CAS mechanism. A lost creation reply
is observed before claiming the path. Foreign or unknown reservations are neither
produced over nor removed. Cleanup waits for the producer, even after cancellation;
it must not delete beneath an unsettled process. A lost deletion reply gets one
read-only stat observation; a confirmed missing file is accepted, otherwise the
outcome remains a terminal cleanup failure. Creation, CAS, encode and deletion are
not retried by this new owner.

Primary failures retain their error code and cause. When cleanup also fails, the
error includes private cleanup diagnostics and becomes terminal. Otherwise failed
cleanup has `BUNDLED_ASSET_CLEANUP`. Invalid input, malformed PCM, process error,
cancellation and deadline expiry remain distinct outcomes. Completion is checked
again after asynchronous cleanup. No crash journal or automatic GC is introduced.
An unresponsive host that never settles still cannot be safely cleaned by deleting
an actively written output.

The module registry stays five features / twelve registered consumers; it remains
a partial distribution registry. Archive gains an asset-feature dependency.
Mini/Archive generated adapters are checked explicitly in CI. Gallery's selective
generator includes the extracted reservation dependency. No.14, Stop Motion and
Polaroid receive regenerated definitions with unchanged active recipes. Unmigrated
legacy host copies continue to be compared byte-for-byte against City Weekend;
City Weekend is checked against Fast Switching. The tests no longer require those
unmigrated copies to equal the deliberately migrated Archive implementation.

## TDD and verification

- Initial seven actual-helper cases: six RED and one healthy control on the exact
  parent. Mini's real preview caller adds one RED for missing cancellation;
  invalid duration observations add two REDs. Cleanup adds three initial REDs,
  and Archive's real terminal-fallback caller adds another RED. Combined primary
  and cleanup failure subsequently adds its own RED for a missing terminal verdict.
- Final focused suite: 26 cases, including healthy fallback, adversarial client
  rebinding, late success, bounded PCM, reservation loss/foreign ownership,
  cleanup failure/lost reply/unknown observation, final cancellation and timeout.
  Real local FFmpeg with the canonical async file client returns 2,205 finite
  samples from an unchanged 0.1-second WAV at 22,050 Hz and leaves no staging.
- Related 27-file suite: 620 passed, one pre-existing optional fixture skip;
  299 Python checks: 293 passed, six skips. Mini/Archive legacy caller, worker,
  planner, scripts, typography, localization and codec checks run separately.
  Generated module/local-client drift, package and public-source checks also run.
  See the checkpoint receipt for final command-level evidence and any follow-up.
- Nine actual isolated development-app SDK scenarios use the exact embedded
  Mini/Archive clients, canonical files/media and the app's native FFmpeg. Each
  consumer returns the expected 2,205 samples, confirms a lost deletion reply with
  exactly one removal, rejects an actual retained-file cleanup failure and observes
  the correct 0.1-second duration. Mini's actual preview/Stop functions run in a VM
  around a held native encode reply: Stop aborts its signal, retains the active
  output until settlement and then removes it. No Project/Draft mutations occur.

Private reproducible artifacts:
`/Users/mano/Documents/clip-highlights-analysis/repro-20261022/mini-media-scope/`.
The SDK probe uses the public `media.job(id).status()` service for the canonical
client's status bridge. It is not installed-panel UI evidence. Controlled fault
cases deliberately retain their unconfirmed workspace files for inspection.

## 짧은 값 추적

실제 SDK 검사에서 사용한 **0.1초 WAV, 초당 샘플 22,050개, 최대 1초**를 따라갑니다.
설치된 템플릿의 전체 영상 제작·재생·내보내기는 이 추적에 포함되지 않습니다.

`shared/bundled-assets.js:269-273`:

```js
async function decodeAssetPcm(client,options){
 const {path,directory,rate,maxSeconds,signal,timeoutMs=120000,isCurrent=()=>true}=options??{};
 if(typeof path!=='string'||!path||!Number.isSafeInteger(rate)||rate<1||!Number.isFinite(maxSeconds)||maxSeconds<=0||typeof client?.media?.runFFmpeg!=='function')throw bundledAssetIssue('INPUT','The audio sample request is invalid.');
 const maxBytes=Math.ceil(rate*maxSeconds)*4;
 if(!Number.isSafeInteger(maxBytes)||maxBytes<4||maxBytes>32*1024*1024)throw bundledAssetIssue('INPUT','The requested audio sample budget is invalid.');
```

272줄: 소리 값 하나는 4바이트이므로 읽기 전에 한도를 **88,200바이트**로 정합니다.
실제 변환 결과는 **8,820바이트**입니다. 공통 처리에서 작업 종료와 임시 파일 정리를
확인한 뒤, 아래 코드를 거칩니다.

`shared/bundled-assets.js:277-279`:

```js
 if(bytes.length%4!==0)throw bundledAssetIssue('PCM','The decoded audio sample length is invalid.');
 const samples=new Float32Array(bytes.length/4),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 for(let i=0;i<samples.length;i++){samples[i]=view.getFloat32(i*4,true);if(!Number.isFinite(samples[i]))throw bundledAssetIssue('PCM','The decoded audio contains an invalid sample.');}
```

277줄: 남는 조각을 버리고 넘어가면 손상된 데이터를 정상으로 오인하므로 거부합니다.
278~279줄: 8,820바이트를 **정상적인 소리 값 2,205개**로 읽습니다. 입력 파일과 결과
샘플은 남고, 이번 분석에만 사용한 임시 파일은 삭제됩니다.

## Remaining gates

No immutable content snapshot/hash is added to transient source decoding. Archive's
whole-file preview/fallback budget, worker lifetime extraction, all other feature
ownership and original audited defects remain under review. No existing Draft is
migrated. No release, install, merge, Windows runtime, complete template save,
whole-video/audio playback or export is claimed. Whole-template ownership reviews
and completed templates remain **0/28**. Continue the all-template ownership ledger;
neither identical code counts nor this extension finalizes the module pool.
