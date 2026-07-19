import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appCssPath = resolve(__dirname, './app.css');

describe('app.css global base layer', () => {
  it('defines a @layer base rule theming body and headings', () => {
    const source = readFileSync(appCssPath, 'utf-8');

    expect(source).toMatch(/@layer\s+base/);

    // body: butter background (via theme() token, an atmospheric
    // vignette layered on top), ink text, body font family
    const bodyRuleMatch = source.match(/body\s*\{([^}]*)\}/);
    expect(bodyRuleMatch, 'expected a `body { ... }` rule in app.css').not.toBeNull();
    const bodyRule = bodyRuleMatch![1];
    expect(bodyRule).toMatch(/colors\.butter/);
    expect(bodyRule).toMatch(/text-ink/);
    expect(bodyRule).toMatch(/font-body/);

    // h1, h2: display font
    const headingRuleMatch = source.match(/h1\s*,\s*h2\s*\{([^}]*)\}/);
    expect(headingRuleMatch, 'expected an `h1, h2 { ... }` rule in app.css').not.toBeNull();
    expect(headingRuleMatch![1]).toMatch(/font-display/);
  });
});
