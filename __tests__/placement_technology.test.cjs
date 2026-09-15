const fs = require('node:fs');
const path = require('path');

let createCONFIG;
let createConfigJson;
let buildConfigEntry;
let buildDeprecatedEntry;
let createHTML;

describe('convert.js config helpers', () => {
  beforeAll(async () => {
    const module = await import('../convert.js');
    createCONFIG = module.createCONFIG;
    createConfigJson = module.createConfigJson;
    buildConfigEntry = module.buildConfigEntry;
    buildDeprecatedEntry = module.buildDeprecatedEntry;
    createHTML = module.createHTML;
  });

  
  test('buildConfigEntry Quadrant UI Ring ADOPT', () => {
    const tomlAsJson = {
      config: {
        quadrant: 'UI',
        ring: 'ADOPT',
        label: 'UI5',
        active: true,
        moved: 0
      }
    };

    const entry = buildConfigEntry(tomlAsJson, 'ui5');

    expect(entry).toEqual({
      quadrant: 2,
      ring: 0,
      label: 'UI5',
      active: true,
      moved: 0,
      link: './html/ui5.html'
    });
  });

  test('buildConfigEntry Quadrant UI Ring USE', () => {
    const tomlAsJson = {
      config: {
        quadrant: 'UI',
        ring: 'USE',
        label: 'UI5',
        active: true,
        moved: 0
      }
    };

    const entry = buildConfigEntry(tomlAsJson, 'ui5');

    expect(entry).toEqual({
      quadrant: 2,
      ring: 1,
      label: 'UI5',
      active: true,
      moved: 0,
      link: './html/ui5.html'
    });
  });

  test('buildConfigEntry Quadrant UI Ring HOLD', () => {
  const tomlAsJson = {
    config: {
      quadrant: 'UI',
      ring: 'HOLD',
      label: 'UI5',
      active: true,
      moved: 0
    }
  };

  const entry = buildConfigEntry(tomlAsJson, 'ui5');

  expect(entry).toEqual({
    quadrant: 2,
    ring: 2,
    label: 'UI5',
    active: true,
    moved: 0,
    link: './html/ui5.html'
  });
  });

  test('buildConfigEntry Quadrant UI Ring STOP', () => {
    const tomlAsJson = {
      config: {
        quadrant: 'UI',
        ring: 'STOP',
        label: 'UI5',
        active: true,
        moved: 0
      }
    };

    const entry = buildConfigEntry(tomlAsJson, 'ui5');

    expect(entry).toEqual({
      quadrant: 2,
      ring: 3,
      label: 'UI5',
      active: true,
      moved: 0,
      link: './html/ui5.html'
    });
  });

  
});
