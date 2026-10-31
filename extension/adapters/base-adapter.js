class BaseAdapter {
  constructor(name) {
    this.name = name;
  }

  detectPlatform() {
    return false;
  }

  detectEditor() {
    return null;
  }

  getCode() {
    return '';
  }

  getLanguage() {
    return 'python';
  }

  getProblemContext() {
    return { title: '', description: '', constraints: '' };
  }

  subscribeToChanges(_callback) {
    return null;
  }

  applyDiagnostics(_diagnostics) {
    return;
  }

  clearDiagnostics() {
    return;
  }
}

window.CodeSenseBaseAdapter = BaseAdapter;
