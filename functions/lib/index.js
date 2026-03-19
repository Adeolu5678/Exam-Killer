'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.nlmJobWorker = exports.nlmDailyReset = void 0;
const app_1 = require('firebase-admin/app');
(0, app_1.initializeApp)();
var nlmDailyReset_1 = require('./nlmDailyReset');
Object.defineProperty(exports, 'nlmDailyReset', {
  enumerable: true,
  get: function () {
    return nlmDailyReset_1.nlmDailyReset;
  },
});
var nlmJobWorker_1 = require('./nlmJobWorker');
Object.defineProperty(exports, 'nlmJobWorker', {
  enumerable: true,
  get: function () {
    return nlmJobWorker_1.nlmJobWorker;
  },
});
//# sourceMappingURL=index.js.map
