"""Bounded local BPM suggestion. Ambiguous/silent input yields no BPM."""

import array
import json
import math
import subprocess
import sys

SAMPLE_RATE = 11025
HOP = 110  # ~10 ms; no dependency beyond the Selects host's ffmpeg.
MIN_BPM = 70
MAX_BPM = 180


def decode_mono(path):
    result = subprocess.run(
        ["ffmpeg", "-nostdin", "-v", "error", "-t", "30", "-i", path,
         "-vn", "-ac", "1", "-ar", str(SAMPLE_RATE), "-f", "s16le", "-"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=45,
    )
    if result.returncode != 0:
        raise ValueError("Audio could not be decoded")
    samples = array.array("h")
    samples.frombytes(result.stdout[:len(result.stdout) // 2 * 2])
    return samples


def estimate(samples):
    if len(samples) < SAMPLE_RATE * 6:
        return {"status": "uncertain", "reason": "At least six seconds of audio are needed"}
    energy = []
    for start in range(0, len(samples) - HOP + 1, HOP):
        chunk = samples[start:start + HOP]
        energy.append(math.sqrt(sum(value * value for value in chunk) / HOP))
    onset = [max(0, energy[i] - energy[i - 1]) for i in range(1, len(energy))]
    power = sum(value * value for value in onset)
    if power < 1:
        return {"status": "uncertain", "reason": "No detectable rhythmic audio"}
    lower_lag = round(60 * SAMPLE_RATE / (MAX_BPM * HOP))
    upper_lag = round(60 * SAMPLE_RATE / (MIN_BPM * HOP))
    correlations = {}
    for lag in range(lower_lag, upper_lag + 1):
        bpm = 60 * SAMPLE_RATE / (lag * HOP)
        if not MIN_BPM <= bpm <= MAX_BPM:
            continue
        numerator = sum(a * b for a, b in zip(onset[:-lag], onset[lag:]))
        left = sum(value * value for value in onset[:-lag])
        right = sum(value * value for value in onset[lag:])
        correlation = numerator / math.sqrt(left * right) if left > 0 and right > 0 else 0
        correlations[lag] = correlation
    scores = []
    for lag, correlation in correlations.items():
        bpm = 60 * SAMPLE_RATE / (lag * HOP)
        scores.append((correlation, bpm, lag))
    scores.sort(reverse=True)
    best = scores[0]
    def unrelated(lag):
        if abs(lag - best[2]) <= 4:
            return False
        # A doubled interval repeats the same pulse; it is not independent
        # evidence for a different tempo. Keep the shorter direct interval.
        return abs(lag - 2 * best[2]) > 1 and abs(best[2] - 2 * lag) > 1
    runner_up = max((entry[0] for entry in scores if unrelated(entry[2])), default=0)
    if best[0] < 0.12 or best[0] < runner_up * 1.08:
        return {"status": "uncertain", "reason": "Tempo is ambiguous; enter BPM manually"}
    return {"status": "estimated", "bpm": round(best[1], 1)}


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: tempo.py <audio file>")
    try:
        print(json.dumps(estimate(decode_mono(sys.argv[1]))))
    except (ValueError, subprocess.TimeoutExpired) as error:
        print(json.dumps({"status": "uncertain", "reason": str(error)}))


if __name__ == "__main__":
    main()
