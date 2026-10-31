import { IPlatformAdapter } from './base-adapter';
import { LeetCodeAdapter } from './leetcode-adapter';
import { GFGAdapter } from './gfg-adapter';
import { HackerRankAdapter } from './hackerrank-adapter';
import { CodeChefAdapter } from './codechef-adapter';
import { CodeforcesAdapter } from './codeforces-adapter';

export function getPlatformAdapter(): IPlatformAdapter | null {
  const url = window.location.href;
  const adapters: IPlatformAdapter[] = [
    new LeetCodeAdapter(),
    new GFGAdapter(),
    new HackerRankAdapter(),
    new CodeChefAdapter(),
    new CodeforcesAdapter(),
  ];

  for (const adapter of adapters) {
    if (adapter.matchesUrl(url)) {
      return adapter;
    }
  }

  return null;
}
