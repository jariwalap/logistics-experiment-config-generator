/**
 * YamlHandler manages the conversion between the config object and YAML.
 * It uses the js-yaml library for parsing and generation.
 */
export class YamlHandler {
  constructor() {
    // Ensure jsYaml is available
    if (!window.jsyaml) {
      console.error('js-yaml library not loaded. YAML functionality will be limited.');
    }
  }

  /**
   * Generate YAML from a config object
   */
  generateYaml(config) {
    if (!window.jsyaml) return JSON.stringify(config, null, 2);

    try {
      // Clone the config to avoid modifying the original
      const configClone = JSON.parse(JSON.stringify(config));

      // Convert boolean values properly for YAML (they get automatically handled by jsyaml)
      this.processConfigForYaml(configClone);

      // Generate YAML using jsyaml
      const yaml = window.jsyaml.dump(configClone, {
        indent: 2,
        lineWidth: -1, // Don't wrap long lines
        noRefs: true
      });

      // Add comment headers for sections
      return this.addCommentsToYaml(yaml, configClone);
    } catch (e) {
      console.error('Failed to generate YAML:', e);
      return 'Error generating YAML: ' + e.message;
    }
  }

  /**
   * Process config object for YAML conversion
   */
  processConfigForYaml(config) {
    // Process PDT sections
    if (config.pdt && Array.isArray(config.pdt)) {
      config.pdt.forEach(section => {
        // Handle ranges section
        if (section.ranges && Array.isArray(section.ranges)) {
          section.ranges.forEach(range => {
            // Process conditions
            if (range.conditions) {
              // Convert string boolean to actual boolean
              if (range.conditions.marketplace !== undefined) {
                if (typeof range.conditions.marketplace === 'string') {
                  range.conditions.marketplace =
                    range.conditions.marketplace === 'true';
                }
              }
            }
          });
        }

        // Handle display-format section
        if (section.display_format && Array.isArray(section.display_format)) {
          section.display_format.forEach(format => {
            // Process conditions
            if (format.conditions) {
              // Convert string boolean to actual boolean
              if (format.conditions.marketplace !== undefined) {
                if (typeof format.conditions.marketplace === 'string') {
                  format.conditions.marketplace =
                    format.conditions.marketplace === 'true';
                }
              }
            }
          });
        }

        // Handle capping section (similar processing would be needed)
        if (section.capping && Array.isArray(section.capping)) {
          section.capping.forEach(entry => {
            // Ensure proper structure for ranges
            if (entry.ranges) {
              // Ensure min has both lower_bound and upper_bound
              if (entry.ranges.min) {
                if (typeof entry.ranges.min.lower_bound !== 'number') {
                  entry.ranges.min.lower_bound = entry.ranges.min.lower_bound || 0;
                }
                if (typeof entry.ranges.min.upper_bound !== 'number') {
                  entry.ranges.min.upper_bound = entry.ranges.min.upper_bound || 0;
                }
              }

              // Ensure max has both lower_bound and upper_bound
              if (entry.ranges.max) {
                if (typeof entry.ranges.max.lower_bound !== 'number') {
                  entry.ranges.max.lower_bound = entry.ranges.max.lower_bound || 0;
                }
                if (typeof entry.ranges.max.upper_bound !== 'number') {
                  entry.ranges.max.upper_bound = entry.ranges.max.upper_bound || 0;
                }
              }
            }
          });
        }
      });
    }
  }

  /**
   * Add comments to the generated YAML for better readability
   */
  addCommentsToYaml(yaml, config) {
    const lines = [];

    // Add config header
    lines.push('config_format_version: ' + config.configFormatVersion);
    lines.push('variant: ' + config.variant);
    lines.push('platform: ' + config.platform);
    lines.push('country_code: ' + config.countryCode);
    lines.push('');
    lines.push('pdt:');

    // Process each PDT section
    if (config.pdt && Array.isArray(config.pdt)) {
      config.pdt.forEach((section, index) => {
        // Add section header comments based on section type
        if (section.display_format) {
          lines.push('');
          lines.push('  # Display Format Configuration');

          // Add each display format with its title as a comment
          section.display_format.forEach(entry => {
            if (entry._title) {
              lines.push(`  # ${entry._title}`);
            }

            lines.push('  - display_format:');
            lines.push(`    - format: ${entry.format}`);

            if (entry.conditions) {
              lines.push('      conditions:');
              Object.entries(entry.conditions).forEach(([key, value]) => {
                // Skip internal properties
                if (!key.startsWith('_')) {
                  if (Array.isArray(value)) {
                    lines.push(`        ${key}:`);
                    value.forEach(item => {
                      lines.push(`          - ${item}`);
                    });
                  } else {
                    lines.push(`        ${key}: ${value}`);
                  }
                }
              });
            }
          });
        }
        else if (section.ranges) {
          // For ranges, use the categorized approach but include titles
          const categorizedRanges = {};

          section.ranges.forEach(entry => {
            // Use title as category if available
            const category = entry._title || this.determineRangeCategory(entry);

            if (!categorizedRanges[category]) {
              categorizedRanges[category] = [];
            }

            categorizedRanges[category].push(entry);
          });

          // Add each category
          Object.entries(categorizedRanges).forEach(([category, ranges]) => {
            lines.push('');
            lines.push(`  # ${category}`);
            lines.push('  - ranges:');

            ranges.forEach(range => {
              // Generate YAML for this range entry
              lines.push(`    - delivery_option: ${range.delivery_option}`);
              lines.push(`      lower_bound: ${range.lower_bound}`);
              lines.push(`      upper_bound: ${range.upper_bound}`);

              if (range.conditions) {
                lines.push('      conditions:');
                Object.entries(range.conditions).forEach(([key, value]) => {
                  // Skip internal properties
                  if (!key.startsWith('_')) {
                    if (Array.isArray(value)) {
                      lines.push(`        ${key}:`);
                      value.forEach(item => {
                        lines.push(`          - ${item}`);
                      });
                    } else {
                      lines.push(`        ${key}: ${value}`);
                    }
                  }
                });
              }
            });
          });
        }
        else if (section.capping) {
          lines.push('');
          lines.push('  # Capping Configuration');

          // Add each capping entry with its title as a comment
          section.capping.forEach(entry => {
            if (entry._title) {
              lines.push(`  # ${entry._title}`);
            }

            lines.push('  - capping:');
            lines.push(`    - delivery_option: ${entry.delivery_option}`);

            if (entry.conditions) {
              lines.push('      conditions:');
              Object.entries(entry.conditions).forEach(([key, value]) => {
                // Skip internal properties
                if (!key.startsWith('_')) {
                  if (Array.isArray(value)) {
                    lines.push(`        ${key}:`);
                    value.forEach(item => {
                      lines.push(`          - ${item}`);
                    });
                  } else {
                    lines.push(`        ${key}: ${value}`);
                  }
                }
              });
            }

            if (entry.single) {
              lines.push('      single:');
              lines.push(`        min: ${entry.single.min}`);
              lines.push(`        max: ${entry.single.max}`);
            }

            if (entry.ranges) {
              lines.push('      ranges:');
              lines.push('        min:');
              lines.push(`          lower_bound: ${entry.ranges.min.lower_bound}`);
              lines.push(`          upper_bound: ${entry.ranges.min.upper_bound}`);
              lines.push('        max:');
              lines.push(`          lower_bound: ${entry.ranges.max.lower_bound}`);
              lines.push(`          upper_bound: ${entry.ranges.max.upper_bound}`);
            }
          });
        }
        else if (section.rounding) {
          lines.push('');
          lines.push('  # Rounding Configuration');

          // Add each rounding entry with its title as a comment
          section.rounding.forEach(entry => {
            if (entry._title) {
              lines.push(`  # ${entry._title}`);
            }

            lines.push('  - rounding:');
            lines.push(`    - strategy: ${entry.strategy}`);
          });
        }
      });
    }

    return lines.join('\n');
  }

  determineRangeCategory(range) {
    let category = 'Other Ranges';

    // Try to determine vertical type
    if (range.conditions && range.conditions.vertical_types) {
      const verticalType = range.conditions.vertical_types[0];
      if (verticalType === 'restaurants') {
        category = 'Restaurant Ranges';
      } else if (verticalType === 'darkstores') {
        category = 'Darkstore Ranges';
      }
    }

    // Add PDT range info if available
    if (range.conditions) {
      const pdtFrom = range.conditions.pdt_greater_than;
      const pdtTo = range.conditions.pdt_less_than_or_equal_to;

      if (pdtFrom !== undefined || pdtTo !== undefined) {
        let pdtRange = '';

        if (pdtFrom !== undefined && pdtTo !== undefined) {
          pdtRange = ` (PDT ${pdtFrom}-${pdtTo})`;
        } else if (pdtFrom !== undefined) {
          pdtRange = ` (PDT >${pdtFrom})`;
        } else if (pdtTo !== undefined) {
          pdtRange = ` (PDT ≤${pdtTo})`;
        }

        category += pdtRange;
      }
    }

    return category;
  }


  /**
   * Add a YAML section with appropriate indentation
   */
  addYamlSection(result, sectionName, entries) {
    result.push(`  - ${sectionName}:`);

    // Special handling for capping section
    if (sectionName === 'capping') {
      entries.forEach((entry, index) => {
        result.push(`    - delivery_option: ${entry.delivery_option}`);

        if (entry.conditions) {
          result.push('      conditions:');
          Object.entries(entry.conditions).forEach(([key, value]) => {
            result.push(`        ${key}: ${value}`);
          });
        }

        if (entry.single) {
          result.push('      single:');
          result.push(`        min: ${entry.single.min}`);
          result.push(`        max: ${entry.single.max}`);
        }

        if (entry.ranges) {
          result.push('      ranges:');
          result.push('        min:');
          result.push(`          lower_bound: ${entry.ranges.min.lower_bound}`);
          result.push(`          upper_bound: ${entry.ranges.min.upper_bound}`);
          result.push('        max:');
          result.push(`          lower_bound: ${entry.ranges.max.lower_bound}`);
          result.push(`          upper_bound: ${entry.ranges.max.upper_bound}`);
        }

        if (index < entries.length - 1) {
          result.push('');
        }
      });
      return;
    }

    // Default handling for other sections
    const entriesYaml = window.jsyaml.dump(entries, {
      indent: 2,
      lineWidth: -1,
      noRefs: true
    });

    // Add proper indentation and handle edge cases
    const entryLines = entriesYaml.split('\n');
    entryLines.forEach(line => {
      if (line.trim()) {
        result.push('    ' + line);
      }
    });
  }

  /**
   * Categorize ranges for better organization in YAML
   */
  categorizeRanges(ranges) {
    const categories = {};

    ranges.forEach(range => {
      let category = 'Other Ranges';

      // Try to determine vertical type
      if (range.conditions && range.conditions.vertical_types) {
        const verticalType = range.conditions.vertical_types[0];
        if (verticalType === 'restaurants') {
          category = 'Restaurant Ranges';
        } else if (verticalType === 'darkstores') {
          category = 'Darkstore Ranges';
        }
      }

      // Add PDT range info if available
      if (range.conditions) {
        const pdtFrom = range.conditions.pdt_greater_than;
        const pdtTo = range.conditions.pdt_less_than_or_equal_to;

        if (pdtFrom !== undefined || pdtTo !== undefined) {
          let pdtRange = '';

          if (pdtFrom !== undefined && pdtTo !== undefined) {
            pdtRange = ` (PDT ${pdtFrom}-${pdtTo})`;
          } else if (pdtFrom !== undefined) {
            pdtRange = ` (PDT >${pdtFrom})`;
          } else if (pdtTo !== undefined) {
            pdtRange = ` (PDT ≤${pdtTo})`;
          }

          category += pdtRange;
        }
      }

      // Initialize category if not exists
      if (!categories[category]) {
        categories[category] = [];
      }

      categories[category].push(range);
    });

    return categories;
  }

  /**
   * Parse YAML to a config object
   */
  parseYaml(yaml) {
    if (!window.jsyaml) {
      console.error('js-yaml library not loaded. Cannot parse YAML.');
      return null;
    }

    try {
      return window.jsyaml.load(yaml);
    } catch (e) {
      console.error('Failed to parse YAML:', e);
      return null;
    }
  }

  /**
   * Format a YAML string with proper indentation
   */
  formatYaml(yaml) {
    if (!window.jsyaml) {
      return yaml; // Can't format without js-yaml
    }

    try {
      // Parse the YAML to an object
      const obj = window.jsyaml.load(yaml);

      // Then re-generate with proper formatting
      return this.generateYaml(obj);
    } catch (e) {
      console.error('Failed to format YAML:', e);
      return yaml; // Return original if formatting fails
    }
  }
}
