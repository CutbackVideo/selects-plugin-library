"""Turn individual still images into reusable, silent 60 fps H.264 tile sources.

The JSON stdin/stdout contract is intentionally independent of a Selects Draft:
it never renders or modifies a gallery. Repeated source content is encoded once.
"""

import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


FPS = 60
MAX_IMAGES = 21
MAX_FRAMES = 36000
MAX_EDGE = 1920
ALGORITHM = "photo-gallery-still-v1-max1920-h264-crf18"


class ConversionError(Exception):
    pass


def run(command, timeout):
    try:
        return subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                              text=True, check=False, timeout=timeout)
    except subprocess.TimeoutExpired as error:
        raise ConversionError("Media conversion timed out") from error
    except OSError as error:
        raise ConversionError("ffmpeg or ffprobe could not start") from error


def digest_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def probe(path, count_frames=False):
    command = ["ffprobe", "-v", "error"]
    if count_frames:
        command.append("-count_frames")
    command += ["-show_entries", "stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,nb_read_frames",
                "-of", "json", str(path)]
    result = run(command, timeout=45)
    if result.returncode:
        raise ConversionError("Image or cached video cannot be decoded")
    try:
        streams = json.loads(result.stdout)["streams"]
        video = next(item for item in streams if item.get("codec_type") == "video")
    except (KeyError, ValueError, StopIteration, TypeError) as error:
        raise ConversionError("Media has no readable picture stream") from error
    width, height = video.get("width"), video.get("height")
    if not isinstance(width, int) or not isinstance(height, int) or width <= 0 or height <= 0:
        raise ConversionError("Media dimensions are unavailable")
    return video, streams


def expected_dimensions(width, height):
    factor = min(1.0, MAX_EDGE / max(width, height))
    scaled_w = max(1, round(width * factor))
    scaled_h = max(1, round(height * factor))
    return scaled_w + scaled_w % 2, scaled_h + scaled_h % 2


def validate_output(path, frames, dimensions, decode=False):
    video, streams = probe(path, count_frames=True)
    if len(streams) != 1 or video.get("codec_name") != "h264":
        raise ConversionError("Cached tile has the wrong stream format")
    if video.get("r_frame_rate") != "60/1" or video.get("avg_frame_rate") != "60/1":
        raise ConversionError("Cached tile has the wrong frame rate")
    if video.get("nb_read_frames") != str(frames):
        raise ConversionError("Cached tile has the wrong frame count")
    if (video["width"], video["height"]) != dimensions:
        raise ConversionError("Cached tile has the wrong dimensions")
    if decode:
        result = run(["ffmpeg", "-nostdin", "-v", "error", "-xerror", "-i", str(path),
                      "-f", "null", "-"], timeout=max(60, frames // FPS * 5 + 30))
        if result.returncode:
            raise ConversionError("Generated tile contains undecodable frames")
    return video


def cache_directory():
    override = os.environ.get("PHOTO_GALLERY_STILL_CACHE_DIR")
    return Path(override) if override else Path.home() / ".selects" / "plugin-data" / "photo-gallery-no2" / "stills-v1"


def encode(source, target, frames):
    # Scale only downward with preserved aspect ratio; pad the last odd pixel.
    # The black padding is at most one pixel per axis and avoids stretching.
    video_filter = (
        f"scale=w='min(iw,{MAX_EDGE})':h='min(ih,{MAX_EDGE})':"
        "force_original_aspect_ratio=decrease:flags=lanczos,"
        "pad=ceil(iw/2)*2:ceil(ih/2)*2:0:0:black,setsar=1"
    )
    command = ["ffmpeg", "-nostdin", "-v", "error", "-y", "-framerate", str(FPS),
               "-loop", "1", "-i", str(source), "-vf", video_filter, "-an", "-frames:v", str(frames),
               "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
               "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-metadata", "creation_time=",
               "-f", "mp4", str(target)]
    result = run(command, timeout=max(90, min(900, frames // FPS * 8 + 60)))
    if result.returncode:
        raise ConversionError("ffmpeg could not encode the image as a tile video")


def valid_cache(video_path, metadata_path, source_hash, frames, dimensions):
    if not video_path.is_file() or not metadata_path.is_file():
        return False
    try:
        data = json.loads(metadata_path.read_text())
        if (data.get("algorithm") != ALGORITHM or data.get("sourceSha256") != source_hash
                or data.get("durationFrames") != frames or tuple(data.get("outputDimensions", ())) != dimensions
                or data.get("outputSha256") != digest_file(video_path)):
            return False
        validate_output(video_path, frames, dimensions)
        return True
    except (OSError, ValueError, TypeError, ConversionError):
        return False


def convert_one(source, source_hash, source_dimensions, frames, cache_root):
    key = hashlib.sha256(f"{ALGORITHM}\0{source_hash}\0{frames}\0{FPS}".encode()).hexdigest()
    video_path = cache_root / f"{key}.mp4"
    metadata_path = cache_root / f"{key}.json"
    lock_path = cache_root / f"{key}.lock"
    dimensions = expected_dimensions(*source_dimensions)
    with lock_path.open("a+b") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if valid_cache(video_path, metadata_path, source_hash, frames, dimensions):
            return video_path, dimensions, True
        descriptor, temp_name = tempfile.mkstemp(prefix=f".{key}-", suffix=".mp4.tmp", dir=cache_root)
        os.close(descriptor)
        temporary = Path(temp_name)
        try:
            before = digest_file(source)
            if before != source_hash:
                raise ConversionError("An image changed during conversion")
            encode(source, temporary, frames)
            if digest_file(source) != source_hash:
                raise ConversionError("An image changed during conversion")
            validate_output(temporary, frames, dimensions, decode=True)
            output_hash = digest_file(temporary)
            metadata = {"algorithm": ALGORITHM, "sourceSha256": source_hash,
                        "durationFrames": frames, "outputDimensions": dimensions, "outputSha256": output_hash}
            meta_descriptor, meta_name = tempfile.mkstemp(prefix=f".{key}-", suffix=".json.tmp", dir=cache_root)
            os.close(meta_descriptor)
            temporary_meta = Path(meta_name)
            try:
                temporary_meta.write_text(json.dumps(metadata, sort_keys=True))
                os.replace(temporary, video_path)
                os.replace(temporary_meta, metadata_path)
            finally:
                temporary_meta.unlink(missing_ok=True)
        finally:
            temporary.unlink(missing_ok=True)
    return video_path, dimensions, False


def convert(request):
    if not isinstance(request, dict):
        raise ConversionError("Request must be a JSON object")
    images = request.get("images")
    frames = request.get("durationFrames")
    if not isinstance(images, list) or not 1 <= len(images) <= MAX_IMAGES:
        raise ConversionError("Provide between 1 and 21 images")
    if type(frames) is not int or not 1 <= frames <= MAX_FRAMES:
        raise ConversionError("durationFrames must be a positive integer at most 36000")
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise ConversionError("ffmpeg and ffprobe are required")
    cache_root = cache_directory()
    cache_root.mkdir(parents=True, exist_ok=True)
    completed = {}
    output = []
    for index, image in enumerate(images):
        if not isinstance(image, dict) or not isinstance(image.get("path"), str):
            raise ConversionError(f"Image {index + 1} needs a file path")
        raw_path = image["path"]
        if not raw_path or "\0" in raw_path or len(raw_path) > 8192:
            raise ConversionError(f"Image {index + 1} has an invalid path")
        try:
            source = Path(raw_path).resolve(strict=True)
        except OSError as error:
            raise ConversionError(f"Image {index + 1} is missing") from error
        if not source.is_file():
            raise ConversionError(f"Image {index + 1} is not a file")
        try:
            source_hash = digest_file(source)
            if source_hash not in completed:
                picture, _ = probe(source)
                source_dimensions = (picture["width"], picture["height"])
                video_path, output_dimensions, reused = convert_one(source, source_hash, source_dimensions, frames, cache_root)
                completed[source_hash] = (video_path, source_dimensions, output_dimensions, reused)
            video_path, source_dimensions, output_dimensions, reused = completed[source_hash]
        except (OSError, ConversionError) as error:
            raise ConversionError(f"Image {index + 1}: {error}") from error
        output.append({"inputIndex": index, "sourcePath": raw_path, "sourceSha256": source_hash,
                       "outputPath": str(video_path), "sourceWidth": source_dimensions[0],
                       "sourceHeight": source_dimensions[1], "outputWidth": output_dimensions[0],
                       "outputHeight": output_dimensions[1], "cacheHit": reused})
    return {"status": "converted", "fps": FPS, "durationFrames": frames, "images": output}


def main():
    try:
        raw = sys.stdin.buffer.read(1024 * 1024 + 1)
        if len(raw) > 1024 * 1024:
            raise ConversionError("Request is too large")
        result = convert(json.loads(raw))
        print(json.dumps(result))
    except (ConversionError, ValueError, UnicodeDecodeError) as error:
        print(json.dumps({"status": "error", "message": str(error)}))
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
