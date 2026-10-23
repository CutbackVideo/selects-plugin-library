import React from 'react';
import { useVideoConfig } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// Per-scene notice under the logo block, placed only over scenes that show illustrative imagery.
// The sentence itself comes from the preset.
export default function Disclaimer({ data }) {
  const { width } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const text = String(data?.text ?? '');
  if (!text) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: Number(data?.top ?? 1672) * k, height: 50 * k, display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
      <div style={{ fontFamily, fontWeight: 300, fontSize: Number(data?.fontSize ?? 35) * k, color: String(data?.color ?? '#FFFFFF'), whiteSpace: 'nowrap' }}>{text}</div>
    </div>
  );
}
