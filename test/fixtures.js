/*!
 * Reference technologies used across the unit tests: one per quadrant
 * (UI/Technology/Tools/Frameworks), one per ring (ADOPT/USE/HOLD/STOP, via
 * the same four entries), plus one DEPRECATED entry - the minimal set that
 * still touches every quadrant and every ring at least once.
 *
 * Shaped exactly like what `load()` (js-toml) returns for a real
 * definitions/**\/*.toml file, so they can be fed directly into
 * convert.js/release-data.js's conversion functions.
 */
'use strict';

const REF_UI_ADOPT = {
  filename: 'ref-ui-adopt',
  data: {
    page: {
      title: 'Reference UI Adopt',
      description: 'Fixture technology for unit tests.',
      reason: 'Covers the UI quadrant / ADOPT ring combination.',
      support: 'Supported'
    },
    links: { Homepage: 'https://example.com/ui-adopt' },
    config: {
      label: 'RefUI',
      ring: 'ADOPT',
      quadrant: 'UI',
      active: true,
      moved: 0,
      trend: 'positive'
    }
  }
};

const REF_TECHNOLOGY_USE = {
  filename: 'ref-technology-use',
  data: {
    page: {
      title: 'Reference Technology Use',
      description: 'Fixture technology for unit tests.',
      reason: 'Covers the Technology quadrant / USE ring combination.',
      recommendation: 'Use this fixture to check the recommendation field is not overwritten by reason.',
      support: 'Supported'
    },
    links: { Homepage: 'https://example.com/technology-use' },
    config: {
      label: 'RefTech',
      ring: 'USE',
      quadrant: 'Technology',
      active: true,
      moved: 0,
      trend: 'stable',
      related: ['ref-ui-adopt']
    }
  }
};

const REF_TOOLS_HOLD = {
  filename: 'ref-tools-hold',
  data: {
    page: {
      title: 'Reference Tools Hold',
      description: 'Fixture technology for unit tests.',
      reason: 'Covers the Tools quadrant / HOLD ring combination.',
      support: 'Supported'
    },
    links: { Homepage: 'https://example.com/tools-hold' },
    config: {
      label: 'RefTools',
      ring: 'HOLD',
      quadrant: 'Tools',
      active: true,
      moved: 0,
      trend: 'negative'
    }
  }
};

const REF_FRAMEWORKS_STOP = {
  filename: 'ref-frameworks-stop',
  data: {
    page: {
      title: 'Reference Frameworks Stop',
      description: 'Fixture technology for unit tests.',
      reason: 'Covers the Frameworks quadrant / STOP ring combination.',
      support: 'Not supported'
    },
    links: { Homepage: 'https://example.com/frameworks-stop' },
    config: {
      label: 'RefFw',
      ring: 'STOP',
      quadrant: 'Frameworks',
      active: true,
      moved: 0,
      trend: 'negative'
    }
  }
};

const REF_DEPRECATED = {
  filename: 'ref-ui-deprecated',
  data: {
    page: {
      title: 'Reference UI Deprecated',
      description: 'Fixture technology for unit tests.',
      reason: 'Covers the DEPRECATED ring.',
      support: 'Superseded'
    },
    links: { Homepage: 'https://example.com/ui-deprecated' },
    config: {
      label: 'RefDep',
      ring: 'DEPRECATED',
      quadrant: 'UI',
      active: true,
      moved: 0,
      trend: 'stable',
      since: '2026-06'
    }
  }
};

// one per quadrant (UI/Technology/Tools/Frameworks) and per ring
// (ADOPT/USE/HOLD/STOP), plus the DEPRECATED reference
const FIXTURES = [REF_UI_ADOPT, REF_TECHNOLOGY_USE, REF_TOOLS_HOLD, REF_FRAMEWORKS_STOP, REF_DEPRECATED];

// lookup matching what index.js builds for `related`-id resolution
const entryByFilename = {};
FIXTURES.forEach(({ filename, data }) => {
  entryByFilename[filename] = {
    title: data.page.title,
    quadrant: data.config.quadrant,
    ring: data.config.ring
  };
});

export {
  REF_UI_ADOPT,
  REF_TECHNOLOGY_USE,
  REF_TOOLS_HOLD,
  REF_FRAMEWORKS_STOP,
  REF_DEPRECATED,
  FIXTURES,
  entryByFilename
};
