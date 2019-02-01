var expect = require('chai').expect,
    region   = require('../lib/region');

describe('Region', function() {
  describe('#getValidRegionString()', function() {
    it('should return "US" when "US" is passed', function() {
      var res = region.getValidRegionString('US');
      expect(res).to.be.eq('US');
    });
    it('should return "US" when "us" is passed', function() {
      var res = region.getValidRegionString('us');
      expect(res).to.be.eq('US');
    });
    it('should return "US" when "" is passed', function() {
      var res = region.getValidRegionString('');
      expect(res).to.be.eq('US');
    });
    it('should return "EU" when EU is passed', function() {
      var res = region.getValidRegionString('EU');
      expect(res).to.be.eq('EU');
    });
    it('should return "EU" when "eu" is passed', function() {
      var res = region.getValidRegionString('eu');
      expect(res).to.be.eq('EU');
    });
    it('should return null when "foo" is passed', function() {
      var res = region.getValidRegionString('foo');
      expect(res).to.be.null;
    });
  });

  describe('#getEsHost()', function() {
    it('should return US ES host URI when "US" is passed', function() {
      var res = region.getEsHost('US');
      expect(res).to.be.eq(process.env.LOGSENE_ES_HOST);
    });
    it('should return EU ES host URI when "EU" is passed', function() {
      var res = region.getEsHost('EU');
      expect(res).to.be.eq(process.env.LOGSENE_ES_HOST_EU);
    });
  });

  describe('#getLogseneUri()', function() {
    it('should return US URI when "US" is passed', function() {
      var res = region.getLogseneUri('US');
      expect(res).to.be.eq(process.env.LOGSENE_URI);
    });
    it('should return EU URI when "EU" is passed', function() {
      var res = region.getEsHost('EU');
      expect(res).to.be.eq(process.env.LOGSENE_URI_EU);
    });
  });
});
