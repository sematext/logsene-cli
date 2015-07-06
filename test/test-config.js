var expect = require('chai').expect,
    conf   = require('../lib/config');

describe('Config', function() {


  describe('#setSync()', function() {

    var k = 'testKey';

    it('should write configuration setting', function() {
      var v = 'testing, testing, ...';
      conf.setSync(k, v);

      expect(conf.getSync(k)).to.be.eq(v);
    });

    it('should delete configuration setting', function() {
      conf.deleteSync(k);

      expect(conf.getSync(k)).to.be.undefined;
    });

  });
});
