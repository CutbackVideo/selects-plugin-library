# Template text runtime

This owner contains the identical language, message lookup, plural/interpolation,
number formatting and field-width mechanics used by Archive, Mini, City Weekend,
Selfie Aesthetic, Summer Trip, THE END and Torn Paper Love.

Input is each independently installed panel's STRINGS table, ten fixed supported
language codes, current context/browser language, key and string/number variables,
or text and width limit. STRINGS is an explicit per-panel dependency; no dictionary
or browser state is cached across panels. uiLang is called on each render and
prefers supported context language, then navigator language, then English.

Only own dictionary entries are messages. Unknown required keys return the key;
unknown optional keys return their caller-supplied label. Locale messages retain
English fallback. Plural selection and numeric formatting retain their existing
locale policy. Only own variables count as interpolation input; absent variables
keep the placeholder. Explicit own constructor/toString messages or variables
remain valid. This is dictionary admission, not a security-isolation claim.

fieldLen/fieldClip preserve the existing code-point policy: selected BMP wide
ranges count two, other code points one. This does not introduce grapheme counting
or a new font/layout policy. The shared block includes fieldClip for all consumers;
only Archive and Mini currently call it.

Outputs are synchronous strings/counts. There are no writes, timers, retries,
media processes or cleanup resources. Browser language is read only when needed.
The existing module generator embeds template-text.ts in seven panels. It adds no
public SDK or runtime import dependency. Template dictionaries, error wording,
template-specific error mapping and developer dictionary checkers remain local.
