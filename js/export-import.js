/**
 * ExportImportManager handles the import and export of configurations.
 */
export class ExportImportManager {
  constructor(app) {
    this.app = app;

    // File input for importing (hidden)
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.yml,.yaml,.json';
    this.fileInput.style.display = 'none';
    document.body.appendChild(this.fileInput);
    this.originalYaml = '';
    this.interpretedYaml = '';

    // Setup event listener for file input
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileImport(e.target.files[0]);
      }
    });

    // Create modals for diff viewer and summary confirmation
    this.createDiffViewerModal();
    this.createSummaryModal();
  }

  /**
   * Create diff viewer modal element
   */
  createDiffViewerModal() {
    const modal = document.createElement('div');
    modal.id = 'diffViewerModal';
    modal.className = 'modal';

    modal.innerHTML = `
    <div class="modal-content large-modal">
      <div class="modal-header">
        <h2>Validate Import Configuration</h2>
        <span class="close-modal" id="closeDiffModal">&times;</span>
      </div>
      <div class="modal-body">
        <p class="diff-description">Please review the configuration before importing:</p>
        <div class="diff-container">
          <div class="diff-column">
            <h3>Original YAML</h3>
            <pre id="originalYaml" class="yaml-preview diff-yaml sync-scroll content-width"></pre>
          </div>
          <div class="diff-column">
            <h3>Interpreted YAML</h3>
            <pre id="interpretedYaml" class="yaml-preview diff-yaml sync-scroll content-width"></pre>
          </div>
        </div>
        <div id="diffControls" class="diff-controls">
          <label>
            <input type="checkbox" id="syncScrollToggle" checked> Synchronize scrolling
          </label>
          <label>
            <input type="checkbox" id="wrapLinesToggle"> Wrap long lines
          </label>
          <button id="expandViewBtn" class="btn small">Expand View</button>
        </div>
        <div class="diff-legend">
          <div class="legend-item">
            <div class="legend-color diff"></div>
            <span>Different values</span>
          </div>
          <div class="legend-item">
            <div class="legend-color error"></div>
            <span>Errors/undefined values</span>
          </div>
          <div class="legend-item">
            <div class="legend-color added"></div>
            <span>Added/unique entries</span>
          </div>
          <div class="legend-item">
            <div class="legend-color change"></div>
            <span>Structure changes</span>
          </div>
        </div>
        <div id="importWarnings" class="import-warnings"></div>
      </div>
      <div class="modal-footer">
        <button id="cancelDiffBtn" class="btn">Cancel</button>
        <button id="confirmDiffBtn" class="btn primary">Continue Import</button>
      </div>
    </div>
  `;

    document.body.appendChild(modal);

    // Set up synchronized scrolling between the two diff views
    this.setupSyncScroll();

    // Set up line wrapping toggle
    this.setupLineWrapping();

    // Set up expand view button
    this.setupExpandView();

    // Add event listeners
    document.getElementById('closeDiffModal').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    document.getElementById('cancelDiffBtn').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    document.getElementById('confirmDiffBtn').addEventListener('click', () => {
      modal.style.display = 'none';
      this.showSummaryModal();
    });

    // Add escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        modal.style.display = 'none';
      }
    });
  }

  /**
   * Set up synchronized scrolling between two diff panels
   */
  setupSyncScroll() {
    const originalYaml = document.getElementById('originalYaml');
    const interpretedYaml = document.getElementById('interpretedYaml');
    const syncScrollToggle = document.getElementById('syncScrollToggle');

    // Keep track of overflow state
    const checkForOverflow = () => {
      const originalColumn = originalYaml.closest('.diff-column');
      const interpretedColumn = interpretedYaml.closest('.diff-column');

      // Check if content is wider than container
      if (originalYaml.scrollWidth > originalYaml.clientWidth) {
        originalColumn.classList.add('has-overflow');
      } else {
        originalColumn.classList.remove('has-overflow');
      }

      if (interpretedYaml.scrollWidth > interpretedYaml.clientWidth) {
        interpretedColumn.classList.add('has-overflow');
      } else {
        interpretedColumn.classList.remove('has-overflow');
      }
    };

    // Check for overflow on initial load and resize
    checkForOverflow();
    window.addEventListener('resize', checkForOverflow);

    let isScrolling = false;

    // Synchronize both horizontal and vertical scrolling
    const syncScroll = (source, target) => {
      if (!syncScrollToggle.checked || isScrolling) return;

      isScrolling = true;

      // Match both vertical and horizontal scroll positions
      target.scrollTop = source.scrollTop;
      target.scrollLeft = source.scrollLeft;

      // Release the lock after a short delay
      setTimeout(() => { isScrolling = false; }, 10);
    };

    // Set up event listeners for both scroll directions
    originalYaml.addEventListener('scroll', () => syncScroll(originalYaml, interpretedYaml));
    interpretedYaml.addEventListener('scroll', () => syncScroll(interpretedYaml, originalYaml));

    // Add a helper function to ensure scrollbars are visible
    this.ensureScrollbarsVisible = () => {
      // Force scrollbars to be visible by setting overflow directly
      originalYaml.style.overflowX = 'scroll';
      interpretedYaml.style.overflowX = 'scroll';

      // Ensure containers have enough height for horizontal scrollbar
      const columns = document.querySelectorAll('.diff-column');
      columns.forEach(column => {
        const scrollbarHeight = 20; // Approximate scrollbar height
        column.style.paddingBottom = `${scrollbarHeight}px`;
      });

      checkForOverflow();
    };

    // Call this after content is loaded to ensure scrollbars are properly shown
    setTimeout(this.ensureScrollbarsVisible, 100);
  }


  /**
   * Set up line wrapping toggle
   */
  setupLineWrapping() {
    const wrapLinesToggle = document.getElementById('wrapLinesToggle');
    const originalYaml = document.getElementById('originalYaml');
    const interpretedYaml = document.getElementById('interpretedYaml');

    // Default state - no wrapping
    originalYaml.style.whiteSpace = 'pre';
    interpretedYaml.style.whiteSpace = 'pre';

    // Also adjust other styles that affect wrapping
    const adjustStyles = (wrap) => {
      const whiteSpace = wrap ? 'pre-wrap' : 'pre';
      const overflowX = wrap ? 'hidden' : 'scroll';
      const wordWrap = wrap ? 'break-word' : 'normal';

      // Apply to both panels
      [originalYaml, interpretedYaml].forEach(el => {
        el.style.whiteSpace = whiteSpace;
        el.style.overflowX = overflowX;
        el.style.wordWrap = wordWrap;

        // When wrapping, spans should also wrap
        const spans = el.querySelectorAll('.yaml-diff, .yaml-error, .yaml-added, .yaml-change, .yaml-comment');
        spans.forEach(span => {
          span.style.whiteSpace = whiteSpace;
          span.style.display = wrap ? 'inline' : 'inline-block';
          span.style.width = wrap ? 'auto' : '100%';
        });
      });

      // Update overflow indicators
      if (this.ensureScrollbarsVisible) {
        this.ensureScrollbarsVisible();
      }
    };

    wrapLinesToggle.addEventListener('change', () => {
      adjustStyles(wrapLinesToggle.checked);
    });
  }


  setupExpandView() {
    const expandViewBtn = document.getElementById('expandViewBtn');
    const diffContainer = document.querySelector('.diff-container');
    let isExpanded = false;

    expandViewBtn.addEventListener('click', () => {
      isExpanded = !isExpanded;
      if (isExpanded) {
        diffContainer.style.height = '90vh';
        expandViewBtn.textContent = 'Reduce View';
      } else {
        diffContainer.style.height = '70vh';
        expandViewBtn.textContent = 'Expand View';
      }
    });
  }


  highlightYamlDifferences(originalYaml, interpretedYaml) {
    // Normalize line endings
    originalYaml = originalYaml.replace(/\r\n/g, '\n');
    interpretedYaml = interpretedYaml.replace(/\r\n/g, '\n');

    // Store the raw content for reference
    this.originalYaml = originalYaml;
    this.interpretedYaml = interpretedYaml;

    // Parse both YAMLs to get their object structure
    let originalObj, interpretedObj;
    try {
      originalObj = window.jsyaml.load(originalYaml);
      interpretedObj = window.jsyaml.load(interpretedYaml);
    } catch (e) {
      console.error('Error parsing YAML for comparison:', e);
      // Fallback to simple line-by-line highlights if parsing fails
      return this.simpleHighlight(originalYaml, interpretedYaml);
    }

    // Split both YAMLs into lines
    const originalLines = originalYaml.split('\n');
    const interpretedLines = interpretedYaml.split('\n');

    // Process original YAML
    const originalProcessed = this.processSections(originalLines);
    const interpretedProcessed = this.processSections(interpretedLines);

    // Create normalized entry maps for comparison
    const originalEntries = this.extractEntries(originalObj);
    const interpretedEntries = this.extractEntries(interpretedObj);

    // Compare sections and create highlighting maps
    const highlightMaps = this.createHighlightMaps(originalEntries, interpretedEntries);

    // Apply highlights to both YAMLs
    const originalHighlighted = this.applyHighlights(originalProcessed, highlightMaps.original);
    const interpretedHighlighted = this.applyHighlights(interpretedProcessed, highlightMaps.interpreted);

    return {
      original: originalHighlighted.join('\n'),
      interpreted: interpretedHighlighted.join('\n')
    };
  }

  simpleHighlight(originalYaml, interpretedYaml) {
    const originalLines = originalYaml.split('\n');
    const interpretedLines = interpretedYaml.split('\n');

    // Escape and return original lines
    const original = originalLines.map(line => {
      return this.escapeHtml(line);
    }).join('\n');

    // Escape and return interpreted lines
    const interpreted = interpretedLines.map(line => {
      return this.escapeHtml(line);
    }).join('\n');

    return { original, interpreted };
  }

  createHighlightMaps(originalEntries, interpretedEntries) {
    const originalMap = {};
    const interpretedMap = {};

    // Compare display_format entries
    this.compareEntryArrays(
      originalEntries.display_format,
      interpretedEntries.display_format,
      originalMap,
      interpretedMap,
      'display_format',
      (a, b) => a.format === b.format &&
        this.areConditionsEqual(a.conditions, b.conditions)
    );

    // Compare ranges entries
    this.compareEntryArrays(
      originalEntries.ranges,
      interpretedEntries.ranges,
      originalMap,
      interpretedMap,
      'ranges',
      (a, b) => a.delivery_option === b.delivery_option &&
        a.lower_bound === b.lower_bound &&
        a.upper_bound === b.upper_bound &&
        this.areConditionsEqual(a.conditions, b.conditions)
    );

    // Compare capping entries
    this.compareEntryArrays(
      originalEntries.capping,
      interpretedEntries.capping,
      originalMap,
      interpretedMap,
      'capping',
      (a, b) => a.delivery_option === b.delivery_option &&
        this.areConditionsEqual(a.conditions, b.conditions) &&
        this.areCappingDetailsEqual(a, b)
    );

    // Compare rounding entries
    this.compareEntryArrays(
      originalEntries.rounding,
      interpretedEntries.rounding,
      originalMap,
      interpretedMap,
      'rounding',
      (a, b) => a.strategy === b.strategy
    );

    return { original: originalMap, interpreted: interpretedMap };
  }

  areConditionsEqual(conditions1, conditions2) {
    if (!conditions1 && !conditions2) return true;
    if (!conditions1 || !conditions2) return false;

    // Compare marketplace values, handling boolean vs string representation
    let marketplace1 = conditions1.marketplace;
    let marketplace2 = conditions2.marketplace;

    if (marketplace1 !== undefined && marketplace2 !== undefined) {
      if (typeof marketplace1 === 'string') {
        marketplace1 = marketplace1.toLowerCase() === 'true';
      }
      if (typeof marketplace2 === 'string') {
        marketplace2 = marketplace2.toLowerCase() === 'true';
      }
      if (marketplace1 !== marketplace2) return false;
    }

    // Compare delivery_mode
    if (conditions1.delivery_mode !== conditions2.delivery_mode) return false;

    // Compare numeric values
    const numericFields = [
      'pdt_less_than_or_equal_to',
      'pdt_greater_than',
      'mean_delay_less_than_or_equal_to',
      'mean_delay_greater_than'
    ];

    for (const field of numericFields) {
      const val1 = conditions1[field];
      const val2 = conditions2[field];

      // If both are undefined or null, they're equal
      if ((val1 === undefined || val1 === null) &&
        (val2 === undefined || val2 === null)) {
        continue;
      }

      // If only one is defined, they're not equal
      if ((val1 === undefined || val1 === null) ||
        (val2 === undefined || val2 === null)) {
        return false;
      }

      // Compare the numeric values
      if (Number(val1) !== Number(val2)) return false;
    }

    // Compare vertical_types arrays
    const vt1 = conditions1.vertical_types || [];
    const vt2 = conditions2.vertical_types || [];

    if (vt1.length !== vt2.length) return false;

    // Check each vertical type
    for (let i = 0; i < vt1.length; i++) {
      if (vt1[i] !== vt2[i]) return false;
    }

    return true;
  }


  areCappingDetailsEqual(cap1, cap2) {
    // Check single capping
    if (cap1.single && cap2.single) {
      if (cap1.single.min !== cap2.single.min) return false;
      if (cap1.single.max !== cap2.single.max) return false;
    } else if (cap1.single || cap2.single) {
      return false; // One has single and the other doesn't
    }

    // Check ranges capping
    if (cap1.ranges && cap2.ranges) {
      const min1 = cap1.ranges.min;
      const min2 = cap2.ranges.min;
      const max1 = cap1.ranges.max;
      const max2 = cap2.ranges.max;

      if (min1.lower_bound !== min2.lower_bound) return false;
      if (min1.upper_bound !== min2.upper_bound) return false;
      if (max1.lower_bound !== max2.lower_bound) return false;
      if (max1.upper_bound !== max2.upper_bound) return false;
    } else if (cap1.ranges || cap2.ranges) {
      return false; // One has ranges and the other doesn't
    }

    return true;
  }

  applyHighlights(processedLines, highlightMap) {
    let result = [];
    let currentSection = null;
    let sectionIndex = -1;
    let entryIndex = 0;

    for (let i = 0; i < processedLines.length; i++) {
      const processedLine = processedLines[i];
      const line = processedLine.line;
      const trimmed = processedLine.content;

      // Handle comments
      if (processedLine.isComment) {
        result.push(`<span class="yaml-comment">${this.escapeHtml(line)}</span>`);
        continue;
      }

      // Track section changes
      if (trimmed.startsWith('- display_format:')) {
        currentSection = 'display_format';
        sectionIndex = 0;
        entryIndex = 0;
      } else if (trimmed.startsWith('- ranges:')) {
        currentSection = 'ranges';
        sectionIndex = 0;
        entryIndex = 0;
      } else if (trimmed.startsWith('- capping:')) {
        currentSection = 'capping';
        sectionIndex = 0;
        entryIndex = 0;
      } else if (trimmed.startsWith('- rounding:')) {
        currentSection = 'rounding';
        sectionIndex = 0;
        entryIndex = 0;
      } else if (currentSection) {
        // Track entries within sections
        if ((currentSection === 'display_format' && trimmed.startsWith('- format:')) ||
          (currentSection === 'ranges' && trimmed.startsWith('- delivery_option:')) ||
          (currentSection === 'capping' && trimmed.startsWith('- delivery_option:')) ||
          (currentSection === 'rounding' && trimmed.startsWith('- strategy:'))) {
          entryIndex++;
        }
      }

      // Apply highlighting based on matched status
      let className = '';
      const mapKey = `${currentSection}:${entryIndex-1}`;

      if (currentSection && entryIndex > 0 && highlightMap[mapKey]) {
        if (highlightMap[mapKey] === 'unmatched') {
          if (trimmed.startsWith('- format:') ||
            trimmed.startsWith('- delivery_option:') ||
            trimmed.startsWith('- strategy:') ||
            trimmed.includes('conditions:') ||
            trimmed.includes('marketplace:') ||
            trimmed.includes('delivery_mode:') ||
            trimmed.includes('pdt_') ||
            trimmed.includes('bound:') ||
            trimmed.includes('single:') ||
            trimmed.includes('ranges:') ||
            trimmed.includes('min:') ||
            trimmed.includes('max:')) {
            className = 'yaml-change';
          }
        }
      }

      // Apply the highlighting
      if (className) {
        result.push(`<span class="${className}">${this.escapeHtml(line)}</span>`);
      } else {
        result.push(this.escapeHtml(line));
      }
    }

    return result;
  }

  compareEntryArrays(originalArray, interpretedArray, originalMap, interpretedMap, section, equalityFunction) {
    // Mark all entries as unmatched initially
    originalArray.forEach((_, index) => {
      originalMap[`${section}:${index}`] = 'unmatched';
    });

    interpretedArray.forEach((_, index) => {
      interpretedMap[`${section}:${index}`] = 'unmatched';
    });

    // Find matches
    originalArray.forEach((originalEntry, originalIndex) => {
      const interpretedIndex = interpretedArray.findIndex(
        interpretedEntry => equalityFunction(originalEntry, interpretedEntry)
      );

      if (interpretedIndex >= 0) {
        // Mark as matched in both maps
        originalMap[`${section}:${originalIndex}`] = 'matched';
        interpretedMap[`${section}:${interpretedIndex}`] = 'matched';
      }
    });
  }

  extractEntries(obj) {
    const entries = {
      display_format: [],
      ranges: [],
      capping: [],
      rounding: []
    };

    if (!obj || !obj.pdt || !Array.isArray(obj.pdt)) {
      return entries;
    }

    // Process each PDT section
    obj.pdt.forEach(section => {
      // Extract display_format entries
      if (section.display_format) {
        section.display_format.forEach(format => {
          const entry = {
            format: format.format,
            conditions: this.normalizeConditions(format.conditions || {})
          };
          entries.display_format.push(entry);
        });
      }

      // Extract ranges entries
      if (section.ranges) {
        section.ranges.forEach(range => {
          const entry = {
            delivery_option: range.delivery_option || 'STANDARD',
            lower_bound: range.lower_bound,
            upper_bound: range.upper_bound,
            conditions: this.normalizeConditions(range.conditions || {})
          };
          entries.ranges.push(entry);
        });
      }

      // Extract capping entries
      if (section.capping) {
        section.capping.forEach(cap => {
          const entry = {
            delivery_option: cap.delivery_option || 'STANDARD',
            conditions: this.normalizeConditions(cap.conditions || {})
          };

          if (cap.single) {
            entry.single = {
              min: cap.single.min,
              max: cap.single.max
            };
          }

          if (cap.ranges) {
            entry.ranges = {
              min: {
                lower_bound: cap.ranges.min.lower_bound,
                upper_bound: cap.ranges.min.upper_bound
              },
              max: {
                lower_bound: cap.ranges.max.lower_bound,
                upper_bound: cap.ranges.max.upper_bound
              }
            };
          }

          entries.capping.push(entry);
        });
      }

      // Extract rounding entries
      if (section.rounding) {
        section.rounding.forEach(round => {
          const entry = {
            strategy: round.strategy || 'NEAREST_5'
          };
          entries.rounding.push(entry);
        });
      }
    });

    return entries;
  }

  normalizeConditions(conditions) {
    const normalized = {...conditions};

    // Convert string booleans to actual booleans
    if (normalized.marketplace !== undefined) {
      if (typeof normalized.marketplace === 'string') {
        normalized.marketplace = normalized.marketplace.toLowerCase() === 'true';
      }
    }

    // Ensure vertical_types is an array
    if (normalized.vertical_types && !Array.isArray(normalized.vertical_types)) {
      normalized.vertical_types = [normalized.vertical_types];
    }

    return normalized;
  }

  processSections(lines) {
    const processed = [];
    let currentSection = null;
    let sectionStart = -1;

    // Look for section starts
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Track section starts
      if (trimmed.startsWith('- display_format:')) {
        currentSection = 'display_format';
        sectionStart = i;
      } else if (trimmed.startsWith('- ranges:')) {
        currentSection = 'ranges';
        sectionStart = i;
      } else if (trimmed.startsWith('- capping:')) {
        currentSection = 'capping';
        sectionStart = i;
      } else if (trimmed.startsWith('- rounding:')) {
        currentSection = 'rounding';
        sectionStart = i;
      }

      // Add the line with metadata
      processed.push({
        line,
        section: currentSection,
        sectionIndex: currentSection ? i - sectionStart : -1,
        indent: line.match(/^\s*/)[0].length,
        isComment: trimmed.startsWith('#'),
        content: trimmed
      });
    }

    return processed;
  }

  highlightDifferencesInYaml(lines, differences, isInterpreted) {
    const result = [];

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        result.push(`<span class="yaml-comment">${this.escapeHtml(line)}</span>`);
        continue;
      }

      // Check if this line contains one of our differences
      let isDifferent = false;
      let differenceType = null;

      // Extract the key and value from the line if possible
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();

        // Look for this key in our differences
        for (const type of ['added', 'removed', 'changed']) {
          const diffPaths = differences[type];
          for (const path of diffPaths) {
            // Check if this line's key appears in one of our difference paths
            const pathParts = path.split('.');
            const lastPart = pathParts[pathParts.length - 1];

            // Handle array indices in paths
            const keyWithoutBrackets = lastPart ? lastPart.replace(/\[\d+\]$/, '') : '';

            if (key === lastPart || key === keyWithoutBrackets ||
              (isInterpreted && type === 'added' && line.includes(lastPart)) ||
              (!isInterpreted && type === 'removed' && line.includes(lastPart))) {
              isDifferent = true;
              differenceType = type;
              break;
            }
          }
          if (isDifferent) break;
        }

        // Also check if this line is the parent of a nested difference
        if (!isDifferent) {
          const indent = line.match(/^\s*/)[0].length;
          // Get next line to see if it's a child
          if (i < lines.length - 1) {
            const nextLine = lines[i + 1];
            const nextIndent = nextLine.match(/^\s*/)[0].length;

            // If next line has greater indent, it's a child of current line
            if (nextIndent > indent &&
              // Skip the check if the next line is not a key-value pair
              nextLine.trim().indexOf(':') > 0) {
              const nextTrimmed = nextLine.trim();
              const nextKey = nextTrimmed.substring(0, nextTrimmed.indexOf(':')).trim();
              const fullPath = `${key}.${nextKey}`;

              // Check if this child path is in our differences
              for (const type of ['added', 'removed', 'changed']) {
                const diffPaths = differences[type];
                for (const path of diffPaths) {
                  if (path.startsWith(fullPath)) {
                    // Parent of a difference, but not the difference itself
                    // We could highlight it differently if needed
                    break;
                  }
                }
              }
            }
          }
        }
      }

      // Special case for marketplace: false which often causes false positives
      if (trimmed === 'marketplace: false' || trimmed.endsWith('marketplace: false')) {
        // Only highlight if it's actually different
        isDifferent = false;
        for (const path of differences.changed) {
          if (path.endsWith('marketplace') &&
            ((!isInterpreted && obj1[path] !== false) ||
              (isInterpreted && obj2[path] !== false))) {
            isDifferent = true;
            differenceType = 'changed';
            break;
          }
        }
      }

      // Apply highlighting based on difference type
      if (isDifferent) {
        switch (differenceType) {
          case 'added':
            result.push(`<span class="yaml-added">${this.escapeHtml(line)}</span>`);
            break;
          case 'removed':
            result.push(`<span class="yaml-error">${this.escapeHtml(line)}</span>`);
            break;
          case 'changed':
            result.push(`<span class="yaml-diff">${this.escapeHtml(line)}</span>`);
            break;
          default:
            result.push(this.escapeHtml(line));
        }
      } else {
        result.push(this.escapeHtml(line));
      }
    }

    return result.join('\n');
  }

  normalizeYamlObject(obj) {
    if (!obj) return {};

    // Deep clone to avoid modifying the original
    const normalized = JSON.parse(JSON.stringify(obj));

    // Handle top-level properties
    if (normalized.config_format_version !== undefined && normalized.configFormatVersion === undefined) {
      normalized.configFormatVersion = normalized.config_format_version;
    }
    if (normalized.country_code !== undefined && normalized.countryCode === undefined) {
      normalized.countryCode = normalized.country_code;
    }

    // Normalize boolean values that might be strings
    this.traverseAndNormalize(normalized);

    return normalized;
  }

  traverseAndNormalize(obj) {
    if (!obj || typeof obj !== 'object') return;

    Object.keys(obj).forEach(key => {
      const value = obj[key];

      if (typeof value === 'string') {
        // Convert string booleans to actual booleans
        if (value.toLowerCase() === 'true') {
          obj[key] = true;
        } else if (value.toLowerCase() === 'false') {
          obj[key] = false;
        }
      } else if (value && typeof value === 'object') {
        // Recurse into nested objects
        if (Array.isArray(value)) {
          value.forEach(item => {
            if (item && typeof item === 'object') {
              this.traverseAndNormalize(item);
            }
          });
        } else {
          this.traverseAndNormalize(value);
        }
      }
    });
  }

  flattenObject(obj, prefix = '') {
    const result = {};

    if (!obj || typeof obj !== 'object') return result;

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const newPrefix = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recurse for nested objects
        Object.assign(result, this.flattenObject(value, newPrefix));
      } else if (Array.isArray(value)) {
        // Handle arrays
        value.forEach((item, index) => {
          const arrayPrefix = `${newPrefix}[${index}]`;
          if (item && typeof item === 'object') {
            Object.assign(result, this.flattenObject(item, arrayPrefix));
          } else {
            result[arrayPrefix] = item;
          }
        });
      } else {
        // Store leaf values
        result[newPrefix] = value;
      }
    });

    return result;
  }

  findDifferences(obj1, obj2) {
    const differences = {
      added: [], // Paths in obj2 but not in obj1
      removed: [], // Paths in obj1 but not in obj2
      changed: [] // Paths in both but with different values
    };

    // Check for paths in obj1 that are removed or changed in obj2
    Object.keys(obj1).forEach(path => {
      if (!(path in obj2)) {
        differences.removed.push(path);
      } else if (obj1[path] !== obj2[path]) {
        differences.changed.push(path);
      }
    });

    // Check for paths added in obj2
    Object.keys(obj2).forEach(path => {
      if (!(path in obj1)) {
        differences.added.push(path);
      }
    });

    return differences;
  }

  simpleLineComparison(originalLines, interpretedLines) {
    // Simple line content comparison
    const originalHighlighted = originalLines.map(line =>
      interpretedLines.includes(line) ? this.escapeHtml(line) :
        `<span class="yaml-diff">${this.escapeHtml(line)}</span>`
    ).join('\n');

    const interpretedHighlighted = interpretedLines.map(line =>
      originalLines.includes(line) ? this.escapeHtml(line) :
        `<span class="yaml-diff">${this.escapeHtml(line)}</span>`
    ).join('\n');

    return {
      original: originalHighlighted,
      interpreted: interpretedHighlighted
    };
  }

  buildYamlMap(lines) {
    const map = {};
    let currentIndent = 0;
    let currentPath = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      // Calculate the indentation level
      const indent = line.search(/\S|$/);

      // Adjust the path based on indentation
      if (indent < currentIndent) {
        const levelsUp = Math.floor((currentIndent - indent) / 2);
        currentPath = currentPath.slice(0, -levelsUp);
      }
      currentIndent = indent;

      // Parse the line
      if (trimmed.includes(':')) {
        const colonIndex = trimmed.indexOf(':');
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();

        // Update the current path
        if (value === '' || value === '-') {
          currentPath.push(key);
        }

        // Store with the full path as the key
        const fullPath = [...currentPath, key].join('.');
        map[fullPath] = value;
      } else if (trimmed.startsWith('-')) {
        // Handle array items
        const itemValue = trimmed.substring(1).trim();
        const arrayIndex = Object.keys(map).filter(k =>
          k.startsWith(currentPath.join('.') + '.')
        ).length;

        const fullPath = [...currentPath, arrayIndex].join('.');
        map[fullPath] = itemValue;
      }
    });

    return map;
  }

  parseYamlLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return [null, null];

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) return [null, null];

    const key = trimmed.substring(0, colonIndex).trim();
    const value = trimmed.substring(colonIndex + 1).trim();

    return [key, value];
  }

  highlightLine(line, sourceMap, compareMap, isInterpreted = false) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      // For comments, just return as is
      return `<span class="yaml-comment">${this.escapeHtml(line)}</span>`;
    }

    // Check for undefined values that need to be fixed
    if (isInterpreted &&
      (line.includes('config_format_version: undefined') ||
        line.includes('country_code: undefined'))) {
      return `<span class="yaml-error">${this.escapeHtml(line)}</span>`;
    }

    // For lines with key-value pairs
    if (trimmed.includes(':')) {
      const colonIndex = trimmed.indexOf(':');
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      // Find this key in both maps
      const keyInSource = Object.keys(sourceMap).find(k => k.endsWith(`.${key}`) || k === key);
      const keyInCompare = Object.keys(compareMap).find(k => k.endsWith(`.${key}`) || k === key);

      if (keyInSource && keyInCompare) {
        const sourceValue = sourceMap[keyInSource];
        const compareValue = compareMap[keyInCompare];

        if (sourceValue !== compareValue) {
          return `<span class="yaml-diff">${this.escapeHtml(line)}</span>`;
        }
      } else if (keyInSource && !keyInCompare) {
        return `<span class="yaml-added">${this.escapeHtml(line)}</span>`;
      }
    }

    // Check for array items or structural differences
    if (trimmed.startsWith('-')) {
      // Simple heuristic for array items
      const content = trimmed.substring(1).trim();
      if (!this.originalYaml.includes(content) || !this.interpretedYaml.includes(content)) {
        return `<span class="yaml-change">${this.escapeHtml(line)}</span>`;
      }
    }

    // Default case - no highlighting
    return this.escapeHtml(line);
  }


  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  /**
   * Create summary confirmation modal element
   */
  createSummaryModal() {
    const modal = document.createElement('div');
    modal.id = 'importSummaryModal';
    modal.className = 'modal';

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Import Summary</h2>
          <span class="close-modal" id="closeSummaryModal">&times;</span>
        </div>
        <div class="modal-body">
          <p>The following items will be imported:</p>
          <ul id="importSummaryList" class="import-summary-list">
            <!-- Summary items will be added here -->
          </ul>
          <div class="warning-section">
            <p class="warning-note">
              <strong>Note:</strong> This will replace your current configuration.
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button id="cancelSummaryBtn" class="btn">Cancel</button>
          <button id="confirmSummaryBtn" class="btn primary">Import Configuration</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    document.getElementById('closeSummaryModal').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    document.getElementById('cancelSummaryBtn').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    document.getElementById('confirmSummaryBtn').addEventListener('click', () => {
      modal.style.display = 'none';
      this.finalizeImport();
    });
  }



  /**
   * Show import dialog
   */
  showImportDialog() {
    // Reset file input
    this.fileInput.value = '';

    // Trigger file selection
    this.fileInput.click();
  }

  /**
   * Handle file import
   */
  handleFileImport(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const fileContent = e.target.result;

      try {
        let importedConfig;
        let originalYaml = fileContent;

        // Determine file type
        if (file.name.endsWith('.json')) {
          // Parse JSON
          importedConfig = JSON.parse(fileContent);
          // Convert to YAML for display
          originalYaml = window.jsyaml ? window.jsyaml.dump(importedConfig) : fileContent;
        } else if (file.name.endsWith('.yml') || file.name.endsWith('.yaml')) {
          // Parse YAML
          if (!window.jsyaml) {
            alert('YAML support is not available. js-yaml library is required.');
            return;
          }

          importedConfig = window.jsyaml.load(fileContent);
        } else {
          alert('Unsupported file type. Please use .yml, .yaml, or .json');
          return;
        }

        // Validate imported config structure
        const validationResult = this.validateImportedConfig(importedConfig);
        if (!validationResult.valid) {
          alert(`Invalid configuration format: ${validationResult.errors.join('\n')}`);
          return;
        }

        // Store the parsed config temporarily
        this.tempImportedConfig = this.normalizeConfig(importedConfig);

        // Show diff viewer modal
        this.showDiffViewer(originalYaml, this.tempImportedConfig);
      } catch (error) {
        console.error('Error importing file:', error);
        alert(`Error importing file: ${error.message}`);
      }
    };

    reader.readAsText(file);
  }

  /**
   * Normalize config to ensure consistent format
   */
  normalizeConfig(config) {
    // Create a deep copy first
    const normalizedConfig = JSON.parse(JSON.stringify(config));

    // Normalize metadata fields
    if (normalizedConfig.config_format_version !== undefined) {
      // Only set if not "undefined" string
      if (normalizedConfig.config_format_version !== "undefined") {
        normalizedConfig.configFormatVersion = normalizedConfig.config_format_version;
      }
      delete normalizedConfig.config_format_version;
    } else if (normalizedConfig.configFormatVersion === undefined) {
      normalizedConfig.configFormatVersion = "1"; // Default value
    }

    if (normalizedConfig.country_code !== undefined) {
      normalizedConfig.countryCode = normalizedConfig.country_code;
      delete normalizedConfig.country_code;
    } else if (normalizedConfig.countryCode === undefined) {
      normalizedConfig.countryCode = ""; // Empty string as default
    }

    // Fix undefined values
    if (normalizedConfig.configFormatVersion === undefined) {
      normalizedConfig.configFormatVersion = "1";
    }
    if (normalizedConfig.variant === undefined) {
      normalizedConfig.variant = "default";
    }
    if (normalizedConfig.platform === undefined) {
      normalizedConfig.platform = "";
    }
    if (normalizedConfig.countryCode === undefined) {
      normalizedConfig.countryCode = "";
    }

    // Ensure pdt array exists
    if (!normalizedConfig.pdt || !Array.isArray(normalizedConfig.pdt)) {
      normalizedConfig.pdt = [];
    }

    // Merge PDT sections by type and common parameters
    normalizedConfig.pdt = this.mergePdtSectionsByCommonParams(normalizedConfig.pdt);

    return normalizedConfig;
  }


  /**
   * Merge PDT sections by type to avoid validation issues
   */
  mergePdtSectionsByCommonParams(pdtSections) {
    // First, collect all entries by type
    const sectionsByType = {
      display_format: [],
      ranges: [],
      capping: [],
      rounding: []
    };

    // Collect all entries by type
    pdtSections.forEach(section => {
      if (section.display_format) {
        sectionsByType.display_format = sectionsByType.display_format.concat(section.display_format);
      } else if (section.ranges) {
        sectionsByType.ranges = sectionsByType.ranges.concat(section.ranges);
      } else if (section.capping) {
        sectionsByType.capping = sectionsByType.capping.concat(section.capping);
      } else if (section.rounding) {
        sectionsByType.rounding = sectionsByType.rounding.concat(section.rounding);
      }
    });

    // Now merge entries by common parameters for each type
    const mergedSections = [];

    // Process display_format section
    if (sectionsByType.display_format.length > 0) {
      const mergedDisplayFormat = this.mergeEntriesByCommonParams(
        sectionsByType.display_format,
        'display_format',
        ['delivery_mode', 'marketplace', 'pdt_less_than_or_equal_to', 'vertical_types']
      );
      mergedSections.push({ display_format: mergedDisplayFormat });
    }

    // Process ranges section - Include PDT bounds in grouping parameters
    if (sectionsByType.ranges.length > 0) {
      const mergedRanges = this.mergeEntriesByCommonParams(
        sectionsByType.ranges,
        'ranges',
        ['delivery_option', 'delivery_mode', 'marketplace', 'vertical_types',
          'pdt_greater_than', 'pdt_less_than_or_equal_to']
      );
      mergedSections.push({ ranges: mergedRanges });
    }

    // Process capping section
    if (sectionsByType.capping.length > 0) {
      const mergedCapping = this.mergeEntriesByCommonParams(
        sectionsByType.capping,
        'capping',
        ['delivery_option', 'delivery_mode', 'marketplace', 'vertical_types',
          'pdt_greater_than', 'pdt_less_than_or_equal_to']
      );
      mergedSections.push({ capping: mergedCapping });
    }

    // Process rounding section - no common params to merge by, just keep as is
    if (sectionsByType.rounding.length > 0) {
      mergedSections.push({ rounding: sectionsByType.rounding });
    }

    return mergedSections;
  }


  /**
   * Merge entries that have the same common parameters
   * @param {Array} entries - The entries to merge
   * @param {string} type - Type of section ('display_format', 'ranges', etc.)
   * @param {Array} commonParamKeys - Keys to use for grouping entries
   * @returns {Array} - Merged entries
   */
  mergeEntriesByCommonParams(entries, type, commonParamKeys) {
    const mergedEntries = [];

    if (type === 'display_format') {
      // For display_format, group by delivery_mode, marketplace, etc.
      const groupedEntries = {};

      entries.forEach(entry => {
        // Generate a key based on common parameters
        const key = this.generateEntryKey(entry, commonParamKeys);

        if (!groupedEntries[key]) {
          groupedEntries[key] = [];
        }

        groupedEntries[key].push(entry);
      });

      // Add each format as a separate entry
      Object.entries(groupedEntries).forEach(([key, entriesGroup]) => {
        entriesGroup.forEach(entry => {
          mergedEntries.push({
            format: entry.format,
            conditions: entry.conditions,
            _title: entry._title || `Format: ${entry.format}`
          });
        });
      });
    } else if (type === 'ranges') {
      // For ranges, group by PDT bounds first, then by other params
      const pdtGroups = this.groupRangesByPdtBounds(entries);

      // For each PDT group, further group by other common parameters
      Object.entries(pdtGroups).forEach(([pdtKey, pdtEntries]) => {
        const subGroupedEntries = {};

        pdtEntries.forEach(entry => {
          // Generate key based on common parameters excluding PDT bounds
          const key = this.generateEntryKey(entry, commonParamKeys.filter(k =>
            k !== 'pdt_greater_than' && k !== 'pdt_less_than_or_equal_to'));

          if (!subGroupedEntries[key]) {
            subGroupedEntries[key] = [];
          }

          subGroupedEntries[key].push(entry);
        });

        // Process each subgroup
        Object.entries(subGroupedEntries).forEach(([key, entriesGroup]) => {
          // Create a title based on PDT range
          const pdtDesc = this.getPdtRangeDescription(entriesGroup[0].conditions);
          const baseTitle = `${type.charAt(0).toUpperCase() + type.slice(1)} ${pdtDesc}`;

          // Now further split by mean delay conditions if needed
          const meanDelayGroups = this.groupEntriesByMeanDelay(entriesGroup);

          // Process each mean delay group
          Object.entries(meanDelayGroups).forEach(([meanDelayKey, meanDelayEntries]) => {
            // Create a title that includes mean delay if there's more than one group
            let groupTitle = baseTitle;
            if (Object.keys(meanDelayGroups).length > 1 && meanDelayKey !== 'default') {
              const mdDesc = this.getMeanDelayDescription(meanDelayEntries[0].conditions);
              groupTitle = `${baseTitle}, ${mdDesc}`;
            }

            // Add each entry with appropriate title
            meanDelayEntries.forEach((entry, index) => {
              const newEntry = { ...entry };
              newEntry._title = entry._title ||
                (meanDelayEntries.length > 1 ? `${groupTitle} ${index + 1}` : groupTitle);
              mergedEntries.push(newEntry);
            });
          });
        });
      });
    } else if (type === 'capping') {
      // For capping, group by delivery_option and conditions
      const groupedEntries = {};

      entries.forEach(entry => {
        const key = this.generateEntryKey(entry, commonParamKeys);

        if (!groupedEntries[key]) {
          groupedEntries[key] = [];
        }

        groupedEntries[key].push(entry);
      });

      // Process each group
      Object.entries(groupedEntries).forEach(([key, entriesGroup]) => {
        entriesGroup.forEach((entry, index) => {
          const newEntry = { ...entry };
          newEntry._title = entry._title ||
            `${type.charAt(0).toUpperCase() + type.slice(1)} ${entry.delivery_option || ''} ${index > 0 ? index + 1 : ''}`;
          mergedEntries.push(newEntry);
        });
      });
    } else {
      // For other types, just add all entries with appropriate titles
      entries.forEach((entry, index) => {
        const newEntry = { ...entry };
        if (!newEntry._title) {
          newEntry._title = `${type.charAt(0).toUpperCase() + type.slice(1)} ${index + 1}`;
        }
        mergedEntries.push(newEntry);
      });
    }

    return mergedEntries;
  }


  generateEntryKey(entry, paramKeys) {
    // Create a key based on common parameters
    const keyParts = [];

    // Add the common parameters from conditions
    if (entry.conditions) {
      paramKeys.forEach(key => {
        if (entry.conditions[key] !== undefined) {
          if (Array.isArray(entry.conditions[key])) {
            keyParts.push(`${key}:${entry.conditions[key].join(',')}`);
          } else {
            keyParts.push(`${key}:${entry.conditions[key]}`);
          }
        }
      });
    }

    // Add delivery_option for ranges and capping
    if (entry.delivery_option) {
      keyParts.push(`delivery_option:${entry.delivery_option}`);
    }

    return keyParts.join('|');
  }

  groupEntriesByMeanDelay(entries) {
    const groups = {};

    entries.forEach(entry => {
      // Create a key based on mean delay bounds
      const mdGreaterThan = entry.conditions?.mean_delay_greater_than;
      const mdLessThanOrEqualTo = entry.conditions?.mean_delay_less_than_or_equal_to;

      let key;
      if (mdGreaterThan !== undefined && mdLessThanOrEqualTo !== undefined) {
        key = `${mdGreaterThan}-${mdLessThanOrEqualTo}`;
      } else if (mdGreaterThan !== undefined) {
        key = `>${mdGreaterThan}`;
      } else if (mdLessThanOrEqualTo !== undefined) {
        key = `≤${mdLessThanOrEqualTo}`;
      } else {
        key = 'default'; // For entries without mean delay conditions
      }

      // Add entry to the appropriate group
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
    });

    return groups;
  }

  getMeanDelayDescription(conditions) {
    if (!conditions) return '';

    let description = '';

    // Add mean delay description
    if (conditions.mean_delay_greater_than !== undefined || conditions.mean_delay_less_than_or_equal_to !== undefined) {
      description += 'Mean Delay ';

      if (conditions.mean_delay_greater_than !== undefined && conditions.mean_delay_less_than_or_equal_to !== undefined) {
        description += `${conditions.mean_delay_greater_than}-${conditions.mean_delay_less_than_or_equal_to}`;
      } else if (conditions.mean_delay_greater_than !== undefined) {
        description += `>${conditions.mean_delay_greater_than}`;
      } else if (conditions.mean_delay_less_than_or_equal_to !== undefined) {
        description += `≤${conditions.mean_delay_less_than_or_equal_to}`;
      }
    } else {
      description = 'Default Mean Delay';
    }

    return description;
  }

  getPdtRangeDescription(conditions) {
    if (!conditions) return 'Default';

    let description = '';

    // Add PDT range only (no mean delay here since it's handled separately)
    if (conditions.pdt_greater_than !== undefined || conditions.pdt_less_than_or_equal_to !== undefined) {
      description += 'PDT ';

      if (conditions.pdt_greater_than !== undefined && conditions.pdt_less_than_or_equal_to !== undefined) {
        description += `${conditions.pdt_greater_than}-${conditions.pdt_less_than_or_equal_to}`;
      } else if (conditions.pdt_greater_than !== undefined) {
        description += `>${conditions.pdt_greater_than}`;
      } else if (conditions.pdt_less_than_or_equal_to !== undefined) {
        description += `≤${conditions.pdt_less_than_or_equal_to}`;
      }
    } else {
      description = 'Default';
    }

    return description;
  }

  /**
   * Group ranges by their PDT bounds to create separate groups
   */
  groupRangesByPdtBounds(entries) {
    const groups = {};

    entries.forEach(entry => {
      // Create a key based on PDT bounds
      const pdtGreaterThan = entry.conditions?.pdt_greater_than;
      const pdtLessThanOrEqualTo = entry.conditions?.pdt_less_than_or_equal_to;

      let key;
      if (pdtGreaterThan !== undefined && pdtLessThanOrEqualTo !== undefined) {
        key = `${pdtGreaterThan}-${pdtLessThanOrEqualTo}`;
      } else if (pdtGreaterThan !== undefined) {
        key = `>${pdtGreaterThan}`;
      } else if (pdtLessThanOrEqualTo !== undefined) {
        key = `≤${pdtLessThanOrEqualTo}`;
      } else {
        key = 'default'; // For entries without PDT bounds
      }

      // Add entry to the appropriate group
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
    });

    return groups;
  }

  /**
   * Show diff viewer modal
   */
  showDiffViewer(originalYaml, normalizedConfig) {
    // First, parse the original YAML to extract comments
    const originalLines = originalYaml.split('\n');
    const originalComments = this.extractComments(originalLines);

    // Preserve these comments when generating interpreted YAML
    if (originalComments.ranges && Object.keys(originalComments.ranges).length > 0) {
      // Make sure the ranges in normalized config preserve the original comments
      if (normalizedConfig.pdt) {
        normalizedConfig.pdt.forEach(section => {
          if (section.ranges) {
            section.ranges.forEach(range => {
              // Calculate a signature for this range to match with comments
              const signature = this.createRangeSignature(range);
              if (originalComments.ranges[signature]) {
                range._originalComment = originalComments.ranges[signature];
              }
            });
          }
        });
      }
    }

    // Get interpretedYaml from the normalized config
    const interpretedYaml = this.app.yamlHandler.generateYaml(normalizedConfig);

    // Get diff modal elements
    const diffModal = document.getElementById('diffViewerModal');
    const originalYamlElement = document.getElementById('originalYaml');
    const interpretedYamlElement = document.getElementById('interpretedYaml');
    const warningsElement = document.getElementById('importWarnings');

    // Highlight differences
    const highlighted = this.highlightYamlDifferences(originalYaml, interpretedYaml);

    // Populate elements with highlighted content
    originalYamlElement.innerHTML = highlighted.original;
    interpretedYamlElement.innerHTML = highlighted.interpreted;

    // Store the raw YAML for potential downloading
    this._originalYaml = originalYaml;
    this._interpretedYaml = interpretedYaml;

    // Add a download option for the raw YAML
    this.setupYamlDownload();

    // Check for potential warnings
    const warnings = this.getImportWarnings(normalizedConfig);
    warningsElement.innerHTML = '';

    if (warnings.length > 0) {
      const warningHeader = document.createElement('h4');
      warningHeader.textContent = 'Potential Issues:';
      warningHeader.className = 'warning-header';
      warningsElement.appendChild(warningHeader);

      const warningList = document.createElement('ul');
      warningList.className = 'warning-list';

      warnings.forEach(warning => {
        const warningItem = document.createElement('li');
        warningItem.textContent = warning;
        warningList.appendChild(warningItem);
      });

      warningsElement.appendChild(warningList);
    }

    // Display the modal
    diffModal.style.display = 'flex';

    // Ensure scrollbars are properly shown after the modal is visible
    setTimeout(() => {
      if (this.ensureScrollbarsVisible) {
        this.ensureScrollbarsVisible();
      }
    }, 100);
  }

  createRangeSignature(range) {
    const parts = [];
    parts.push(`- delivery_option: ${range.delivery_option || 'STANDARD'}`);
    parts.push(`lower_bound: ${range.lower_bound}`);
    parts.push(`upper_bound: ${range.upper_bound}`);

    if (range.conditions) {
      parts.push('conditions:');
      if (range.conditions.pdt_greater_than !== undefined) {
        parts.push(`pdt_greater_than: ${range.conditions.pdt_greater_than}`);
      }
      if (range.conditions.pdt_less_than_or_equal_to !== undefined) {
        parts.push(`pdt_less_than_or_equal_to: ${range.conditions.pdt_less_than_or_equal_to}`);
      }
      if (range.conditions.mean_delay_greater_than !== undefined) {
        parts.push(`mean_delay_greater_than: ${range.conditions.mean_delay_greater_than}`);
      }
      if (range.conditions.mean_delay_less_than_or_equal_to !== undefined) {
        parts.push(`mean_delay_less_than_or_equal_to: ${range.conditions.mean_delay_less_than_or_equal_to}`);
      }
    }

    return parts.join('|');
  }

  extractComments(lines) {
    const comments = {
      ranges: {}
    };

    let currentSection = null;
    let currentComment = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Track sections
      if (line.startsWith('- ranges:')) {
        currentSection = 'ranges';
      } else if (line.startsWith('- display_format:') ||
        line.startsWith('- capping:') ||
        line.startsWith('- rounding:')) {
        currentSection = line.substring(2, line.indexOf(':'));
      }

      // Extract comments
      if (line.startsWith('#') && currentSection) {
        // Capture the comment text
        currentComment = line.substring(1).trim();
      } else if (currentComment && currentSection === 'ranges') {
        // If we have a comment and are in a ranges section, track the next block
        if (line.startsWith('- delivery_option:')) {
          // Start of a range entry, build a signature for the next few lines
          const rangeBlock = [];
          let j = i;

          // Collect the range block (until next entry or section)
          while (j < lines.length &&
          !lines[j].trim().startsWith('- delivery_option:') &&
          !lines[j].trim().startsWith('- ') &&
          lines[j].trim() !== '') {
            if (lines[j].trim() && !lines[j].trim().startsWith('#')) {
              rangeBlock.push(lines[j].trim());
            }
            j++;
          }

          // Generate a signature for this range
          const signature = rangeBlock.join('|');
          comments.ranges[signature] = currentComment;

          // Reset for next comment
          currentComment = null;
        }
      }
    }

    return comments;
  }

  setupYamlDownload() {
    // Find or create download links container
    let downloadContainer = document.getElementById('yaml-download-links');

    if (!downloadContainer) {
      downloadContainer = document.createElement('div');
      downloadContainer.id = 'yaml-download-links';
      downloadContainer.className = 'yaml-download-links';

      const diffControls = document.getElementById('diffControls');
      diffControls.appendChild(downloadContainer);

      // Create download links for both columns
      const originalLink = document.createElement('a');
      originalLink.className = 'btn small';
      originalLink.textContent = 'Download Original';
      originalLink.href = '#';
      originalLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.downloadYaml(this._originalYaml, 'original');
      });

      const interpretedLink = document.createElement('a');
      interpretedLink.className = 'btn small';
      interpretedLink.textContent = 'Download Interpreted';
      interpretedLink.href = '#';
      interpretedLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.downloadYaml(this._interpretedYaml, 'interpreted');
      });

      downloadContainer.appendChild(originalLink);
      downloadContainer.appendChild(interpretedLink);
    }
  }

  downloadYaml(content, prefix) {
    const blob = new Blob([content], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${prefix}-config.yml`;

    document.body.appendChild(downloadLink);
    downloadLink.click();

    document.body.removeChild(downloadLink);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Get potential import warnings
   */
  getImportWarnings(config) {
    const warnings = [];

    // Check for undefined values
    if (config.configFormatVersion === "undefined" || config.configFormatVersion === undefined) {
      warnings.push('Configuration format version is undefined, will use default "1".');
    }

    if (config.countryCode === "undefined" || config.countryCode === undefined) {
      warnings.push('Country code is undefined, will use empty value.');
    }

    // Check for empty sections
    if (!config.pdt || config.pdt.length === 0) {
      warnings.push('No PDT configuration sections found.');
    } else {
      // Check for section-specific issues
      let hasDisplayFormat = false;
      let hasRanges = false;
      let hasCapping = false;
      let hasRounding = false;

      config.pdt.forEach(section => {
        if (section.display_format) hasDisplayFormat = true;
        if (section.ranges) hasRanges = true;
        if (section.capping) hasCapping = true;
        if (section.rounding) hasRounding = true;
      });

      if (!hasDisplayFormat) warnings.push('No display format configuration found.');
      if (!hasRanges) warnings.push('No ranges configuration found.');
      if (!hasCapping) warnings.push('No capping configuration found.');
      if (!hasRounding) warnings.push('No rounding configuration found.');
    }

    return warnings;
  }

  /**
   * Show summary confirmation modal
   */
  showSummaryModal() {
    // Count items by type
    const counts = this.countImportItems(this.tempImportedConfig);

    // Get summary modal elements
    const summaryModal = document.getElementById('importSummaryModal');
    const summaryList = document.getElementById('importSummaryList');

    // Clear previous summary
    summaryList.innerHTML = '';

    // Add summary items
    for (const [type, count] of Object.entries(counts)) {
      if (count > 0) {
        const listItem = document.createElement('li');
        listItem.className = 'summary-item';
        listItem.innerHTML = `<span class="summary-count">${count}</span> ${this.formatTypeName(type)}`;
        summaryList.appendChild(listItem);
      }
    }

    // Display the modal
    summaryModal.style.display = 'flex';
  }

  /**
   * Format type name for display
   */
  formatTypeName(type) {
    switch (type) {
      case 'display_format':
        return 'Display Format rules';
      case 'ranges':
        return 'Ranges rules';
      case 'capping':
        return 'Capping rules';
      case 'rounding':
        return 'Rounding rules';
      default:
        return type;
    }
  }

  /**
   * Count imported items by type
   */
  countImportItems(config) {
    const counts = {
      display_format: 0,
      ranges: 0,
      capping: 0,
      rounding: 0
    };

    if (config.pdt && Array.isArray(config.pdt)) {
      config.pdt.forEach(section => {
        if (section.display_format && Array.isArray(section.display_format)) {
          counts.display_format += section.display_format.length;
        }
        if (section.ranges && Array.isArray(section.ranges)) {
          counts.ranges += section.ranges.length;
        }
        if (section.capping && Array.isArray(section.capping)) {
          counts.capping += section.capping.length;
        }
        if (section.rounding && Array.isArray(section.rounding)) {
          counts.rounding += section.rounding.length;
        }
      });
    }

    return counts;
  }

  /**
   * Finalize the import process
   */
  finalizeImport() {
    // Convert snake_case to camelCase if needed
    if (this.tempImportedConfig.config_format_version) {
      this.tempImportedConfig.configFormatVersion = this.tempImportedConfig.config_format_version;
      delete this.tempImportedConfig.config_format_version;
    }

    if (this.tempImportedConfig.country_code) {
      this.tempImportedConfig.countryCode = this.tempImportedConfig.country_code;
      delete this.tempImportedConfig.country_code;
    }

    // Update app's config
    this.app.configManager.config = this.tempImportedConfig;

    // Update the metadata form fields in the UI
    this.updateMetadataFields(this.tempImportedConfig);

    // Rebuild groups mapping
    this.app.configManager.rebuildGroupsMapping();

    // Save to localStorage
    this.app.configManager.saveConfig();

    // Re-render UI
    this.app.renderUI();

    // Update YAML preview
    this.app.updateYamlPreview();

    // Validate configuration
    this.app.validateConfiguration();

    alert('Configuration imported successfully!');
  }

  updateMetadataFields(config) {
    // Update the format version field
    const configVersionField = document.getElementById('configVersion');
    if (configVersionField) {
      configVersionField.value = config.configFormatVersion || '1';
    }

    // Update the variant field
    const variantField = document.getElementById('variant');
    if (variantField) {
      variantField.value = config.variant || '';
    }

    // Update the platform field
    const platformField = document.getElementById('platform');
    if (platformField) {
      platformField.value = config.platform || '';
    }

    // Update the country code field
    const countryCodeField = document.getElementById('countryCode');
    if (countryCodeField) {
      countryCodeField.value = config.countryCode || '';
    }
  }

  /**
   * Validate imported config structure
   */
  validateImportedConfig(config) {
    const errors = [];

    // Basic validation
    if (!config) {
      errors.push('Configuration is empty or invalid');
      return { valid: false, errors };
    }

    // Ensure required fields exist or can be defaulted
    if (!config.configFormatVersion && !config.config_format_version) {
      // We'll set a default, but add a warning
      errors.push('Missing config format version, will use default');
    }

    if (!config.variant) {
      errors.push('Missing variant');
    }

    if (!config.platform) {
      errors.push('Missing platform');
    }

    if (!config.pdt) {
      errors.push('Missing PDT configuration');
      return { valid: false, errors };
    }

    if (!Array.isArray(config.pdt)) {
      errors.push('PDT configuration must be an array');
      return { valid: false, errors };
    }

    // Check if any PDT section is valid
    let hasValidSection = false;

    for (const section of config.pdt) {
      if (section.display_format || section.ranges || section.capping || section.rounding) {
        hasValidSection = true;
        break;
      }
    }

    if (!hasValidSection) {
      errors.push('No valid PDT sections found (display_format, ranges, capping, or rounding)');
      return { valid: false, errors };
    }

    // If we have errors that prevent import, return invalid
    const criticalErrors = errors.filter(error =>
      error !== 'Missing config format version, will use default' &&
      error !== 'Missing country code, will use empty value'
    );

    return {
      valid: criticalErrors.length === 0,
      errors
    };
  }

  /**
   * Export configuration as YAML
   */
  exportYaml() {
    // Generate YAML
    const yaml = this.app.yamlHandler.generateYaml(this.app.configManager.getConfig());

    // Create a downloadable file
    const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `pdt-config-${this.app.configManager.config.variant || 'export'}.yml`;

    // Trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Clean up
    document.body.removeChild(downloadLink);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Export configuration as JSON
   */
  exportJson() {
    // Generate JSON
    const json = JSON.stringify(this.app.configManager.getConfig(), null, 2);

    // Create a downloadable file
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `pdt-config-${this.app.configManager.config.variant || 'export'}.json`;

    // Trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Clean up
    document.body.removeChild(downloadLink);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}
