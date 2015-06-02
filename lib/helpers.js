'use strict';

/**
 * Checks whether the thing is undefined
 * @param {Object} thing the thing to check
 * @private
 */
var isDefined = function _isDef(thing) {
  try {
    if (thing === void 0) return false;
  } catch (e) {
    return false;  // catch undefined with nested object errors
  }
  return true;
};

/**
 * Check whether string has contents
 * Intentinally using doubleequals to check both undefined and null
 * @param {String} someString full file path
 * @private
 */
var isStrEmpty = function _isEmpty(someString) {
  if (someString == null && someString !== '') return true;
  return false;
};

/**
 * Creates file if it doesn't exist
 * Won't even touch it if it exists
 * @param {String} filePath full file path
 * @param {Number} mode acl mode number (decimal)
 * @private
 */
var mcfs = function _maybeCreateFileSync(filePath, mode) {
  touch.sync(filePath, {atime: true, mtime: true, force: true});
  fs.chmodSync(filePath, mode);
}


module.exports = {
  isDef: isDefined,
  isEmpty: isStrEmpty,
  maybeCreateFileSync: mcfs
};
