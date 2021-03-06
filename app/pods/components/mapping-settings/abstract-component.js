import Component from '@ember/component';

export default Component.extend({
  mapping: null,
  standalone: true,

  diagramCollapsedDefault: false,

  actions: {
    onIntervalTypeTabChange(id) {
      this.set('mapping.scale.usesInterval', !(id === "linear-tab"));
    },
    bindScaleIntervalType(scale, type) {
      scale.set('intervalType', type);
    },
    bind(...params) {
      this.sendAction('bind', ...params);
    },
    updateValueBreak(val) {
      if (Ember.isEmpty(val)) {
        this.set('mapping.scale.valueBreak', null);
      } else {
        this.set('mapping.scale.valueBreak', val);
        this.get('mapping').clampValueBreak();
      }
    },
    toggleRuleVisibility(rule) {
      rule.toggleProperty('visible');
    },
    shiftRuleIndex(index, targetIndex) {
      this.get('mapping').shiftRule(index, targetIndex);
      this.get('mapping').reorderRules();
    },
    randomizeRules() {
      this.get('mapping').generateRules(true);
    },
    updateShapeSetShape(shape) {
      this.set('mapping.visualization.shape', shape);
    },
    updateRulesShapeSet(shapeSet) {
      this.get('mapping').updateRulesShapeSet(shapeSet);
    }
  }
});