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
  test('createConfigJson returns base config structure', () => {
    const configJson = createConfigJson();

    expect(configJson).toHaveProperty('date');
    expect(configJson).toHaveProperty('entries');
    expect(Array.isArray(configJson.entries)).toBe(true);
    expect(configJson.entries).toHaveLength(0);
  });

  test('buildConfigEntry maps TOML config correctly', () => {
    const tomlAsJson = {
      config: {
        quadrant: 'Tools',
        ring: 'USE',
        label: 'ADT',
        active: true,
        moved: 0
      }
    };

    const entry = buildConfigEntry(tomlAsJson, 'adt');

    expect(entry).toEqual({
      quadrant: 0,
      ring: 1,
      label: 'ADT',
      active: true,
      moved: 0,
      link: './html/adt.html'
    });
  });

  test('buildDeprecatedEntry returns a deprecated listing object', () => {
    const tomlAsJson = {
      config: {
        label: 'Legacy Tool',
        quadrant: 'UI',
        since: '2023',
        ring: 'DEPRECATED'
      }
    };

    const deprecatedItem = buildDeprecatedEntry(tomlAsJson, 'legacy-tool');

    expect(deprecatedItem).toEqual({
      title: 'Legacy Tool',
      quadrant: 'UI',
      since: '2023',
      link: './html/legacy-tool.html'
    });
  });

  test('createCONFIG appends config entries to state', () => {
    const state = {configJson: createConfigJson(), deprecatedList: []};
    const tomlAsJson = {
      config: {
        quadrant: 'Frameworks',
        ring: 'ADOPT',
        label: 'CAP Java',
        active: false,
        moved: 1
      }
    };

    const result = createCONFIG(tomlAsJson, 'capjava', state);

    expect(result).toBe(state);
    expect(state.configJson.entries).toHaveLength(1);
    expect(state.deprecatedList).toHaveLength(0);
    expect(state.configJson.entries[0].label).toBe('CAP Java');
  });

  test('createCONFIG appends deprecated items to state', () => {
    const state = {configJson: createConfigJson(), deprecatedList: []};
    const tomlAsJson = {
      config: {
        quadrant: 'Technology',
        ring: 'DEPRECATED',
        label: 'Old API',
        since: '2020'
      }
    };

    const result = createCONFIG(tomlAsJson, 'old-api', state);

    expect(result).toBe(state);
    expect(state.configJson.entries).toHaveLength(0);
    expect(state.deprecatedList).toHaveLength(1);
    expect(state.deprecatedList[0].title).toBe('Old API');
  });

  test('createHTML writes an HTML file with template replacements', () => {
    const filename = 'unittest-createhtml';
    const outputPath = path.join(process.cwd(), 'radar', 'html', `${filename}.html`);

    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    const tomlAsJson = {
      page: {
        title: 'Unit Test Title',
        description: 'Unit Test Description',
        reason: 'Unit Test Reason',
        support: 'Unit Test Support'
      },
      config: {
        quadrant: 'Tools',
        ring: 'USE',
        trend: 'positive'
      },
      links: {
        'Reference Link': 'https://example.com'
      }
    };

    createHTML(tomlAsJson, filename);

    expect(fs.existsSync(outputPath)).toBe(true);
    const output = fs.readFileSync(outputPath, 'utf8');

    expect(output).toContain('Unit Test Title');
    expect(output).toContain('Unit Test Description');
    expect(output).toContain('Unit Test Reason');
    expect(output).toContain('Unit Test Support');
    expect(output).toContain('https://example.com');
    expect(output).toContain('/bootstrap/graph-up-arrow.svg');
    expect(output).toContain('text-bg-primary');

    fs.unlinkSync(outputPath);
  });
});
