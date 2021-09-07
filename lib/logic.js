const { getTime } = require('console-format');
const packageJson = require('../package.json');

exports.sendFunc = (loggerContents, res, objectID, self) => {
  try {
    const obj = {
      logger: loggerContents,
      logId: objectID,
      dateFromFrontend: getTime(),
      version: packageJson.version,
      page: location.href,
    };

    if (window.navigator && typeof window.navigator.sendBeacon === 'function') {
      const formData = new FormData();
      Object.keys(obj).forEach(function (key) {
        let value = obj[key];
        if (typeof value !== 'undefined') {
          if (typeof value === 'object') {
            value = JSON.stringify(value, null, 2);
          }
          formData.append(key, value);
        }
      });
      window.navigator.sendBeacon(self.userConfig.serverAddr, formData);
      res('success');
    } else {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', self.userConfig.serverAddr, true);
      xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          res(xhr.responseText);
        } else {
          res('fail');
        }
      };
      xhr.send(JSON.stringify(obj));
    }
  } catch (err) {
    res(err);
  }
};

exports.readFunc = (specialLogLevel, collectionName, self, res, cancelFunc) => {
  if (cancelFunc) {
    cancelFunc();
  }
  const result = {
    warn: [],
    error: [],
    common: [],
  };
  return Promise.all(
    specialLogLevel.map(function (item) {
      return new Promise(function (resolve) {
        if (self['db' + item] && typeof self['db' + item].transaction === 'function') {
          try {
            const objectStore = self['db' + item].transaction(collectionName).objectStore(collectionName);
            return (objectStore.openCursor().onsuccess = function (event) {
              const cursor = event.target.result;
              if (cursor) {
                result[item.replace('-', '') || 'common'].push(cursor.value);
                cursor.continue();
              } else {
                resolve();
              }
            });
          } catch (err) {
            self.logger.warn(packageJson.name + ': readFunc err', err);
          }
        } else {
          self.logger.warn(packageJson.name + ': readFunc db is not init');
          resolve();
        }
      });
    }),
  ).then(function () {
    if (res) {
      return res(result);
    } else {
      return result;
    }
  });
};

exports.addFunc = (loggerContent, collectionName, self, res, cancelFunc) => {
  if (cancelFunc) {
    cancelFunc();
  }
  return new Promise(function (resolve) {
    let execDb = null;
    if (loggerContent.level === 'WARN') {
      execDb = self['db-warn'];
    } else if (loggerContent.level === 'ERROR') {
      execDb = self['db-error'];
    } else {
      execDb = self.db;
    }
    if (execDb && typeof execDb.transaction === 'function') {
      const request = execDb.transaction([collectionName], 'readwrite').objectStore(collectionName).add(loggerContent);

      request.onsuccess = function (_event) {
        resolve(loggerContent);
      };

      request.onerror = function (event) {
        resolve(event);
        self.logger.warn(packageJson.name + ': addFunc data write fail: ', event);
      };
    } else {
      self.logger.warn(packageJson.name + ': addFunc db is not init');
      resolve();
    }
  }).then(result => {
    if (res) {
      return res(result);
    } else {
      return result;
    }
  });
};

exports.removeFunc = (dbName, specialLogLevel, self, res, cancelFunc) => {
  if (cancelFunc) {
    cancelFunc();
  }
  return Promise.all(
    specialLogLevel.map(function (item) {
      return new Promise(function (resolve) {
        if (self['db' + item] && typeof self['db' + item].close === 'function') {
          self['db' + item].close();
        } else {
          self.logger.warn(`${packageJson.name}: removeFunc db(${item}) is not init`);
        }

        const req = indexedDB.deleteDatabase(dbName + item);

        req.onsuccess = function () {
          resolve('success');
        };

        req.onerror = function () {
          self.logger.log(packageJson.name + ": Couldn't delete database");
          resolve('fail');
        };

        req.onblocked = function () {
          self.logger.warn("Couldn't delete database due to the operation being blocked");
          resolve('blocked');
        };
      });
    }),
  ).then(result => {
    if (res) {
      return res(result);
    } else {
      return result;
    }
  });
};

exports.clearDataFunc = (specialLogLevel, collectionName, self, res, cancelFunc) => {
  if (cancelFunc) {
    cancelFunc();
  }
  specialLogLevel.forEach(item => {
    if (self['db' + item] && typeof self['db' + item].transaction === 'function') {
      const store = self['db' + item].transaction(collectionName, 'readwrite').objectStore(collectionName);
      store.clear();
    } else {
      self.logger.warn(`${packageJson.name}: clearDataFunc db${item} is not init`);
    }
  });
  if (res) {
    return res();
  } else {
    return Promise.resolve();
  }
};
