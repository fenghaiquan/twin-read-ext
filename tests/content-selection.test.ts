// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_CONTEXT_LENGTH,
  MAX_SELECTION_LENGTH,
  extractContext,
  findContextElement,
  truncateText,
} from '../src/content/selection';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('findContextElement', () => {
  it('walks up from a text node to the nearest block-level ancestor', () => {
    document.body.innerHTML =
      '<li id="item"><span>Apple <em>announced</em> a MacBook</span></li>';
    const anchor = document.querySelector('#item em')?.firstChild ?? null;
    expect(findContextElement(anchor, document.body)?.id).toBe('item');
  });

  it('returns null when no block ancestor exists before the boundary', () => {
    document.body.innerHTML = 'just a loose text node';
    const anchor = document.body.firstChild;
    expect(findContextElement(anchor, document.body)).toBeNull();
  });

  it('stops at the boundary without inspecting it', () => {
    document.body.innerHTML = '<div id="outer"><p id="inner">text</p></div>';
    const anchor = document.querySelector('#inner')?.firstChild ?? null;
    expect(findContextElement(anchor, document.body)?.id).toBe('inner');
  });
});

describe('extractContext', () => {
  it('normalizes whitespace of the surrounding paragraph', () => {
    document.body.innerHTML = '<p id="para">Apple   announced\na   new MacBook.</p>';
    const anchor = document.querySelector('#para')?.firstChild ?? null;
    expect(extractContext(anchor, document.body)).toBe('Apple announced a new MacBook.');
  });

  it('falls back to the parent element when no block ancestor matches', () => {
    document.body.innerHTML = '<div id="fallback"><span id="s">plain words</span></div>';
    const anchor = document.querySelector('#s')?.firstChild ?? null;
    expect(extractContext(anchor, document.body)).toBe('plain words');
  });

  it('caps long context text with an ellipsis', () => {
    document.body.innerHTML = `<p id="para">${'word '.repeat(600)}</p>`;
    const anchor = document.querySelector('#para')?.firstChild ?? null;
    const context = extractContext(anchor, document.body);
    expect(context?.length).toBe(MAX_CONTEXT_LENGTH + 1); // + ellipsis char
    expect(context?.endsWith('…')).toBe(true);
  });
});

describe('truncateText', () => {
  it('keeps short text intact', () => {
    expect(truncateText('  hello   world  ', 100)).toBe('hello world');
  });

  it('truncates to the limit plus ellipsis', () => {
    expect(truncateText('a'.repeat(MAX_SELECTION_LENGTH + 50), MAX_SELECTION_LENGTH)).toBe(
      `${'a'.repeat(MAX_SELECTION_LENGTH)}…`,
    );
  });
});
