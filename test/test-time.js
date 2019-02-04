var expect = require('chai').expect,
    moment = require('moment'),
    time   = require('../lib/time');

var allowedFormats = [
  'YYYY-MM-DD',
  'YYYY-MM-DD HH:mm',
  'YYYY-MM-DDTHH:mm',
  'YYYY-MM-DD HHmm',
  'YYYYMMDD HH:mm',
  'YYYYMMDD HHmm',
  'YYYYMMDD',
  'YYYY-MM-DDTHHmm',
  'YYYYMMDDTHH:mm',
  'YYYYMMDDTHHmm',
  'YYYYMMDDTHH:mm',
  'YYYY-MM-DD HH:mm:ss',
  'YYYY-MM-DD HHmmss',
  'YYYY-MM-DDTHH:mm:ss',
  'YYYY-MM-DDTHHmmss',
  'YYYYMMDDTHHmmss',
  'YYYY-MM-DD HH:mmZ',
  'YYYY-MM-DD HHmmZ',
  'YYYY-MM-DD HH:mm:ssZ',
  'YYYY-MM-DD HHmmssZ',
  'YYYYMMDD HH:mmZ',
  'YYYYMMDD HHmmZ',
  'YYYY-MM-DDTHH:mmZ',
  'YYYY-MM-DDTHHmmZ',
  'YYYY-MM-DDTHH:mm:ssZ',
  'YYYY-MM-DDTHHmmssZ',
  'YYYYMMDDTHH:mmZ',
  'YYYYMMDDTHHmmZ',
  'YYYYMMDDTHHmmZ',
  'YYYYMMDDTHHmmssZ',
  'YYYYMMDDTHH:mmZ'
];

describe('Time', function() {
  describe('#parse()', function() {

    it('should recognize all allowed formats', function() {
      var areAllFormatsValid = function _isValidFormat(formats) {
        formats.forEach(function(strTime) {
          var test = moment(strTime, allowedFormats, true);
          expect(test.isValid()).to.be.true;
        })
      };

      var times = [
        '2015-07-31',
        '20150731',
        '2015-07-31 22:59',
        '2015-07-31T22:59',
        '2015-07-31 2259',
        '20150731 22:59',
        '20150731 2259',
        '2015-07-31T2259',
        '20150731T22:59',
        '20150731T2259',
        '20150731T22:59',
        '2015-07-31 22:59:59',
        '2015-07-31 225959',
        '2015-07-31T22:59:59',
        '2015-07-31T225959',
        '20150731T225959',
        '2015-07-31 22:59Z',
        '2015-07-31 2259Z',
        '2015-07-31 22:59:59Z',
        '2015-07-31 225959Z',
        '20150731 22:59Z',
        '20150731 2259Z',
        '2015-07-31T22:59Z',
        '2015-07-31T2259Z',
        '2015-07-31T22:59:59Z',
        '2015-07-31T225959Z',
        '20150731T22:59Z',
        '20150731T2259Z',
        '20150731T2259Z',
        '20150731T225959Z',
        '20150731T22:59Z'
      ];

      areAllFormatsValid(times);
    });

    it('start should be within tenth of a second from 2015-07-04T22:22:22', function() {
      var arg = '2015-07-04T22:22:22';
      var start = moment(arg, allowedFormats, true);
      var res = time.parse(arg);
      expect(res).to.exist;
      expect(res.end).to.not.exist;        // allow tenth of a second for computation
      expect(res.start.valueOf()).to.be.closeTo(start.valueOf(), 100);
    });

    it('start should be within tenth of a second from: now - 2d5h3m (+/- tenth of a second)', function() {
      var arg = '2d5h3m';
      var start = moment().subtract(moment.duration({d: 2, h: 5, m: 3}));
      var res = time.parse(arg);
      expect(res).to.exist;
      expect(res.end).to.not.exist;
      expect(res.start.valueOf()).to.be.closeTo(start.valueOf(), 100);
    });

    it('timestamp/+duration range should have correct start and end (+/- tenth of a second)', function() {
      var arg = '2015-06-01 22:22:22/+1y2M88d11h66m88s';
      var sep = '/+';
      var sepAt = arg.indexOf(sep);
      var startStr = arg.substring(0, sepAt);
      var start = moment(startStr, allowedFormats, true);
      var end = start.clone().add(moment.duration({y: 1, M: 2, d: 88, h: 11, m: 66, s: 88}));
      var res = time.parse(arg);
      expect(res.start.valueOf()).to.be.closeTo(start.valueOf(), 100);
      expect(res.end.valueOf()).to.be.closeTo(end.valueOf(), 100);
    });

    it('timestamp/-duration range should have correct start and end (+/- tenth of a second)', function() {
      var arg = '20150601T222222/-1y2M88d11h66m88s';
      var sep = '/-';
      var sepAt = arg.indexOf(sep);
      var startStr = arg.substring(0, sepAt);
      var end = moment(startStr, allowedFormats, true);
      var start = end.clone().subtract(moment.duration({y: 1, M: 2, d: 88, h: 11, m: 66, s: 88}));
      var res = time.parse(arg);
      expect(res.start.valueOf()).to.be.closeTo(start.valueOf(), 100);
      expect(res.end.valueOf()).to.be.closeTo(end.valueOf(), 100);
    });

    it('durationX/+durationX should start durationX ago and end now (+/- tenth of a second)', function() {
      var arg = '1M8d11h6m8s/+1M8d11h6m8s';
      var start = moment().subtract(moment.duration({M: 1, d: 8, h: 11, m: 6, s: 8}));
      var end = moment();
      var res = time.parse(arg);
      expect(res.start.valueOf()).to.be.closeTo(start.valueOf(), 100);
      expect(res.end.valueOf()).to.be.closeTo(end.valueOf(), 100);
    });

    it('durationX/-durationX should start 2*durationX ago and end now - durationX (+/- tenth of a second)', function() {
      var arg = '1y2M88d11h66m88s/-1y2M88d11h66m88s';
      var dur = moment.duration({y: 1, M: 2, d: 88, h: 11, m: 66, s: 88});
      var start = moment().subtract(dur).subtract(dur);
      var end = moment().subtract(dur);
      var res = time.parse(arg);
      expect(res.start.valueOf()).to.be.closeTo(start.valueOf(), 100);
      expect(res.end.valueOf()).to.be.closeTo(end.valueOf(), 100);
    });

  });

});


