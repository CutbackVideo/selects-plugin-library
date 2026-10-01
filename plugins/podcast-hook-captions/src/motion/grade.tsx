import React from "react";

// Colour grade as one SVG filter: saturation, warm channel gains, then a contrast line that crushes the
// blacks and lifts the highlights. Reference vs its own source (BEFORE window): R-B +10 -> +35..42,
// saturation x2.2, 5th-percentile luma 12 -> 2, 95th 158 -> 175, mean unchanged.
export type Grade = { sat: number; r: number; g: number; b: number; slope: number; off: number };
export const SPEAKER_GRADE: Grade = { sat: 1.6, r: 1.07, g: 1.0, b: 0.89, slope: 1.1, off: -0.035 };
export const BROLL_GRADE: Grade = { sat: 1.2, r: 1.06, g: 1.0, b: 0.9, slope: 1.08, off: -0.02 };

function matrix(g: Grade): string {
  const s = g.sat;
  const lr = 0.2126;
  const lg = 0.7152;
  const lb = 0.0722;
  const rows = [
    [lr + (1 - lr) * s, lg - lg * s, lb - lb * s],
    [lr - lr * s, lg + (1 - lg) * s, lb - lb * s],
    [lr - lr * s, lg - lg * s, lb + (1 - lb) * s],
  ];
  const gain = [g.r, g.g, g.b];
  return rows
    .map((row, i) => row.map((v) => (v * gain[i]).toFixed(4)).join(" ") + " 0 0")
    .concat(["0 0 0 1 0"])
    .join(" ");
}

export function GradeFilter({ id, grade }: { id: string; grade: Grade }) {
  return (
    <filter id={id} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values={matrix(grade)} />
      <feComponentTransfer>
        <feFuncR type="linear" slope={grade.slope} intercept={grade.off} />
        <feFuncG type="linear" slope={grade.slope} intercept={grade.off} />
        <feFuncB type="linear" slope={grade.slope} intercept={grade.off} />
      </feComponentTransfer>
    </filter>
  );
}
