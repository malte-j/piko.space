import css from "highlight.js/lib/languages/css";
import js from "highlight.js/lib/languages/javascript";
import latex from "highlight.js/lib/languages/latex";
import ts from "highlight.js/lib/languages/typescript";
import html from "highlight.js/lib/languages/xml";
import java from "highlight.js/lib/languages/java";
import go from "highlight.js/lib/languages/go";
import { lowlight } from "lowlight/lib/core";

lowlight.registerLanguage("css", css);
lowlight.registerLanguage("js", js);
lowlight.registerLanguage("latex", latex);
lowlight.registerLanguage("ts", ts);
lowlight.registerLanguage("html", html);
lowlight.registerLanguage("java", java);
lowlight.registerLanguage("go", go);

export default lowlight;
