const { getTime } = require('console-format');
const packageJson = require('../package.json');

exports.sendFunc = (loggerContents, res, objectID, self) => {
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
        res('send_fail');
      }
    };
    xhr.send(JSON.stringify(obj));
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
    const request = execDb.transaction([collectionName], 'readwrite').objectStore(collectionName).add(loggerContent);

    request.onsuccess = function (_event) {
      resolve(loggerContent);
    };

    request.onerror = function (event) {
      resolve(event);
      console.warn('logger-for-cannot-duplicate: 数据写入失败: ', event);
    };
  }).then(result => {
    if (res) {
      return res(result);
    } else {
      return result;
    }
  });
};

exports.removeFunc = (dbName, self, res, cancelFunc) => {
  if (cancelFunc) {
    cancelFunc();
  }
  return new Promise(function (resolve) {
    self.db.close();
    const req = indexedDB.deleteDatabase(dbName);

    req.onsuccess = function () {
      resolve('success');
    };

    req.onerror = function () {
      console.log("logger-for-cannot-duplicate: Couldn't delete database");
      resolve('fail');
    };

    req.onblocked = function () {
      // console.warn("Couldn't delete database due to the operation being blocked");
      resolve('blocked');
    };
  }).then(result => {
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
    const store = self['db' + item].transaction(collectionName, 'readwrite').objectStore(collectionName);
    store.clear();
  });
  if (res) {
    return res();
  } else {
    return Promise.resolve();
  }
};
