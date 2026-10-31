class CodeSenseAdapterRegistry {
  constructor() {
    this.adapters = [
      new window.CodeSenseLeetCodeAdapter(),
      new window.CodeSenseGFGAdapter(),
      new window.CodeSenseHackerRankAdapter(),
      new window.CodeSenseCodeChefAdapter(),
      new window.CodeSenseCodeforcesAdapter(),
    ];
  }

  getCurrentAdapter() {
    return this.adapters.find((adapter) => adapter.detectPlatform()) || this.adapters[0];
  }
}

window.CodeSenseAdapterRegistry = new CodeSenseAdapterRegistry();
