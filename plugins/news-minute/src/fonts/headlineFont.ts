// The preset's headline face when it is installed on this computer. The panel tries each name with CSS
// local() (full or PostScript name, the same lookup the graphic makes when it renders), and the headline
// graphic then declares "NM Headline" over the first one found. Nothing of the font is copied into the Draft.

export const HEADLINE_FAMILY = "NM Headline";

// Faces every supported system has, to tell "not installed" apart from "local() does not work here".
const CONTROLS = ["AppleSDGothicNeo-Bold", "Apple SD Gothic Neo Bold", "MalgunGothicBold", "Malgun Gothic Bold", "Arial"];

export type HeadlineFont =
  | { kind: "installed"; name: string; params: { fontFamily: string; fontCss: string; fontLoads: string[] } }
  | { kind: "missing"; tried: string[] }
  | { kind: "unavailable"; tried: string[]; reason: string };

// CSS string literal for a font name (quotes and backslashes escaped).
const cssString = (s: string) => '"' + s.replace(/[\\"]/g, (c) => "\\" + c) + '"';

export function headlineFontParams(name: string) {
  return {
    fontFamily: HEADLINE_FAMILY,
    // One weight range so the template's 900 uses the face as it is, with no synthetic bold.
    fontCss: "@font-face{font-family:" + cssString(HEADLINE_FAMILY) + ";src:local(" + cssString(name) + ");font-weight:100 900;}",
    fontLoads: ['900 96px "' + HEADLINE_FAMILY + '"'],
  };
}

type Probe = (name: string) => Promise<boolean>;

// FontFace.load() rejects when local() finds no such face.
const browserProbe: Probe = async (name) => {
  const face = new FontFace("NM Headline Probe", "local(" + cssString(name) + ")");
  try {
    await face.load();
    return true;
  } catch {
    return false;
  }
};

export async function findHeadlineFont(names: string[] | undefined, probe: Probe = browserProbe): Promise<HeadlineFont | null> {
  if (!names?.length) return null;
  try {
    for (const name of names) if (await probe(name)) return { kind: "installed", name, params: headlineFontParams(name) };
    for (const name of CONTROLS) if (await probe(name)) return { kind: "missing", tried: names };
    return { kind: "unavailable", tried: names, reason: "no system face found either" };
  } catch (e: any) {
    return { kind: "unavailable", tried: names, reason: String(e?.message || e) };
  }
}

// One line for the run record.
export function headlineFontNote(f: HeadlineFont | null): string {
  if (!f) return "headline font: embedded Pretendard (preset names none)";
  if (f.kind === "installed") return "headline font: installed " + f.name;
  if (f.kind === "missing") return "headline font: embedded Pretendard (not installed: " + f.tried.join(", ") + ")";
  return "headline font: embedded Pretendard (could not check installed fonts: " + f.reason + ")";
}
