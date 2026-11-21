import { describe, it, expect } from 'vitest';
import { expandBodyPaths, isPlainRecord } from '@/services/integration-service/execution/body-paths';
import { ValidationError } from '@/core/errors';

describe('expandBodyPaths', () => {
  it('copies keys that are not paths as they are', () => {
    expect(expandBodyPaths({ subject: 'New', priority: 2 })).toEqual({ subject: 'New', priority: 2 });
  });

  it('nests a dotted key', () => {
    expect(expandBodyPaths({ 'fields.summary': 'x', 'fields.project.key': 'APPS' })).toEqual({
      fields: { summary: 'x', project: { key: 'APPS' } },
    });
  });

  it('leaves nested values untouched', () => {
    const nested = { 'a.b': 1 };
    expect(expandBodyPaths({ data: nested })).toEqual({ data: { 'a.b': 1 } });
  });

  it('addresses an array item by index and fills the gaps', () => {
    expect(expandBodyPaths({ 'items[1].name': 'second' })).toEqual({ items: [{}, { name: 'second' }] });
  });

  it('assigns a value to an indexed last segment', () => {
    expect(expandBodyPaths({ 'tags[0]': 'a', 'tags[1]': 'b' })).toEqual({ tags: ['a', 'b'] });
  });

  it('applies a wildcard path to every existing item', () => {
    expect(expandBodyPaths({ 'items[0].id': 1, 'items[1].id': 2, 'items[*].active': true })).toEqual({
      items: [{ id: 1, active: true }, { id: 2, active: true }],
    });
  });

  it('creates one item for a wildcard path on a missing array', () => {
    expect(expandBodyPaths({ 'items[*].name': 'x' })).toEqual({ items: [{ name: 'x' }] });
  });

  it('replaces the list when a wildcard key holds an array', () => {
    expect(expandBodyPaths({ 'items[*]': [{ id: 1 }] })).toEqual({ items: [{ id: 1 }] });
  });

  it('merges an object given for a wildcard key into every item', () => {
    expect(expandBodyPaths({ 'items[0].id': 1, 'items[*]': { meta: { seen: true } } })).toEqual({
      items: [{ id: 1, meta: { seen: true } }],
    });
  });

  it.each(['__proto__.polluted', 'a.constructor.b', 'prototype.x'])('rejects the reserved path %s', (key) => {
    expect(() => expandBodyPaths({ [key]: true })).toThrow(ValidationError);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('returns a body without path keys untouched', () => {
    const body = { constructor: 'x', prototype: 'y', nested: { 'a.b': 1 } };
    expect(expandBodyPaths(body)).toBe(body);
  });

  it('keeps a reserved name that is not a path as an ordinary field next to a path key', () => {
    const body = JSON.parse('{"__proto__":"x","constructor":"y","a.b":1}') as Record<string, unknown>;
    const expanded = expandBodyPaths(body);
    expect(JSON.stringify(expanded)).toBe('{"__proto__":"x","constructor":"y","a":{"b":1}}');
    expect(Object.getPrototypeOf(expanded)).toBe(Object.prototype);
  });
});

describe('isPlainRecord', () => {
  it.each([
    [{}, true],
    [Object.create(null), true],
    [[], false],
    [null, false],
    ['text', false],
    [new Uint8Array(1), false],
    [new Date(0), false],
  ])('classifies %o as %s', (value, expected) => {
    expect(isPlainRecord(value)).toBe(expected);
  });
});
