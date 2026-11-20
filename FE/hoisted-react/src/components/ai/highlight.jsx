import { parser } from '@lezer/javascript';
import { highlightCode, classHighlighter } from '@lezer/highlight';

/*
 * Tô màu cú pháp cho khối code trong câu trả lời của trợ lý — dùng chính parser Lezer mà CodeMirror
 * (trình soạn bài tập) đã kéo về, không thêm thư viện highlight thứ hai. Màu `tok-*` nằm trong index.css
 * (.code-hl), theo bảng màu của Code Window trên trang chủ.
 */
const DIALECT = {
  js: 'jsx', javascript: 'jsx', jsx: 'jsx', mjs: 'jsx', cjs: 'jsx', node: 'jsx', json: '',
  ts: 'ts', typescript: 'ts', tsx: 'jsx ts',
};
const parsers = new Map();
const parserFor = (dialect) => {
  if (!parsers.has(dialect)) parsers.set(dialect, dialect ? parser.configure({ dialect }) : parser);
  return parsers.get(dialect);
};

export const canHighlight = (lang) => Object.hasOwn(DIALECT, String(lang ?? '').toLowerCase());

/** Trả về mảng phần tử React (span có class tok-*, chuỗi thuần và '\n'); ngôn ngữ khác → null. */
export function highlightJs(code, lang) {
  const key = String(lang ?? '').toLowerCase();
  if (!canHighlight(key) || code.length > 20_000) return null;
  const out = [];
  let i = 0;
  highlightCode(
    code,
    parserFor(DIALECT[key]).parse(code),
    classHighlighter,
    (text, classes) => { out.push(classes ? <span key={i++} className={classes}>{text}</span> : text); },
    () => { out.push('\n'); },
  );
  return out;
}
