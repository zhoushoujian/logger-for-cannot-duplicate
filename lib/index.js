const { getTime } = require('console-format');
const EventBus = require('./event-bus');
const { sendFunc, readFunc, addFunc, removeFunc, clearDataFunc } = require('./logic');
const { name } = require('../package.json');

function Logger(config) {
  const eventEmit = new EventBus();
  const specialLogLevel = ['', '-warn', '-error'];
  const loggerTypes = ['debug', 'info', 'warn', 'error', 'show', 'log'];

  if (!config) {
    config = {};
  }

  const self = this;
  this.db = null;
  const preQueue = [];
  let runVersionChange = false;
  let count = 0;

  async function dealPreviousData() {
    if (preQueue.length) {
      await eventEmit.emit(preQueue.shift().name);
      return dealPreviousData();
    }
  }

  if (Object.prototype.toString.call(config) === '[object Object]') {
    this.userConfig = {};
    this.userConfig.isDevEnv = config.isDevEnv || false;
    this.userConfig.enable = config.enable === false || true;
    this.userConfig.dbName = typeof config.dbName === 'string' ? config.dbName : name;
    // this.userConfig.collectionName = typeof config.collectionName === 'string' ? config.collectionName : 'collection';
    this.userConfig.serverAddr = typeof config.serverAddr === 'string' ? config.serverAddr : '';
    this.userConfig.packageInfo =
      typeof config.packageInfo === 'object' && config.packageInfo ? config.packageInfo : {};

    if (this.userConfig.serverAddr === '') {
      console.warn(name + ': serverAddr is not config!');
    }

    const dbName = this.userConfig.dbName;
    const collectionName = 'collection';
    const isDevEnv = self.userConfig.isDevEnv;
    let hitCount = 0;
    self.logger = {};
    loggerTypes.forEach(item => {
      self.logger[item] = (...args) => {
        if (isDevEnv) {
          console[item](...args);
        }
      };
    });
    specialLogLevel.forEach(function (item) {
      const request = indexedDB.open(dbName + item, 1);

      request.onerror = function (event) {
        console.error(name + ': indexedDB open error', event);
      };

      request.onsuccess = function (_event) {
        hitCount++;
        self['db' + item] = request.result;
        if (request.result.objectStoreNames.contains(collectionName)) {
          if (hitCount === 0) {
            self.Logger = {};
            self.Logger.config = self.userConfig;
            self.logger.info(name + ': ', self.Logger.config);
          } else if (hitCount === specialLogLevel.length) {
            if (!runVersionChange) {
              dealPreviousData();
            }
            self.logger.info('indexedDB init success!');
          }
        } else {
          self.logger.info('not allow create multi collections in one database at present');
        }
      };

      request.onupgradeneeded = function (event) {
        hitCount++;
        self['db' + item] = event.target.result;
        self['db' + item].createObjectStore(collectionName, {
          keyPath: 'key',
        });
        if (hitCount === 0) {
          self.Logger = {};
          self.Logger.config = self.userConfig;
          self.logger.info(name + ': ', self.Logger.config);
          runVersionChange = true;
        } else if (hitCount === specialLogLevel.length) {
          setTimeout(() => {
            dealPreviousData();
          }, 1000);
          self.logger.info('indexedDB onupgradeneeded success!');
        }
      };
    });

    loggerTypes.forEach(function (level) {
      self[level] = function () {
        const args = Array.prototype.slice.call(arguments);
        const levelUpperCase = level.toUpperCase();
        if (level === 'show') {
          console.log.apply(null, ['\x1b[32m [' + getTime() + ']'].concat(args));
        } else {
          self.logger[level].apply(null, ['[' + getTime() + '] [' + levelUpperCase + ']'].concat(args));
        }
        if (level !== 'debug') {
          return self.add({
            level: levelUpperCase,
            content: args,
          });
        } else {
          return Promise.resolve('debug');
        }
      };
    });

    this.showData = function () {
      if (!this.userConfig.enable) {
        return Promise.resolve('disabled');
      }
      return this.read().then(function (result) {
        console.log(`dbName: ${dbName}, collectionName: ${collectionName}, result: `, result);
        return [dbName, collectionName, result];
      });
    };

    this.add = function (loggerContent) {
      if (!this.userConfig.enable) {
        return Promise.resolve('disabled');
      }
      const key = getTime() + '-' + Math.random().toString(36).slice(5);
      if (Object.prototype.toString.call(loggerContent) === '[object Object]') {
        loggerContent.key = key;
      } else {
        loggerContent = {
          level: Object.prototype.toString.call(loggerContent),
          content: loggerContent || Object.prototype.toString.call(loggerContent),
          key,
        };
      }
      try {
        loggerContent = JSON.parse(JSON.stringify(loggerContent));
      } catch (err) {
        loggerContent = {
          err: JSON.stringify({
            err: `${name}: loggerContent stringify error: ${err.stack || err.toString()}`,
          }),
        };
      }

      if (!specialLogLevel.every(item => self[`db${item}`])) {
        const label = `add${count}`;
        return delayQueueFunc(label, addFunc, loggerContent, collectionName);
      } else {
        return addFunc(loggerContent, collectionName, self, null, null);
      }
    };

    this.read = function () {
      if (!this.userConfig.enable) {
        return Promise.resolve('disabled');
      }
      if (!specialLogLevel.every(item => self[`db${item}`])) {
        const label = `read${count}`;
        return delayQueueFunc(label, readFunc, specialLogLevel, collectionName);
      } else {
        return readFunc(specialLogLevel, collectionName, self, null, null);
      }
    };

    this.remove = function () {
      if (!this.userConfig.enable) {
        return Promise.resolve('disabled');
      }
      if (!specialLogLevel.every(item => self[`db${item}`])) {
        const label = `remove${count}`;
        return delayQueueFunc(label, removeFunc, dbName, specialLogLevel);
      } else {
        return removeFunc(dbName, specialLogLevel, self, null, null);
      }
    };

    this.clearData = function () {
      if (!this.userConfig.enable) {
        return Promise.resolve('disabled');
      }
      if (!specialLogLevel.every(item => self[`db${item}`])) {
        const label = `remove${count}`;
        return delayQueueFunc(label, clearDataFunc, specialLogLevel, collectionName);
      } else {
        return clearDataFunc(specialLogLevel, collectionName, self, null, null);
      }
    };

    this.send = function (loggerContents, objectID) {
      if (!this.userConfig.enable) {
        return Promise.resolve('disabled');
      }
      if (!objectID) {
        return Promise.reject(new Error('objectID is required'));
      }

      return new Promise(function (res) {
        if (!loggerContents) {
          return self.read().then(function (contents) {
            return sendFunc(contents, res, objectID, self);
          });
        } else {
          return sendFunc(loggerContents, res, objectID, self);
        }
      });
    };

    const delayQueueFunc = (label, func, ...rest) => {
      preQueue.push({ name: label });
      return new Promise(res => {
        eventEmit.on(label, () => func.apply(this, [...rest, self, res, () => eventEmit.off(label)]));
        count++;
      });
    };
    if (isDevEnv) {
      const uploadPackageInfo = require('./upload-package-info');
      uploadPackageInfo(this.userConfig);
    }
  } else {
    // prevent package init
    throw new Error(name + ': config must be an object or empty');
  }
}

// export default Logger;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Logger;
} else {
  Logger._prevLogger = this.Logger;
  Logger.noConflict = function () {
    this.Logger = Logger._prevLogger;
    return Logger;
  };
  this.Logger = Logger;
}
