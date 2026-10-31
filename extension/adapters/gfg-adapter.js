class GFGAdapter extends window.CodeSenseBaseAdapter {
  constructor() {
    super('geeksforgeeks');
  }

  detectPlatform() {
    return /geeksforgeeks\.org/i.test(window.location.hostname);
  }

  detectEditor() {
    return document.querySelector('.CodeMirror') || document.querySelector('textarea');
  }

  getCode() {
    const editor = this.detectEditor();
    return editor && editor.value ? editor.value : '';
  }

  getLanguage() {
    return 'python';
  }

  getProblemContext() {
    return { title: document.title || '', description: document.body.innerText || '', constraints: '' };
  }
}

window.CodeSenseGFGAdapter = GFGAdapter;
