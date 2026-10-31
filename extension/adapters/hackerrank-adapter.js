class HackerRankAdapter extends window.CodeSenseBaseAdapter {
  constructor() { super('hackerrank'); }
  detectPlatform() { return /hackerrank\.com/i.test(window.location.hostname); }
  detectEditor() { return document.querySelector('.CodeMirror') || document.querySelector('textarea'); }
  getCode() { const editor = this.detectEditor(); return editor && editor.value ? editor.value : ''; }
  getLanguage() { return 'javascript'; }
  getProblemContext() { return { title: document.title || '', description: document.body.innerText || '', constraints: '' }; }
}
window.CodeSenseHackerRankAdapter = HackerRankAdapter;
