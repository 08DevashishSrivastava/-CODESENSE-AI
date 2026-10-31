class CodeforcesAdapter extends window.CodeSenseBaseAdapter {
  constructor() { super('codeforces'); }
  detectPlatform() { return /codeforces\.com/i.test(window.location.hostname); }
  detectEditor() { return document.querySelector('.CodeMirror') || document.querySelector('textarea'); }
  getCode() { const editor = this.detectEditor(); return editor && editor.value ? editor.value : ''; }
  getLanguage() { return 'cpp'; }
  getProblemContext() { return { title: document.title || '', description: document.body.innerText || '', constraints: '' }; }
}
window.CodeSenseCodeforcesAdapter = CodeforcesAdapter;
