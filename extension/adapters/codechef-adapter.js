class CodeChefAdapter extends window.CodeSenseBaseAdapter {
  constructor() { super('codechef'); }
  detectPlatform() { return /codechef\.com/i.test(window.location.hostname); }
  detectEditor() { return document.querySelector('.CodeMirror') || document.querySelector('textarea'); }
  getCode() { const editor = this.detectEditor(); return editor && editor.value ? editor.value : ''; }
  getLanguage() { return 'cpp'; }
  getProblemContext() { return { title: document.title || '', description: document.body.innerText || '', constraints: '' }; }
}
window.CodeSenseCodeChefAdapter = CodeChefAdapter;
