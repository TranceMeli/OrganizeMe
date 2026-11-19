import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// Monaco asks MonacoEnvironment for a worker per language. Without it, every editor logs two
// warnings and runs the worker code on the main thread, which can freeze the page.
// Each language needs its own worker: handing every language the base editor worker makes the
// JavaScript and TypeScript features fail with "Missing requestHandler" errors.
// The workers are separate files that load only when a snippet in that language is opened.
self.MonacoEnvironment = {
  getWorker(_id, label) {
    switch (label) {
      case 'json': return new JsonWorker()
      case 'css': case 'scss': case 'less': return new CssWorker()
      case 'html': case 'handlebars': case 'razor': return new HtmlWorker()
      case 'typescript': case 'javascript': return new TsWorker()
      default: return new EditorWorker()
    }
  }
}
