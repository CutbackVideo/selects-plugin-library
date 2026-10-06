declare const __EO_PLUGIN_VERSION__: string | undefined;

export const PLUGIN_ID = "eo-shorts";
export const PLUGIN_VERSION: string = typeof __EO_PLUGIN_VERSION__ === "string" ? __EO_PLUGIN_VERSION__ : "0.0.0";
