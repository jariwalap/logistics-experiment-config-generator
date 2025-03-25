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
  doRangesRulesOverlap(rule1, rule2) {
    // Check PDT ranges
    const pdt1From = rule1.pdtGreaterThan !== null ? rule1.pdtGreaterThan : -Infinity;
    const pdt1To = rule1.pdtLessThanOrEqualTo !== null ? rule1.pdtLessThanOrEqualTo : Infinity;
    const pdt2From = rule2.pdtGreaterThan !== null ? rule2.pdtGreaterThan : -Infinity;
    const pdt2To = rule2.pdtLessThanOrEqualTo !== null ? rule2.pdtLessThanOrEqualTo : Infinity;

    // Check Mean Delay ranges
    const md1From = rule1.meanDelayGreaterThan !== null ? rule1.meanDelayGreaterThan : -Infinity;
    const md1To = rule1.meanDelayLessThanOrEqualTo !== null ? rule1.meanDelayLessThanOrEqualTo : Infinity;
    const md2From = rule2.meanDelayGreaterThan !== null ? rule2.meanDelayGreaterThan : -Infinity;
    const md2To = rule2.meanDelayLessThanOrEqualTo !== null ? rule2.meanDelayLessThanOrEqualTo : Infinity;

    // Rules overlap if their PDT ranges overlap AND their Mean Delay ranges overlap
    const pdtOverlap = !(pdt1To < pdt2From || pdt1From > pdt2To);
    const mdOverlap = !(md1To < md2From || md1From > md2To);

    return pdtOverlap && mdOverlap;
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
