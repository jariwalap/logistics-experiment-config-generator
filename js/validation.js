/**
 * ValidationManager handles validation of configuration values.
 * It provides validation rules for each field and section.
 */
export class ValidationManager {
  constructor(configManager) {
    // Define validation rules
    this.rules = this.initializeRules();
    this.configManager = configManager;
  }

  /**
   * Initialize validation rules
   */
  initializeRules() {
    return {
      // Metadata validation
      metadata: {
        configFormatVersion: {
          required: true,
          validator: (value) => value && value.trim() !== '',
          message: 'Config format version is required'
        },
        variant: {
          required: true,
          validator: (value) => value && value.trim() !== '',
          message: 'Variant is required'
        },
        platform: {
          required: false,
          validator: (value) => !value || value.trim() !== '',
          message: 'Platform must not be empty if provided'
        },
        countryCode: {
          required: false,
          validator: (value) => !value || /^[A-Za-z]{2}$/.test(value),
          message: 'Country code must be a 2-letter code'
        }
      },

      // Display format validation
      'display-format': {
        format: {
          required: true,
          validator: (value) => [
            'DISPLAY_FORMAT_MINUTE_VALUE',
            'DISPLAY_FORMAT_MINUTE_RANGE',
            'DISPLAY_FORMAT_ETA_RANGE'
          ].includes(value),
          message: 'Invalid display format value'
        },
        conditions: {
          required: false,
          validator: (value) => true, // Conditions are optional
          message: ''
        }
      },

      // Ranges validation
      ranges: {
        lowerBound: {
          required: true,
          validator: (value) => Number.isInteger(Number(value)),
          message: 'Lower bound must be an integer'
        },
        upperBound: {
          required: true,
          validator: (value) => Number.isInteger(Number(value)),
          message: 'Upper bound must be an integer'
        },
        pdtGreaterThan: {
          required: false,
          validator: (value) => value === null || value === undefined || Number.isInteger(Number(value)),
          message: 'PDT greater than must be an integer if provided'
        },
        pdtLessThanOrEqualTo: {
          required: false,
          validator: (value) => value === null || value === undefined || Number.isInteger(Number(value)),
          message: 'PDT less than or equal to must be an integer if provided'
        },
        meanDelayGreaterThan: {
          required: false,
          validator: (value) => value === null || value === undefined || Number.isInteger(Number(value)),
          message: 'Mean delay greater than must be an integer if provided'
        },
        meanDelayLessThanOrEqualTo: {
          required: false,
          validator: (value) => value === null || value === undefined || Number.isInteger(Number(value)),
          message: 'Mean delay less than or equal to must be an integer if provided'
        },
        // Cross-field validation
        _crossField: {
          pdtRange: {
            validator: (rule) => {
              // If both PDT bounds are provided, greater than should be less than lessThanOrEqual
              if (rule.pdtGreaterThan !== null && rule.pdtGreaterThan !== undefined &&
                rule.pdtLessThanOrEqualTo !== null && rule.pdtLessThanOrEqualTo !== undefined) {
                return Number(rule.pdtGreaterThan) < Number(rule.pdtLessThanOrEqualTo);
              }
              return true;
            },
            message: 'PDT greater than must be less than PDT less than or equal to'
          },
          meanDelayRange: {
            validator: (rule) => {
              // If both mean delay bounds are provided, greater than should be less than lessThanOrEqual
              if (rule.meanDelayGreaterThan !== null && rule.meanDelayGreaterThan !== undefined &&
                rule.meanDelayLessThanOrEqualTo !== null && rule.meanDelayLessThanOrEqualTo !== undefined) {
                return Number(rule.meanDelayGreaterThan) < Number(rule.meanDelayLessThanOrEqualTo);
              }
              return true;
            },
            message: 'Mean delay greater than must be less than mean delay less than or equal to'
          },
          bounds: {
            validator: (rule) => {
              // Lower bound should be less than upper bound
              return Number(rule.lowerBound) < Number(rule.upperBound);
            },
            message: 'Lower bound must be less than upper bound'
          }
        }
      },

      // Capping validation
      capping: {
        type: {
          required: true,
          validator: (value) => ['single', 'ranges'].includes(value),
          message: 'Type must be either "single" or "ranges"'
        },
        min: {
          required: (rule) => rule.type === 'single',
          validator: (value) => Number.isInteger(Number(value)),
          message: 'Min must be an integer'
        },
        max: {
          required: (rule) => rule.type === 'single',
          validator: (value) => Number.isInteger(Number(value)),
          message: 'Max must be an integer'
        },
        minLowerBound: {
          required: (rule) => rule.type === 'ranges',
          validator: (value) => Number.isInteger(Number(value)),
          message: 'Min lower bound must be an integer'
        },
        minUpperBound: {
          required: (rule) => rule.type === 'ranges',
          validator: (value) => Number.isInteger(Number(value)),
          message: 'Min upper bound must be an integer'
        },
        maxLowerBound: {
          required: (rule) => rule.type === 'ranges',
          validator: (value) => Number.isInteger(Number(value)),
          message: 'Max lower bound must be an integer'
        },
        maxUpperBound: {
          required: (rule) => rule.type === 'ranges',
          validator: (value) => Number.isInteger(Number(value)),
          message: 'Max upper bound must be an integer'
        },
        // Cross-field validation
        _crossField: {
          singleRange: {
            validator: (rule) => {
              if (rule.type === 'single') {
                return Number(rule.min) < Number(rule.max);
              }
              return true;
            },
            message: 'Min must be less than max for single capping'
          },
          minRange: {
            validator: (rule) => {
              if (rule.type === 'ranges') {
                return Number(rule.minLowerBound) < Number(rule.minUpperBound);
              }
              return true;
            },
            message: 'Min lower bound must be less than min upper bound'
          },
          maxRange: {
            validator: (rule) => {
              if (rule.type === 'ranges') {
                return Number(rule.maxLowerBound) < Number(rule.maxUpperBound);
              }
              return true;
            },
            message: 'Max lower bound must be less than max upper bound'
          },
          minMaxRange: {
            validator: (rule) => {
              if (rule.type === 'ranges') {
                return Number(rule.minUpperBound) < Number(rule.maxLowerBound);
              }
              return true;
            },
            message: 'Min upper bound must be less than max lower bound'
          }
        }
      },

      // Rounding validation
      rounding: {
        strategy: {
          required: true,
          validator: (value) => [
            'NEAREST_5',
            'NEAREST_10',
            'UP_5',
            'UP_10'
          ].includes(value),
          message: 'Invalid rounding strategy'
        }
      }
    };
  }

  /**
   * Validate a specific field
   */
  validateField(sectionType, field, value, rule) {
    // Get validation rules for this section type
    const sectionRules = this.rules[sectionType];
    if (!sectionRules) {
      // No validation rules for this section type
      return { valid: true };
    }

    // Get validation rule for this field
    const fieldRule = sectionRules[field];
    if (!fieldRule) {
      // No validation rule for this field
      return { valid: true };
    }

    // Check if field is required
    const isRequired = typeof fieldRule.required === 'function'
      ? fieldRule.required(rule)
      : fieldRule.required;

    if (isRequired && (value === null || value === undefined || value === '')) {
      return {
        valid: false,
        message: fieldRule.message
      };
    }

    // If value is provided, validate it
    if (value !== null && value !== undefined && value !== '') {
      if (!fieldRule.validator(value)) {
        return {
          valid: false,
          message: fieldRule.message
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate cross-field rules
   */
  validateCrossField(sectionType, rule) {
    // Get validation rules for this section type
    const sectionRules = this.rules[sectionType];
    if (!sectionRules || !sectionRules._crossField) {
      // No cross-field validation rules for this section type
      return { valid: true };
    }

    // Check each cross-field rule
    for (const [key, crossRule] of Object.entries(sectionRules._crossField)) {
      if (!crossRule.validator(rule)) {
        return {
          valid: false,
          message: crossRule.message
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate a complete rule
   */
  validateRule(sectionType, rule) {
    const errors = {};
    let valid = true;

    // Validate each field
    for (const [field, value] of Object.entries(rule)) {
      const fieldValidation = this.validateField(sectionType, field, value, rule);
      if (!fieldValidation.valid) {
        errors[field] = fieldValidation.message;
        valid = false;
      }
    }

    // Validate cross-field rules
    const crossFieldValidation = this.validateCrossField(sectionType, rule);
    if (!crossFieldValidation.valid) {
      errors._crossField = crossFieldValidation.message;
      valid = false;
    }

    return {
      valid,
      errors
    };
  }

  /**
   * Validate a complete group
   */
  validateGroup(group) {
    const { type, rules } = group;
    const errors = {
      rules: []
    };
    let valid = true;

    // Validate each rule
    rules.forEach((rule, index) => {
      const ruleValidation = this.validateRule(type, rule);
      errors.rules[index] = ruleValidation.errors;

      if (!ruleValidation.valid) {
        valid = false;
      }
    });

    return {
      valid,
      errors
    };
  }

  /**
   * Validate the entire configuration
   */
  validateConfig(config) {
    const errors = {
      metadata: {},
      groups: {}
    };
    let valid = true;

    // Validate metadata
    for (const [field, value] of Object.entries(config)) {
      if (field !== 'pdt') {
        const fieldValidation = this.validateField('metadata', field, value, config);
        if (!fieldValidation.valid) {
          errors.metadata[field] = fieldValidation.message;
          valid = false;
        }
      }
    }

    // Validate groups
    for (const [groupId, group] of Object.entries(config.groups || {})) {
      const groupValidation = this.validateGroup(group);
      errors.groups[groupId] = groupValidation.errors;

      if (!groupValidation.valid) {
        valid = false;
      }
    }

    return {
      valid,
      errors
    };
  }
}
