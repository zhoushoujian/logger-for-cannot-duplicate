const { getTime } = require('console-format');
const EventBus = require('./event-bus');
const { sendFunc, readFunc, addFunc, removeFunc, clearDataFunc } = require('./logic');

const eventEmit = new EventBus();

function Logger(config) {
  const specialLogLevel = ['', '-warn', '-error'];
  const loggerTypes = ['debug', 'info', 'warn', 'error', 'show', 'log'];

  if (!config) {
    config = {};
  }

  const self = this;
  this.db = null;
  this.preQueue = [];
  this.runVersionChange = false;
  let count = 0;

  async function dealPreviousData() {
    if (self.preQueue.length) {
      await eventEmit.emit(self.preQueue.shift().name);
      return dealPreviousData();
    }
  }

  if (Object.prototype.toString.call(config) === '[object Object]') {
    this.userConfig = {};
    this.userConfig.isDevEnv = config.isDevEnv || false;
    this.userConfig.enable = config.enable === false || true;
    this.userConfig.dbName = typeof config.dbName === 'string' ? config.dbName : 'logger-for-cannot-duplicate';
    this.userConfig.collectionName = typeof config.collectionName === 'string' ? config.collectionName : 'collection';
    this.userConfig.serverAddr = typeof config.serverAddr === 'string' ? config.serverAddr : '';
    this.userConfig.packageInfo =
      typeof config.packageInfo === 'object' && config.packageInfo ? config.packageInfo : {};

    if (this.userConfig.serverAddr === '') {
      console.warn('logger-for-cannot-duplicate: serverAddr is not config!');
    }

    const dbName = this.userConfig.dbName;
    const collectionName = this.userConfig.collectionName;
    specialLogLevel.forEach(function (item) {
      const request = indexedDB.open(dbName + item, 1);

      request.onerror = function (_event) {
        console.error('logger-for-cannot-duplicate: indexedDB数据库打开报错');
      };

      request.onsuccess = function (_event) {
        if (item === '') {
          self.Logger = {};
          self.Logger.config = self.userConfig;
          if (self.userConfig.isDevEnv) {
            console.info('logger-for-cannot-duplicate: ', self.Logger.config);
          }
          setTimeout(function () {
            if (!self.runVersionChange) {
              dealPreviousData();
            }
          }, 50);
        }
        self['db' + item] = request.result;
      };

      request.onupgradeneeded = function (event) {
        if (item === '') {
          self.runVersionChange = true;
          setTimeout(function () {
            dealPreviousData();
          }, 10);
        }
        self['db' + item] = event.target.result;
        self['db' + item].createObjectStore(collectionName, {
          keyPath: 'key',
        });
      };
    });

    loggerTypes.forEach(function (level) {
      self[level] = function () {
        const args = Array.prototype.slice.call(arguments);
        const levelUpperCase = level.toUpperCase();
        if (level === 'show') {
          console.log.apply(null, ['\x1b[32m [' + getTime() + ']'].concat(args));
        } else {
          if (self.userConfig.isDevEnv) {
            console[level].apply(null, ['[' + getTime() + '] [' + levelUpperCase + ']'].concat(args));
          }
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
            err: `logger-for-cannot-duplicate: loggerContent序列化错误: ${err.stack || err.toString()}`,
          }),
        };
      }

      if (!self.db) {
        const label = `add${count}`;
        return delayQueueFunc(label, addFunc, loggerContent, collectionName);
      } else {
        addFunc(loggerContent, collectionName, self, null, null);
      }
    };

    this.read = function () {
      if (!this.userConfig.enable) {
        return Promise.resolve('disabled');
      }
      if (!self.db) {
        const label = `read${count}`;
        return delayQueueFunc(label, readFunc, specialLogLevel, collectionName);
      } else {
        readFunc(specialLogLevel, collectionName, self, null, null);
      }
    };

    this.remove = function () {
      if (!this.userConfig.enable) {
        return Promise.resolve('disabled');
      }
      if (!self.db) {
        const label = `remove${count}`;
        return delayQueueFunc(label, removeFunc, dbName);
      } else {
        removeFunc(dbName, self, null, null);
      }
    };

    this.clearData = function () {
      if (!this.userConfig.enable) {
        return Promise.resolve('disabled');
      }
      if (!self.db) {
        const label = `remove${count}`;
        return delayQueueFunc(label, clearDataFunc, specialLogLevel, collectionName);
      } else {
        clearDataFunc(specialLogLevel, collectionName, self, null, null);
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
      self.preQueue.push({ name: label });
      return new Promise(res => {
        eventEmit.on(label, () => func.apply(this, [...rest, self, res, () => eventEmit.off(label)]));
        count++;
      });
    };
    if (typeof process !== 'undefined') {
      const uploadPackageInfo = require('./upload-package-info');
      uploadPackageInfo(this.userConfig);
    }
  } else {
    // prevent package init
    throw new Error('logger-for-cannot-duplicate: config must be an object or empty');
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
