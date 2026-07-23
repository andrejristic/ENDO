/**
 * Guardian extension scanner (PSE_IDE_SCANNER.txt). Static analysis of an unpacked
 * .vsix -> a privacy label. Two outputs kept separate: DISCLOSURE (who receives data,
 * neutral) and RISK FLAGS (severity). Never claims "clean"; obfuscation is itself a
 * red flag. The caller (main process) unzips the .vsix and passes contents here so
 * this module stays dependency-free.
 */
import { RISK_ELEVATED_T, RISK_CRITICAL_T } from './constants';

export interface ExtensionBundle {
  packageJson: any;
  /** filename -> source text, for all .js/.json in the package. */
  files: Record<string, string>;
}

export type RiskLevel = 'BENIGN' | 'ELEVATED' | 'CRITICAL';

export interface PrivacyLabel {
  id: string;
  displayName: string;
  category: string[];
  level: RiskLevel;
  disclosure: string[];   // named third parties + unknown egress domains
  canSee: string[];
  canDo: string[];
  redFlags: string[];
  confidence: 'high' | 'reduced'; // reduced when minified/native
  reasons: string[];      // why this level
}

// --- Catalog A: named recipients (disclosure) ---
const VENDORS: Array<[RegExp, string]> = [
  [/@vscode\/extension-telemetry|applicationinsights|dc\.services\.visualstudio\.com/i, 'Microsoft (App Insights)'],
  [/@sentry\/|ingest\.sentry\.io/i, 'Sentry'],
  [/analytics-node|@segment\/|api\.segment\.io/i, 'Segment (Twilio)'],
  [/posthog|app\.posthog\.com/i, 'PostHog'],
  [/mixpanel|api\.mixpanel\.com/i, 'Mixpanel'],
  [/@amplitude\/|amplitude\.com/i, 'Amplitude'],
  [/google-analytics\.com|analytics\.google\.com|gtag/i, 'Google'],
];

const URL_RE = /https?:\/\/([a-z0-9.-]+)/gi;

// --- Catalogs B/C/D: capability / action / meta patterns ---
const SEE = {
  keystroke: /onDidChangeTextDocument|activeTextEditor\.document\.getText/,
  clipboard: /env\.clipboard/,
  terminal: /createTerminal|onDidWriteTerminalData/,
  files: /\bfs\.(readFile|readFileSync)|workspace\.fs/,
  env: /process\.env|readFileSync\([^)]*\.env/,
  creds: /\.ssh|id_rsa|\.aws\/credentials|\.npmrc|\.git\/config|credentials/i,
  secrets: /context\.secrets|keytar/,
};
const DO = {
  shell: /child_process|execSync|\bspawn\(|\bexec\(/,
  download: /https?\.request|axios|fetch\(|node-fetch|got\(/,
  installScript: /"(pre|post)?install"\s*:/,
  native: /\.node['"]|require\(['"][^'"]+\.node/,
};
const META = {
  evalDynamic: /\beval\(|new Function\(|require\(['"]vm['"]\)/,
  obfuscation: /_0x[0-9a-f]{4,}|String\.fromCharCode\((?:\s*\d+\s*,){5,}|\\x[0-9a-f]{2}(?:\\x[0-9a-f]{2}){10,}/i,
};

// Raw weighted sum against RISK_* thresholds (NOT normalized by the full basket —
// that dilutes real combos). A single unknown-egress hit already reaches ELEVATED,
// per PSE_IDE_SCANNER.txt §2.
const WEIGHTS: Record<string, number> = {
  unknown_egress: 0.35, keystroke_plus_egress: 0.35, env: 0.10, creds: 0.40,
  secrets: 0.15, shell: 0.15, remote_loader: 0.40, install_script: 0.15,
  native: 0.10, eval_dynamic: 0.35, obfuscation: 0.35, minified: 0.10,
  repo_missing: 0.10, category_mismatch: 0.15,
};

function anyMatch(files: Record<string, string>, re: RegExp): boolean {
  for (const src of Object.values(files)) if (re.test(src)) return true;
  return false;
}

export function scanExtension(bundle: ExtensionBundle): PrivacyLabel {
  const pkg = bundle.packageJson || {};
  const files = bundle.files || {};
  const allSrc = Object.values(files).join('\n');
  const ownDomains: string[] = [pkg.repository, pkg.homepage, pkg.publisher]
    .filter(Boolean).map((s: string) => String(s).toLowerCase());

  // --- disclosure ---
  const disclosure = new Set<string>();
  for (const [re, name] of VENDORS) if (re.test(allSrc)) disclosure.add(name);
  const unknownEgress = new Set<string>();
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(allSrc))) {
    const host = m[1].toLowerCase();
    if (host.endsWith('.local') || host === 'localhost') continue;
    const known = [...disclosure].some((d) => host.includes(d.split(' ')[0].toLowerCase()))
      || ownDomains.some((d) => d.includes(host) || host.includes(d));
    if (!known) unknownEgress.add(host);
  }

  const hits = new Set<string>();
  const canSee: string[] = [];
  const canDo: string[] = [];
  const redFlags: string[] = [];

  const hasNetwork = anyMatch(files, DO.download) || unknownEgress.size > 0 || disclosure.size > 0;

  if (anyMatch(files, SEE.keystroke)) { canSee.push('what you type'); if (hasNetwork) hits.add('keystroke_plus_egress'); }
  if (anyMatch(files, SEE.clipboard)) canSee.push('clipboard');
  if (anyMatch(files, SEE.terminal)) canSee.push('terminal I/O');
  if (anyMatch(files, SEE.files)) canSee.push('files on disk');
  if (anyMatch(files, SEE.env)) { canSee.push('env vars'); hits.add('env'); }
  if (anyMatch(files, SEE.secrets)) { canSee.push('stored secrets'); hits.add('secrets'); }
  if (anyMatch(files, SEE.creds)) { canSee.push('credential files (~/.ssh, .aws, .npmrc)'); hits.add('creds'); }

  if (anyMatch(files, DO.shell)) { canDo.push('run shell commands'); hits.add('shell'); }
  if (anyMatch(files, DO.shell) && anyMatch(files, DO.download)) hits.add('remote_loader');
  if (META.evalDynamic.test(allSrc)) { canDo.push('run code built at runtime'); hits.add('eval_dynamic'); }
  if (DO.installScript.test(JSON.stringify(pkg.scripts || {}))) { redFlags.push('runs an install script'); hits.add('install_script'); }
  if (anyMatch(files, DO.native)) { redFlags.push('bundled native binary (cannot fully inspect)'); hits.add('native'); }

  if (META.obfuscation.test(allSrc)) { redFlags.push('obfuscated code'); hits.add('obfuscation'); }
  const minified = Object.entries(files).some(([n, s]) => n.endsWith('.js') && s.length > 2000 && s.split('\n').length < 5);
  if (minified) { redFlags.push('minified (verification reduced)'); hits.add('minified'); }
  if (!pkg.repository) { redFlags.push('no repository link'); hits.add('repo_missing'); }
  if (unknownEgress.size) { hits.add('unknown_egress'); for (const h of unknownEgress) disclosure.add(`${h} (unrecognized)`); }

  // category-fit: capability far exceeds declared purpose
  const cats: string[] = pkg.categories || [];
  const isThemeOrSnippet = cats.some((c) => /theme|snippet|language pack/i.test(c));
  if (isThemeOrSnippet && (hits.has('keystroke_plus_egress') || hits.has('shell') || hits.has('creds'))) {
    hits.add('category_mismatch');
    redFlags.push(`a ${cats.join('/')} should not need those capabilities`);
  }

  // --- rollup ---
  const HARD =
    (hits.has('creds') && hasNetwork) ||
    hits.has('remote_loader') ||
    (hits.has('obfuscation') && hits.has('eval_dynamic'));

  let level: RiskLevel;
  const reasons: string[] = [];
  if (HARD) {
    level = 'CRITICAL';
    if (hits.has('creds') && hasNetwork) reasons.push('reads credentials and can send data out');
    if (hits.has('remote_loader')) reasons.push('downloads and runs code');
    if (hits.has('obfuscation') && hits.has('eval_dynamic')) reasons.push('obfuscated code that eval()s');
  } else {
    const score = Math.min([...hits].reduce((a, h) => a + (WEIGHTS[h] || 0), 0), 1);
    level = score >= RISK_CRITICAL_T ? 'CRITICAL' : score >= RISK_ELEVATED_T ? 'ELEVATED' : 'BENIGN';
    reasons.push(`risk score ${score.toFixed(2)}`);
  }

  return {
    id: `${pkg.publisher || 'unknown'}.${pkg.name || 'ext'}`,
    displayName: pkg.displayName || pkg.name || 'extension',
    category: cats,
    level,
    disclosure: [...disclosure],
    canSee, canDo, redFlags,
    confidence: minified || hits.has('native') ? 'reduced' : 'high',
    reasons,
  };
}
