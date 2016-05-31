import Ember from 'ember';
import Rule from '../rule';
import VisualizationFactory from '../visualization/factory';
import PatternMaker from 'mapp/utils/pattern-maker';
/* global d3 */

let DataMixin = Ember.Mixin.create({
  
  values: function() {
    return this.get('varCol.body')
      .filter( c => !Ember.isEmpty(c.get('value')) && this.get('varCol.incorrectCells').indexOf(c) === -1
        && !isNaN(c.get('postProcessedValue')))
      .map( c => c.get('postProcessedValue') );
  }.property('varCol'),
  
  absValues: function() {
    return this.get('values').map( v => Math.abs(v) );
  }.property('values'),
  
  maxValue: function() {
    return Math.max.apply(this, this.get('values'));
  }.property('values'),
  
  findNearestValue(val) {
    
    let distance = Number.MAX_VALUE - 1;
    return this.get('values').reduce( (nearest, value) => {
      let _distance = Math.abs(value - val);
      if (_distance < distance) {
        nearest = value;
        distance = _distance;
      }
      return nearest;
    });
    
  },
  
  clampValueBreak: function() {
    
    if (this.get('scale.valueBreak') != null) {
      if (this.get('scale.valueBreak') < this.get('extent')[0]) {
        this.set('scale.valueBreak', this.get('extent')[0]);
      } else if (this.get('scale.valueBreak') > this.get('extent')[1]) {
        this.set('scale.valueBreak', this.get('extent')[1]);
      }
    }
    
  }.observes('scale.valueBreak'),
  
  maxValuePrecision: function() {
    return this.get('values').reduce( (p, v) => {
      if (isFinite(v)) {
        let e = 1;
        while (Math.round(v * e) / e !== v) e *= 10;
        return Math.max(Math.log(e) / Math.LN10, p);
      }
      return p;
    }, 0);
  }.property('values'),
  
  generateRules() {
    
    if (!this.get('rules')) {
      let ruleMap = this.get('varCol.body')
        .filter( c => this.get('varCol.incorrectCells').indexOf(c) !== -1 )
        .reduce( (m, c) => {
          let val = !Ember.isEmpty(c.get('value')) ? c.get('value') : Rule.EMPTY_VALUE;
          if (!m.has(val)) {
            m.set(val, Rule.create({cells: Em.A([c]), label: val, visible: true, color: "#dddddd"}));
          } else {
            m.get(val).get('cells').addObject(c);
          }
          return m;
        }, new Map());
      this.set("rules", [...ruleMap.values()]);
    }
  },
  
  intervals: function() {
    return this.get('scale').getIntervals(this.get('values'));
  }.property('values.[]', 'scale._defferedChangeIndicator'),
  
  extent: function() {
    return d3.extent(this.get('values'));
  }.property('values.[]'),
  
  distribution: function() {
      
    return this.get('values').reduce( (dist, v) => {
      if (!dist.has(v)) {
        dist.set(v, {val: v, qty: 1});
      } else {
        dist.get(v).qty += 1;
      }
      return dist;
    }, new Map());
      
  }.property('values.[]'),
  
});


let SurfaceMixin = Ember.Mixin.create({
  
  generateVisualization() {
    if (!this.get('visualization')) {
      this.set('visualization', VisualizationFactory.createInstance("surface"));
    }
  },
  
  patternModifiers: function() {
    
    return PatternMaker.Composer.compose(
      this.get('scale.diverging'),
      this.get('visualization.reverse'),
      this.get('scale.classes'),
      this.get('scale.classesBeforeBreak'),
      this.get('visualization.pattern.angle'),
      this.get('visualization.pattern.stroke')
    );
    
  }.property('visualization.pattern', 'scale.classes',
  'scale.classesBeforeBreak', 'scale.diverging'),
  
  getScaleOf(type) {
    
    let ext = d3.extent(this.get('values')),
        intervals = this.get('intervals'),
        d3Scale,
        range,
        rangeLength;
        
    if (this.get('scale.intervalType') === "linear") {
      d3Scale = d3.scale.linear();
      rangeLength = intervals.length; //2
    } else {
      d3Scale = d3.scale.threshold();
      rangeLength = intervals.length + 1;
    };
        
    if (this.get('visualization.pattern')) {
      
      if (type === "texture") {
        range = this.get('patternModifiers');
      } else if (type === "color") {
        range = Array.from({length: rangeLength}, () => this.get('visualization.patternColor'));
      }
      
    } else if (this.get('visualization.colors')) {
      
      if (type === "texture") {
        range = Array.from({length: rangeLength}, () => {fn: PatternMaker.NONE});
      } else if (type === "color") {
        range = this.get('colorSet');
      }
      
    }
    
    return d3Scale
      .domain(intervals)
      .range(range);
      
  }
  
});

let SymbolMixin = Ember.Mixin.create({
  
  generateVisualization() {
    if (!this.get('visualization')) {
      this.set('visualization', VisualizationFactory.createInstance("symbol"));
    }
  },
  
  getScaleOf(type) {
    
    let ext = d3.extent(this.get('values')),
        intervals = this.get('intervals'),
        contrastScale = this.get('scale.contrastScale'),
        visualization = this.get('visualization'),
        d3Scale,
        domain,
        transform = _ => d3Scale(_),
        range;
        
    if (type === "size") {
      
      contrastScale.domain(ext)
        .range([0, visualization.get('maxSize')]);
      
      if (this.get('scale.intervalType') === "linear") {
        d3Scale = contrastScale;
        range = contrastScale.range();
        domain = contrastScale.domain();
        transform = _ => d3Scale(Math.abs(_));
      } else {
        d3Scale = d3.scale.threshold();
        range = Array.from({length: intervals.length},
            (v, i) => contrastScale(Math.abs(intervals[i]))
          );
        range.push(contrastScale(this.get('maxValue')));
        domain = intervals;
      };
      
      
    } else if (type === "color") {
      
      d3Scale = d3.scale.threshold()
      
      if (this.get('scale.diverging')) {
        range = this.get('visualization').colorStops(this.get('scale.diverging'));
        domain = [this.get('scale.valueBreak')];
      } else {
        range = this.get('visualization').colorStops();
        domain = [];
      }
      
    }
    
    d3Scale.domain(domain).range(range);
    
    return transform;
      
  }
  
});


export default {Data: DataMixin, Surface: SurfaceMixin, Symbol: SymbolMixin};