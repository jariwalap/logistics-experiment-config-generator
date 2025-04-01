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

      // Make sure snake_case versions of metadata fields exist
      if (configClone.configFormatVersion !== undefined) {
        configClone.config_format_version = configClone.configFormatVersion;
        delete configClone.configFormatVersion; // Remove to avoid duplication
      }

      if (configClone.countryCode !== undefined) {
        configClone.country_code = configClone.countryCode;
        delete configClone.countryCode; // Remove to avoid duplication
      }

      // Convert boolean values properly for YAML
      this.processConfigForYaml(configClone);

      // Instead of using jsyaml to generate YAML, directly use our custom formatter
      // This ensures our comments are always added correctly
      return this.formatConfigWithComments(configClone);
    } catch (e) {
      console.error('Failed to generate YAML:', e);
      return 'Error generating YAML: ' + e.message;
    }
  }

  formatConfigWithComments(config) {
    const lines = [];

    // Add config header
    lines.push(`config_format_version: ${config.config_format_version || '1'}`);
    lines.push(`variant: ${config.variant || ''}`);
    lines.push(`platform: ${config.platform || ''}`);
    lines.push(`country_code: ${config.country_code || ''}`);
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
          // Group ranges by their conditions for better organization
          const groupedRanges = {};

          section.ranges.forEach(range => {
            // Always use generateRangeDescription to ensure consistency
            const description = range._title || this.generateRangeDescription(range);

            if (!groupedRanges[description]) {
              groupedRanges[description] = [];
            }

            groupedRanges[description].push(range);
          });

          // Add each group with its descriptive comment
          Object.entries(groupedRanges).forEach(([description, ranges]) => {
            lines.push('');
            lines.push(`  # ${description}`);
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

  /**
   * Process config object for YAML conversion
   */
  processConfigForYaml(config) {

    // Ensure the snake_case versions of metadata fields are set
    if (config.configFormatVersion !== undefined) {
      config.config_format_version = config.configFormatVersion;
      delete config.configFormatVersion; // Remove camelCase version to avoid duplication
    }

    if (config.countryCode !== undefined) {
      config.country_code = config.countryCode;
      delete config.countryCode; // Remove camelCase version to avoid duplication
    }


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

  generateRangeDescription(range) {
    let description = '';

    if (range.conditions) {
      // PDT range description
      const pdtGreaterThan = range.conditions.pdt_greater_than;
      const pdtLessThanOrEqualTo = range.conditions.pdt_less_than_or_equal_to;

      if (pdtGreaterThan !== undefined || pdtLessThanOrEqualTo !== undefined) {
        description += 'PDT ';

        if (pdtGreaterThan !== undefined && pdtLessThanOrEqualTo !== undefined) {
          description += `${pdtGreaterThan}-${pdtLessThanOrEqualTo}`;
        } else if (pdtGreaterThan !== undefined) {
          description += `>${pdtGreaterThan}`;
        } else if (pdtLessThanOrEqualTo !== undefined) {
          description += `≤${pdtLessThanOrEqualTo}`;
        }
      }

      // Mean Delay range description
      const mdGreaterThan = range.conditions.mean_delay_greater_than;
      const mdLessThanOrEqualTo = range.conditions.mean_delay_less_than_or_equal_to;

      if (mdGreaterThan !== undefined || mdLessThanOrEqualTo !== undefined) {
        if (description) {
          description += ', Mean Delay ';
        } else {
          description += 'Mean Delay ';
        }

        if (mdGreaterThan !== undefined && mdLessThanOrEqualTo !== undefined) {
          description += `${mdGreaterThan}-${mdLessThanOrEqualTo}`;
        } else if (mdGreaterThan !== undefined) {
          description += `>${mdGreaterThan}`;
        } else if (mdLessThanOrEqualTo !== undefined) {
          description += `≤${mdLessThanOrEqualTo}`;
        }
      }
    }

    return description || 'Default';
  }

  formatYaml(yaml) {
    if (!window.jsyaml) {
      return yaml; // Can't format without js-yaml
    }

    try {
      // Parse the YAML to an object
      const obj = window.jsyaml.load(yaml);

      // Make sure snake_case versions of metadata fields are properly handled
      // Check if the camelCase versions exist and use them to set the snake_case versions
      if (obj.configFormatVersion !== undefined && obj.config_format_version === undefined) {
        obj.config_format_version = obj.configFormatVersion;
      }

      if (obj.countryCode !== undefined && obj.country_code === undefined) {
        obj.country_code = obj.countryCode;
      }

      // Clean up the camelCase versions to avoid duplication
      delete obj.configFormatVersion;
      delete obj.countryCode;

      // Then re-generate with proper formatting
      return this.generateYaml(obj);
    } catch (e) {
      console.error('Failed to format YAML:', e);
      return yaml; // Return original if formatting fails
    }
  }
}
