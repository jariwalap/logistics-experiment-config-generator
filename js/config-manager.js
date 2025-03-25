/**
 * ConfigManager handles the data structure for the PDT configuration.
 * It manages groups, rules, and their parameters.
 */
export class ConfigManager {
  constructor() {
    this.config = {
      configFormatVersion: '1',
      variant: 'config-a',
      platform: 'talabat',
      countryCode: 'bh',
      pdt: []
    };

    // Keep track of groups by ID
    this.groups = {};

    // Counter for generating unique IDs
    this.idCounter = 0;
  }

  /**
   * Initialize with default config or load from storage
   */
  initializeConfig() {
    // Try to load from local storage if available
    const savedConfig = localStorage.getItem('pdtConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        this.config = parsedConfig;

        // Reconstruct the groups mapping
        this.rebuildGroupsMapping();
      } catch (e) {
        console.error('Failed to parse saved config:', e);
        // Continue with default config
      }
    }
  }

  /**
   * Rebuild the groups mapping from config
   */
  rebuildGroupsMapping() {
    this.groups = {};
    this.idCounter = 0;

    // Process each section type
    this.config.pdt.forEach(section => {
      const sectionType = this.getSectionType(section);

      if (sectionType === 'display-format' && section.display_format) {
        section.display_format.forEach((entry, index) => {
          const id = `display-format-${this.idCounter++}`;
          // Use stored title or generate a default one
          const title = entry._title || `Display Format ${index + 1}`;

          this.groups[id] = {
            id,
            type: 'display-format',
            title: title,
            commonParams: {
              deliveryMode: entry.conditions?.delivery_mode || '',
              marketplace: entry.conditions?.marketplace?.toString() || 'false',
              pdtLessThanOrEqualTo: entry.conditions?.pdt_less_than_or_equal_to || '',
              verticalType: entry.conditions?.vertical_types?.[0] || ''
            },
            rules: [{
              format: entry.format,
              conditions: entry.conditions || {}
            }]
          };
        });
      } else if (sectionType === 'ranges' && section.ranges) {
        section.ranges.forEach((entry, index) => {
          const id = `ranges-${this.idCounter++}`;

          // Determine vertical type
          let verticalType = '';
          if (entry.conditions?.vertical_types && entry.conditions.vertical_types.length > 0) {
            verticalType = entry.conditions.vertical_types[0];
          }

          // Use stored title or generate a default one
          const title = entry._title || this.generateRangeTitle(entry);

          this.groups[id] = {
            id,
            type: 'ranges',
            title: title,
            commonParams: {
              deliveryOption: entry.delivery_option || 'STANDARD',
              deliveryMode: entry.conditions?.delivery_mode || 'DELIVERY',
              marketplace: entry.conditions?.marketplace?.toString() || 'false',
              verticalType: verticalType
            },
            rules: [{
              lowerBound: entry.lower_bound,
              upperBound: entry.upper_bound,
              pdtGreaterThan: entry.conditions?.pdt_greater_than || null,
              pdtLessThanOrEqualTo: entry.conditions?.pdt_less_than_or_equal_to || null,
              meanDelayGreaterThan: entry.conditions?.mean_delay_greater_than || null,
              meanDelayLessThanOrEqualTo: entry.conditions?.mean_delay_less_than_or_equal_to || null
            }]
          };
        });
      } else if (sectionType === 'capping' && section.capping) {
        section.capping.forEach((entry, index) => {
          const id = `capping-${this.idCounter++}`;

          // Create single rule or ranges rule
          const rules = [];

          if (entry.ranges) {
            rules.push({
              type: 'ranges',
              minLowerBound: entry.ranges.min.lower_bound,
              minUpperBound: entry.ranges.min.upper_bound,
              maxLowerBound: entry.ranges.max.lower_bound,
              maxUpperBound: entry.ranges.max.upper_bound
            });
          }

          if (entry.single) {
            rules.push({
              type: 'single',
              min: entry.single.min,
              max: entry.single.max
            });
          }

          // Use stored title or generate a default one
          const title = entry._title || `Capping ${index + 1}`;

          this.groups[id] = {
            id,
            type: 'capping',
            title: title,
            commonParams: {
              deliveryOption: entry.delivery_option || 'STANDARD',
              deliveryMode: entry.conditions?.delivery_mode || ''
            },
            rules
          };
        });
      } else if (sectionType === 'rounding' && section.rounding) {
        section.rounding.forEach((entry, index) => {
          const id = `rounding-${this.idCounter++}`;

          // Use stored title or generate a default one
          const title = entry._title || `Rounding ${index + 1}`;

          this.groups[id] = {
            id,
            type: 'rounding',
            title: title,
            commonParams: {
              strategy: entry.strategy || 'NEAREST_5'
            },
            rules: []
          };
        });
      }
    });
  }

  /**
   * Determine the section type from a section object
   */
  getSectionType(section) {
    if (section.display_format) return 'display-format';
    if (section.ranges) return 'ranges';
    if (section.capping) return 'capping';
    if (section.rounding) return 'rounding';
    return 'unknown';
  }

  /**
   * Generate a descriptive title for a range entry
   */
  generateRangeTitle(entry) {
    const pdtPart = entry.conditions?.pdt_greater_than || entry.conditions?.pdt_less_than_or_equal_to
      ? `PDT ${entry.conditions.pdt_greater_than || ''}-${entry.conditions.pdt_less_than_or_equal_to || ''}`
      : 'PDT Range';

    let verticalPart = '';
    if (entry.conditions?.vertical_types && entry.conditions.vertical_types.length > 0) {
      verticalPart = entry.conditions.vertical_types[0].charAt(0).toUpperCase() +
        entry.conditions.vertical_types[0].slice(1);
    }

    return verticalPart ? `${verticalPart} ${pdtPart}` : pdtPart;
  }

  /**
   * Get the full config object
   */
  getConfig() {
    return this.config;
  }

  /**
   * Update metadata field
   */
  updateMetadata(field, value) {
    this.config[field] = value;
    this.saveConfig();
  }

  /**
   * Save config to localStorage
   */
  saveConfig() {
    try {
      localStorage.setItem('pdtConfig', JSON.stringify(this.config));
    } catch (e) {
      console.error('Failed to save config:', e);
    }
  }

  /**
   * Update the configuration object based on current groups
   */
  updateConfigFromGroups() {
    // Clear current PDT sections
    this.config.pdt = [];

    // Group the groups by section type
    const sectionGroups = {
      'display-format': [],
      'ranges': [],
      'capping': [],
      'rounding': []
    };

    // Collect groups by type
    Object.values(this.groups).forEach(group => {
      if (sectionGroups[group.type]) {
        sectionGroups[group.type].push(group);
      }
    });

    // Process display-format
    if (sectionGroups['display-format'].length > 0) {
      const displayFormatSection = {
        display_format: []
      };

      sectionGroups['display-format'].forEach(group => {
        group.rules.forEach(rule => {
          const entry = {
            format: rule.format,
            _title: group.title // Store the custom title
          };

          // Add conditions if any are set
          const conditions = {};
          let hasConditions = false;

          if (group.commonParams.deliveryMode) {
            conditions.delivery_mode = group.commonParams.deliveryMode;
            hasConditions = true;
          }

          if (group.commonParams.marketplace !== undefined) {
            conditions.marketplace = group.commonParams.marketplace === 'true';
            hasConditions = true;
          }

          if (group.commonParams.pdtLessThanOrEqualTo) {
            conditions.pdt_less_than_or_equal_to = parseInt(group.commonParams.pdtLessThanOrEqualTo);
            hasConditions = true;
          }

          if (group.commonParams.verticalType) {
            conditions.vertical_types = [group.commonParams.verticalType];
            hasConditions = true;
          }

          if (hasConditions) {
            entry.conditions = conditions;
          }

          displayFormatSection.display_format.push(entry);
        });
      });

      this.config.pdt.push(displayFormatSection);
    }

    // Process ranges
    if (sectionGroups['ranges'].length > 0) {
      const rangesSection = {
        ranges: []
      };

      sectionGroups['ranges'].forEach(group => {
        group.rules.forEach(rule => {
          const entry = {
            delivery_option: group.commonParams.deliveryOption || 'STANDARD',
            lower_bound: rule.lowerBound,
            upper_bound: rule.upperBound,
            _title: group.title // Store the custom title
          };


          // Add conditions
          entry.conditions = {};

          // PDT conditions
          if (rule.pdtGreaterThan !== null && rule.pdtGreaterThan !== undefined) {
            entry.conditions.pdt_greater_than = rule.pdtGreaterThan;
          }

          if (rule.pdtLessThanOrEqualTo !== null && rule.pdtLessThanOrEqualTo !== undefined) {
            entry.conditions.pdt_less_than_or_equal_to = rule.pdtLessThanOrEqualTo;
          }

          // Mean delay conditions
          if (rule.meanDelayGreaterThan !== null && rule.meanDelayGreaterThan !== undefined) {
            entry.conditions.mean_delay_greater_than = rule.meanDelayGreaterThan;
          }

          if (rule.meanDelayLessThanOrEqualTo !== null && rule.meanDelayLessThanOrEqualTo !== undefined) {
            entry.conditions.mean_delay_less_than_or_equal_to = rule.meanDelayLessThanOrEqualTo;
          }

          // Common conditions
          if (group.commonParams.deliveryMode) {
            entry.conditions.delivery_mode = group.commonParams.deliveryMode;
          }

          if (group.commonParams.marketplace !== undefined) {
            entry.conditions.marketplace = group.commonParams.marketplace === 'true';
          }

          // Vertical types
          if (group.commonParams.verticalType) {
            entry.conditions.vertical_types = [group.commonParams.verticalType];
          }

          rangesSection.ranges.push(entry);
        });
      });

      this.config.pdt.push(rangesSection);
    }

    // Process capping
    if (sectionGroups['capping'].length > 0) {
      const cappingSection = {
        capping: []
      };

      sectionGroups['capping'].forEach(group => {
        // Create a base entry with delivery option
        const entry = {
          delivery_option: group.commonParams.deliveryOption || 'STANDARD',
          _title: group.title // Store the custom title
        };

        // Add conditions if any are set
        const conditions = {};
        let hasConditions = false;

        if (group.commonParams.deliveryMode) {
          conditions.delivery_mode = group.commonParams.deliveryMode;
          hasConditions = true;
        }

        if (group.commonParams.marketplace !== undefined) {
          conditions.marketplace = group.commonParams.marketplace === 'true';
          hasConditions = true;
        }

        if (group.commonParams.pdtGreaterThan) {
          conditions.pdt_greater_than = parseInt(group.commonParams.pdtGreaterThan);
          hasConditions = true;
        }

        if (group.commonParams.pdtLessThanOrEqualTo) {
          conditions.pdt_less_than_or_equal_to = parseInt(group.commonParams.pdtLessThanOrEqualTo);
          hasConditions = true;
        }

        if (group.commonParams.meanDelayGreaterThan) {
          conditions.mean_delay_greater_than = parseInt(group.commonParams.meanDelayGreaterThan);
          hasConditions = true;
        }

        if (group.commonParams.meanDelayLessThanOrEqualTo) {
          conditions.mean_delay_less_than_or_equal_to = parseInt(group.commonParams.meanDelayLessThanOrEqualTo);
          hasConditions = true;
        }

        if (group.commonParams.verticalType) {
          conditions.vertical_types = [group.commonParams.verticalType];
          hasConditions = true;
        }

        if (hasConditions) {
          entry.conditions = conditions;
        }

        // Process each rule
        const singleRules = group.rules.filter(rule => rule.type === 'single');
        const rangesRules = group.rules.filter(rule => rule.type === 'ranges');

        // Add single capping if any rule has type 'single'
        if (singleRules.length > 0) {
          entry.single = {
            min: singleRules[0].min,
            max: singleRules[0].max
          };
        }

        // Add ranges capping if any rule has type 'ranges'
        if (rangesRules.length > 0) {
          entry.ranges = {
            min: {
              lower_bound: rangesRules[0].minLowerBound,
              upper_bound: rangesRules[0].minUpperBound
            },
            max: {
              lower_bound: rangesRules[0].maxLowerBound,
              upper_bound: rangesRules[0].maxUpperBound
            }
          };
        }

        cappingSection.capping.push(entry);
      });

      this.config.pdt.push(cappingSection);
    }

    // Process rounding
    if (sectionGroups['rounding'].length > 0) {
      const roundingSection = {
        rounding: []
      };

      sectionGroups['rounding'].forEach(group => {
        roundingSection.rounding.push({
          strategy: group.commonParams.strategy || 'NEAREST_5',
          _title: group.title // Store the custom title
        });
      });

      this.config.pdt.push(roundingSection);
    }

    this.saveConfig();
  }

  /**
   * Get groups for a specific section
   */
  getGroupsForSection(sectionType) {
    return Object.values(this.groups)
      .filter(group => group.type === sectionType)
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  /**
   * Get a specific group by ID
   */
  getGroup(groupId) {
    return this.groups[groupId];
  }

  /**
   * Add a new group for the specified section
   */
  addGroup(sectionType, templateGroup = null) {
    const id = `${sectionType}-${this.idCounter++}`;

    // Create default group or use template
    if (templateGroup) {
      // If template group is for a different section type, adapt it
      if (templateGroup.type !== sectionType) {
        // Create adapted group based on the target section type
        this.groups[id] = this.adaptTemplateToSectionType(templateGroup, sectionType, id);
      } else {
        // Use template as is if types match
        this.groups[id] = {
          ...templateGroup,
          id
        };
      }
    } else {
      this.groups[id] = {
        id,
        type: sectionType,
        title: `New ${this.sectionTypeToDisplayName(sectionType)}`,
        commonParams: {},
        rules: this.createDefaultRules(sectionType)
      };
    }

    // Update config
    this.updateConfigFromGroups();

    return id;
  }

  adaptTemplateToSectionType(templateGroup, targetSectionType, newId) {
    // Start with common structure
    const adaptedGroup = {
      id: newId,
      type: targetSectionType,
      title: `New ${this.sectionTypeToDisplayName(targetSectionType)}`,
      commonParams: {},
      rules: []
    };

    // Adapt common parameters and rules based on target section type
    switch (targetSectionType) {
      case 'display-format':
        adaptedGroup.commonParams = {
          deliveryMode: templateGroup.commonParams.deliveryMode || 'DELIVERY',
          marketplace: templateGroup.commonParams.marketplace || 'false'
        };
        adaptedGroup.rules = this.createDefaultRules('display-format');
        break;

      case 'ranges':
        adaptedGroup.commonParams = {
          deliveryOption: templateGroup.commonParams.deliveryOption || 'STANDARD',
          deliveryMode: templateGroup.commonParams.deliveryMode || 'DELIVERY',
          marketplace: templateGroup.commonParams.marketplace || 'false',
          verticalType: templateGroup.commonParams.verticalType || ''
        };
        adaptedGroup.rules = this.createDefaultRules('ranges');
        break;

      case 'capping':
        adaptedGroup.commonParams = {
          deliveryOption: templateGroup.commonParams.deliveryOption || 'STANDARD',
          deliveryMode: templateGroup.commonParams.deliveryMode || 'DELIVERY'
        };
        adaptedGroup.rules = this.createDefaultRules('capping');
        break;

      case 'rounding':
        adaptedGroup.commonParams = {
          strategy: 'NEAREST_5'
        };
        adaptedGroup.rules = [];
        break;
    }

    // Preserve the template group title if possible
    if (templateGroup.title) {
      adaptedGroup.title = templateGroup.title;
    }

    return adaptedGroup;
  }

  /**
   * Create default rules for a new group
   */
  createDefaultRules(sectionType) {
    switch (sectionType) {
      case 'display-format':
        return [{
          format: 'DISPLAY_FORMAT_MINUTE_RANGE',
          conditions: {}
        }];
      case 'ranges':
        return [{
          lowerBound: -10,
          upperBound: 5,
          pdtGreaterThan: null,
          pdtLessThanOrEqualTo: null,
          meanDelayGreaterThan: null,
          meanDelayLessThanOrEqualTo: null
        }];
      case 'capping':
        return [{
          type: 'single',
          min: 5,
          max: 180
        }];
      case 'rounding':
        // Rounding doesn't have specific rules
        return [];
      default:
        return [];
    }
  }

  /**
   * Clone an existing group
   */
  cloneGroup(groupId) {
    const sourceGroup = this.groups[groupId];
    if (!sourceGroup) return null;

    const id = `${sourceGroup.type}-${this.idCounter++}`;

    // Deep clone the group
    this.groups[id] = JSON.parse(JSON.stringify(sourceGroup));
    this.groups[id].id = id;
    this.groups[id].title = `Copy of ${sourceGroup.title}`;

    // Update config
    this.updateConfigFromGroups();

    return id;
  }

  /**
   * Delete a group
   */
  deleteGroup(sectionType, groupId) {
    if (this.groups[groupId]) {
      delete this.groups[groupId];

      // Update config
      this.updateConfigFromGroups();

      return true;
    }

    return false;
  }

  /**
   * Update a common parameter for a group
   */
  updateGroupCommonParam(groupId, paramName, value) {
    if (this.groups[groupId]) {
      this.groups[groupId].commonParams[paramName] = value;

      // Update config
      this.updateConfigFromGroups();

      return true;
    }

    return false;
  }

  /**
   * Add a new rule to a group
   */
  addRule(groupId) {
    const group = this.groups[groupId];
    if (!group) return false;

    // Create a default rule based on the section type
    switch (group.type) {
      case 'display-format':
        group.rules.push({
          format: 'DISPLAY_FORMAT_MINUTE_RANGE',
          conditions: {}
        });
        break;
      case 'ranges':
        // For ranges, copy the last rule if available
        if (group.rules.length > 0) {
          const lastRule = group.rules[group.rules.length - 1];
          group.rules.push({...lastRule});
        } else {
          group.rules.push({
            lowerBound: -10,
            upperBound: 5,
            pdtGreaterThan: null,
            pdtLessThanOrEqualTo: null,
            meanDelayGreaterThan: null,
            meanDelayLessThanOrEqualTo: null
          });
        }
        break;
      case 'capping':
        group.rules.push({
          type: 'single',
          min: 5,
          max: 180
        });
        break;
    }

    // Update config
    this.updateConfigFromGroups();

    return true;
  }

  /**
   * Update a rule field
   */
  updateRule(groupId, ruleIndex, field, value) {
    const group = this.groups[groupId];
    if (!group || !group.rules[ruleIndex]) return false;

    // If changing rule type in capping, we need to set defaults for the new type
    if (group.type === 'capping' && field === 'type') {
      if (value === 'single') {
        group.rules[ruleIndex] = {
          type: 'single',
          min: 5,
          max: 180
        };
      } else if (value === 'ranges') {
        group.rules[ruleIndex] = {
          type: 'ranges',
          minLowerBound: 10,
          minUpperBound: 20,
          maxLowerBound: 160,
          maxUpperBound: 180
        };
      }
    } else {
      // Normal field update
      group.rules[ruleIndex][field] = value;
    }

    // Update config
    this.updateConfigFromGroups();

    return true;
  }

  /**
   * Delete a rule from a group
   */
  deleteRule(groupId, ruleIndex) {
    const group = this.groups[groupId];
    if (!group || !group.rules[ruleIndex]) return false;

    group.rules.splice(ruleIndex, 1);

    // Update config
    this.updateConfigFromGroups();

    return true;
  }

  /**
   * Convert section type to display name
   */
  sectionTypeToDisplayName(sectionType) {
    const nameMap = {
      'display-format': 'Display Format',
      'ranges': 'Range',
      'capping': 'Capping',
      'rounding': 'Rounding'
    };

    return nameMap[sectionType] || sectionType;
  }

  updateGroupTitle(groupId, newTitle) {
    if (this.groups[groupId]) {
      this.groups[groupId].title = newTitle;

      // Update config
      this.updateConfigFromGroups();

      // Explicitly save to localStorage
      this.saveConfig();

      return true;
    }

    return false;
  }

  resetConfig() {
    // Reset to default empty configuration
    this.config = {
      configFormatVersion: '1',
      variant: 'config-a',
      platform: 'talabat',
      countryCode: 'bh',
      pdt: []
    };

    // Clear all groups
    this.groups = {};

    // Reset ID counter
    this.idCounter = 0;

    // Save the empty config
    this.saveConfig();
  }
}
