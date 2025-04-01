/**
 * ValidationManager handles configuration validation.
 * It checks for duplicate groups and overlapping rules.
 */
export class ValidationManager {
  constructor(configManager) {
    this.configManager = configManager;
    this.validationIssues = {
      duplicateGroups: [],
      overlappingRules: [],
      requiredFields: []
    };
  }


  /**
   * Check for duplicate display formats with the same common parameters
   * @param {Array} groups Array of display-format groups
   */
  checkDuplicateDisplayFormats(groups) {
    // Filter for display-format groups only
    const displayFormatGroups = groups.filter(group => group.type === 'display-format');

    // Skip if there are less than 2 display format groups
    if (displayFormatGroups.length < 2) return;

    // First check if any group has more than one rule (which is not allowed)
    displayFormatGroups.forEach(group => {
      if (group.rules.length > 1) {
        this.validationIssues.requiredFields.push({
          groupId: group.id,
          message: `Display Format group '${group.title}' has multiple format rules. Only one format rule is allowed per group.`
        });
      }
    });


    // Compare each pair of groups
    for (let i = 0; i < displayFormatGroups.length; i++) {
      for (let j = i + 1; j < displayFormatGroups.length; j++) {
        const group1 = displayFormatGroups[i];
        const group2 = displayFormatGroups[j];

        // Compare common parameters (excluding format which is in the rules)
        if (this.haveMatchingParameters(group1.commonParams, group2.commonParams)) {
          // If common parameters match, check if any rule formats match
          const group1Formats = group1.rules.map(rule => rule.format);
          const group2Formats = group2.rules.map(rule => rule.format);

          // Check for any format that exists in both groups
          const duplicateFormats = group1Formats.filter(format =>
            group2Formats.includes(format)
          );

          if (duplicateFormats.length > 0) {
            this.validationIssues.duplicateGroups.push({
              group1: group1.id,
              group2: group2.id,
              type: 'display-format',
              message: `Groups '${group1.title}' and '${group2.title}' have identical parameters with the same format: ${duplicateFormats.join(', ')}`
            });
          }
        }
      }
    }
  }


  /**
   * Compare if two parameter objects have matching values for all relevant fields
   * @param {Object} params1 First parameter object
   * @param {Object} params2 Second parameter object
   * @returns {boolean} True if parameters match
   */
  haveMatchingParameters(params1, params2) {
    // Check each parameter that's relevant for display format
    const keysToCompare = ['deliveryMode', 'marketplace', 'pdtLessThanOrEqualTo', 'verticalType'];

    for (const key of keysToCompare) {
      // If one has the parameter set and the other doesn't, they don't match
      const param1Exists = params1[key] !== undefined && params1[key] !== '';
      const param2Exists = params2[key] !== undefined && params2[key] !== '';

      if (param1Exists !== param2Exists) {
        return false;
      }

      // If both have the parameter, check if values match
      if (param1Exists && param2Exists && params1[key] !== params2[key]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates the entire configuration
   * @returns {Object} Validation results with issues
   */
  validateConfiguration() {
    // Reset previous validation issues
    this.validationIssues = {
      duplicateGroups: [],
      overlappingRules: [],
      requiredFields: []
    };

    // Get all groups from config manager
    const allGroups = Object.values(this.configManager.groups);

    // Check for duplicate groups
    this.checkDuplicateGroups(allGroups);

    this.checkDuplicateDisplayFormats(allGroups);

    // Check for overlapping rules in each group
    allGroups.forEach(group => {
      if (group.rules.length > 1) {
        this.checkOverlappingRules(group);
      }
    });

    return {
      valid: this.isValid(),
      issues: this.validationIssues
    };
  }

  /**
   * Check if the configuration is valid
   * @returns {boolean} True if no validation issues exist
   */
  isValid() {
    return (
      this.validationIssues.duplicateGroups.length === 0 &&
      this.validationIssues.overlappingRules.length === 0 &&
      this.validationIssues.requiredFields.length === 0
    );
  }

  /**
   * Check for groups with duplicate common parameters
   * @param {Array} groups All configuration groups
   */
  checkDuplicateGroups(groups) {
    // Group by section type
    const groupsByType = {};
    groups.forEach(group => {
      if (!groupsByType[group.type]) {
        groupsByType[group.type] = [];
      }
      groupsByType[group.type].push(group);
    });

    // Check each section type for duplicates
    Object.entries(groupsByType).forEach(([type, typeGroups]) => {
      // Skip if only one group of this type
      if (typeGroups.length <= 1) return;

      // Check each pair of groups
      for (let i = 0; i < typeGroups.length; i++) {
        for (let j = i + 1; j < typeGroups.length; j++) {
          if (this.areGroupsEqual(typeGroups[i], typeGroups[j])) {
            this.validationIssues.duplicateGroups.push({
              group1: typeGroups[i].id,
              group2: typeGroups[j].id,
              type: type,
              message: `Groups '${typeGroups[i].title}' and '${typeGroups[j].title}' have identical parameters`
            });
          }
        }
      }
    });
  }

  /**
   * Check if two groups have the same common parameters
   * @param {Object} group1 First group
   * @param {Object} group2 Second group
   * @returns {boolean} True if groups have identical parameters
   */
  areGroupsEqual(group1, group2) {
    const params1 = group1.commonParams;
    const params2 = group2.commonParams;

    // Check if the groups have the same common parameters
    const keys1 = Object.keys(params1);
    const keys2 = Object.keys(params2);

    // If they have different number of keys, they're not equal
    if (keys1.length !== keys2.length) return false;

    // Check each key-value pair
    for (const key of keys1) {
      if (params1[key] !== params2[key]) return false;
    }

    return true;
  }

  /**
   * Check for overlapping rules within a group
   * @param {Object} group The group to check
   */
  checkOverlappingRules(group) {
    const { type, id, rules } = group;

    // Different overlap checks based on section type
    switch (type) {
      case 'ranges':
        this.checkOverlappingRangesRules(id, rules);
        break;
      case 'capping':
        this.checkOverlappingCappingRules(id, rules);
        break;
      default:
        // Other types don't have overlap concerns
        break;
    }
  }

  /**
   * Check for overlapping ranges rules
   * @param {string} groupId Group ID
   * @param {Array} rules Rules to check
   */
  checkOverlappingRangesRules(groupId, rules) {
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        if (this.doRangesRulesOverlap(rules[i], rules[j])) {
          this.validationIssues.overlappingRules.push({
            groupId: groupId,
            rule1Index: i,
            rule2Index: j,
            message: `Rules ${i+1} and ${j+1} have overlapping conditions`
          });
        }
      }
    }
  }

  /**
   * Check if two range rules overlap
   * @param {Object} rule1 First rule
   * @param {Object} rule2 Second rule
   * @returns {boolean} True if rules overlap
   */
  /**
   * Completely fixed validation logic for checking if range rules overlap
   * Handles boundary cases for both PDT and Mean Delay ranges
   * @param {Object} rule1 First rule
   * @param {Object} rule2 Second rule
   * @returns {boolean} True if rules overlap
   */
  doRangesRulesOverlap(rule1, rule2) {
    // Extract PDT range information and whether they're specified
    const rule1HasPdtGreaterThan = rule1.pdtGreaterThan !== null && rule1.pdtGreaterThan !== undefined;
    const rule1HasPdtLessThanOrEqual = rule1.pdtLessThanOrEqualTo !== null && rule1.pdtLessThanOrEqualTo !== undefined;

    const rule2HasPdtGreaterThan = rule2.pdtGreaterThan !== null && rule2.pdtGreaterThan !== undefined;
    const rule2HasPdtLessThanOrEqual = rule2.pdtLessThanOrEqualTo !== null && rule2.pdtLessThanOrEqualTo !== undefined;

    // Handle exact boundary case for PDT ranges
    // Rule 1: PDT ≤ X and Rule 2: PDT > X - These do not overlap
    if (rule1HasPdtLessThanOrEqual && rule2HasPdtGreaterThan &&
      rule1.pdtLessThanOrEqualTo === rule2.pdtGreaterThan) {
      return false;
    }

    // Rule 2: PDT ≤ X and Rule 1: PDT > X - These do not overlap
    if (rule2HasPdtLessThanOrEqual && rule1HasPdtGreaterThan &&
      rule2.pdtLessThanOrEqualTo === rule1.pdtGreaterThan) {
      return false;
    }

    // For standard PDT range overlap checking
    const pdt1From = rule1HasPdtGreaterThan ? rule1.pdtGreaterThan : -Infinity;
    const pdt1To = rule1HasPdtLessThanOrEqual ? rule1.pdtLessThanOrEqualTo : Infinity;
    const pdt2From = rule2HasPdtGreaterThan ? rule2.pdtGreaterThan : -Infinity;
    const pdt2To = rule2HasPdtLessThanOrEqual ? rule2.pdtLessThanOrEqualTo : Infinity;

    // Check if PDT ranges don't overlap
    if (pdt1To < pdt2From || pdt1From > pdt2To) {
      return false; // No overlap in PDT ranges
    }

    // PDT ranges overlap, now check Mean Delay ranges

    // Extract Mean Delay range information and whether they're specified
    const rule1HasMeanDelayGreaterThan = rule1.meanDelayGreaterThan !== null && rule1.meanDelayGreaterThan !== undefined;
    const rule1HasMeanDelayLessThanOrEqual = rule1.meanDelayLessThanOrEqualTo !== null && rule1.meanDelayLessThanOrEqualTo !== undefined;

    const rule2HasMeanDelayGreaterThan = rule2.meanDelayGreaterThan !== null && rule2.meanDelayGreaterThan !== undefined;
    const rule2HasMeanDelayLessThanOrEqual = rule2.meanDelayLessThanOrEqualTo !== null && rule2.meanDelayLessThanOrEqualTo !== undefined;

    // Handle the case where rules don't specify mean delay conditions
    if ((!rule1HasMeanDelayGreaterThan && !rule1HasMeanDelayLessThanOrEqual) ||
      (!rule2HasMeanDelayGreaterThan && !rule2HasMeanDelayLessThanOrEqual)) {
      return true; // At least one rule has no MD constraints, so they overlap
    }

    // Handle exact boundary condition for Mean Delay
    // Rule 1: MD ≤ X and Rule 2: MD > X - These do not overlap
    if (rule1HasMeanDelayLessThanOrEqual && rule2HasMeanDelayGreaterThan &&
      rule1.meanDelayLessThanOrEqualTo === rule2.meanDelayGreaterThan) {
      return false;
    }

    // Rule 2: MD ≤ X and Rule 1: MD > X - These do not overlap
    if (rule2HasMeanDelayLessThanOrEqual && rule1HasMeanDelayGreaterThan &&
      rule2.meanDelayLessThanOrEqualTo === rule1.meanDelayGreaterThan) {
      return false;
    }

    // Standard range overlap check for Mean Delay
    const md1From = rule1HasMeanDelayGreaterThan ? rule1.meanDelayGreaterThan : -Infinity;
    const md1To = rule1HasMeanDelayLessThanOrEqual ? rule1.meanDelayLessThanOrEqualTo : Infinity;
    const md2From = rule2HasMeanDelayGreaterThan ? rule2.meanDelayGreaterThan : -Infinity;
    const md2To = rule2HasMeanDelayLessThanOrEqual ? rule2.meanDelayLessThanOrEqualTo : Infinity;

    // Check if MD ranges don't overlap
    if (md1To < md2From || md1From > md2To) {
      return false; // No overlap in MD ranges
    }

    // If we reach here, both PDT and Mean Delay ranges overlap
    return true;
  }

  /**
   * Check for overlapping capping rules
   * @param {string} groupId Group ID
   * @param {Array} rules Rules to check
   */
  checkOverlappingCappingRules(groupId, rules) {
    // Find duplicate rule types (e.g., multiple 'single' rules)
    const singleRules = rules.filter(rule => rule.type === 'single');
    const rangesRules = rules.filter(rule => rule.type === 'ranges');

    if (singleRules.length > 1) {
      const indices = rules.map((rule, index) => rule.type === 'single' ? index : -1)
        .filter(index => index !== -1);

      this.validationIssues.overlappingRules.push({
        groupId: groupId,
        ruleIndices: indices,
        message: `Multiple 'single' rules found. Only one is allowed.`
      });
    }

    if (rangesRules.length > 1) {
      const indices = rules.map((rule, index) => rule.type === 'ranges' ? index : -1)
        .filter(index => index !== -1);

      this.validationIssues.overlappingRules.push({
        groupId: groupId,
        ruleIndices: indices,
        message: `Multiple 'ranges' rules found. Only one is allowed.`
      });
    }
  }

  /**
   * Get validation issues for a specific group
   * @param {string} groupId The group ID
   * @returns {Object} Validation issues for the group
   */
  getIssuesForGroup(groupId) {
    return {
      duplicateGroup: this.validationIssues.duplicateGroups.filter(
        issue => issue.group1 === groupId || issue.group2 === groupId
      ),
      overlappingRules: this.validationIssues.overlappingRules.filter(
        issue => issue.groupId === groupId
      )
    };
  }

  /**
   * Check if a group has any validation issues
   * @param {string} groupId The group ID
   * @returns {boolean} True if the group has issues
   */
  hasIssues(groupId) {
    const groupIssues = this.getIssuesForGroup(groupId);
    return groupIssues.duplicateGroup.length > 0 || groupIssues.overlappingRules.length > 0;
  }
}
