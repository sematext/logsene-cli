var expect = require('chai').expect,
    util   = require('../lib/util');

describe('Utils', function() {
  describe('#isDef()', function() {
    it('should return false for uninitialized variable', function() {
      var args;
      var res = util.isDef(args);
      expect(res).to.be.false;
    });
    it('should return true for null', function() {
      var args = null;
      var res = util.isDef(args);
      expect(res).to.be.true;
    });
    it('should return false for non-existing object key', function() {
      var args = {};
      var res = util.isDef(args.arg);
      expect(res).to.be.false;
    });
  });

  describe('#isEmpty()', function() {
    it('should return true for empty string', function() {
      var res = util.isEmpty('');
      expect(res).to.be.true;
    });
    it('should return true for undefined', function() {
      var res = util.isEmpty(undefined);
      expect(res).to.be.true;
    });
  });

  describe('#isNull()', function() {
    it('should return true for null', function() {
      var res = util.isNull(null);
      expect(res).to.be.true;
    });
    it('should return false for empty string', function() {
      var res = util.isNull('');
      expect(res).to.be.false;
    });
    it('should return false for undefined', function() {
      var res = util.isNull(undefined);
      expect(res).to.be.false;
    });
  });

  describe('#isNullOrUndefined()', function() {
    it('should return true for null', function() {
      var res = util.isNullOrUndefined(null);
      expect(res).to.be.true;
    });
    it('should return true for undefined', function() {
      var res = util.isNullOrUndefined(undefined);
      expect(res).to.be.true;
    });
    it('should return false for empty string', function() {
      var res = util.isNullOrUndefined('');
      expect(res).to.be.false;
    });
  });

  describe('#isObject()', function() {
    it('should return true for empty object', function() {
      var res = util.isObject({});
      expect(res).to.be.true;
    });
    it('should return true for new Date', function() {
      var res = util.isObject(new Date);
      expect(res).to.be.true;
    });
    it('should return false for empty string', function() {
      var res = util.isObject('');
      expect(res).to.be.false;
    });
  });

  describe('#isStrOrBoolTrue()', function() {
    it('should return true for string \'true\'', function() {
      var res = util.isStrOrBoolTrue('true');
      expect(res).to.be.true;
    });
    it('should return true for Boolean true', function() {
      var res = util.isStrOrBoolTrue(true);
      expect(res).to.be.true;
    });
    it('should return false for empty string', function() {
      var res = util.isStrOrBoolTrue('');
      expect(res).to.be.false;
    });
    it('should return false for Boolean false', function() {
      var res = util.isStrOrBoolTrue(false);
      expect(res).to.be.false;
    });
  });

  describe('#safeJsonStringify()', function() {
    it('should not blow up for circular json', function() {
      var stringify = function() {
        var obj = {};
        obj.a = {b:obj};
        return util.safeJsonStringify(obj);
      };
      expect(stringify).not.to.throw(Error);
    });
  });

  describe('#ObjToStr()', function() {
    it('should return [object Function] for Function', function() {
      expect(util.objToStr(new Function)).to.be.eq('[object Function]');
    });
    it('should return [object Date] for Date', function() {
      expect(util.objToStr(new Date)).to.be.eq('[object Date]');
    });
  });

  describe('#camelToDashCase()', function() {
    it('should return \'is-this-dash-case\' for \'isThisDashCase\'', function() {
      expect(util.camelToDashCase('isThisDashCase')).to.be.eq('is-this-dash-case');
    });
    it('should return empty string for empty string', function() {
      expect(util.camelToDashCase('')).to.be.eq('');
    });
  });

  describe('#intersectable()', function() {
    it('should return true when arrays have mutual elements', function() {
      var arr1 = [1, 2, 3], arr2 = [3, 4, 5];
      expect(util.intersectable(arr1, arr2)).to.be.true;
    });
    it('should return false when arrays don\'t have any mutual elements', function() {
      var arr1 = [1, 2, 3], arr2 = [4, 5, 6];
      expect(util.intersectable(arr1, arr2)).to.be.false;
    });
  });

  describe('#intersectionCount()', function() {
    it('should return 3 when arrays have 3 mutual elements', function() {
      var arr1 = [1, 2, 3], arr2 = [1, 2, 3, 4];
      expect(util.intersectionCount(arr1, arr2)).to.be.eq(3);
    });
    it('should return 0 when arrays don\'t have any mutual elements', function() {
      var arr1 = [1, 2, 3], arr2 = [4, 5, 6];
      expect(util.intersectionCount(arr1, arr2)).to.be.eq(0);
    });
  });

  describe('#wrapInQuotes()', function() {
    it('should return pair of double quotes for empty string', function() {
      expect(util.wrapInQuotes('a')).to.be.eq('"a"');
    });
    it('shouldn\'t change already quoted string', function() {
      expect(util.wrapInQuotes('"a"')).to.be.eq('"a"');
    });
  });

});
