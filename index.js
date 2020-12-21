const packageJson = require('./package.json');

function Logger(config) {
  if (!config) {
    config = {};
  }

  const self = this;
  this.db = null;
  this.preQueue = [];
  this.runVersionChange = false;

  function dealPreviousData() {
    if (self.preQueue.length) {
      return self[self.preQueue[0].name](self.preQueue[0].loggerContent).then(
        function () {
          self.preQueue.shift();
          if (self.preQueue.length) {
            return dealPreviousData();
          }
        }
      );
    }
  }

  if (Object.prototype.toString.call(config) === "[object Object]") {
    this.userConfig = config;
    this.userConfig.isDevEnv = this.userConfig.isDevEnv || false;
    this.userConfig.collectionName =
      typeof this.userConfig.collectionName === "string"
        ? this.userConfig.collectionName
        : "logger-for-cannot-duplicate";
    this.userConfig.serverAddr =
      typeof this.userConfig.serverAddr === "string"
        ? this.userConfig.serverAddr
        : "";

    if (this.userConfig.serverAddr === "") {
      console.warn("logger-for-cannot-duplicate: serverAddr is not config!");
    }

    const collection = this.userConfig.collectionName;
    const request = indexedDB.open(collection, 1);

    request.onerror = function (_event) {
      console.error("logger-for-cannot-duplicate: indexedDB数据库打开报错");
    };

    request.onsuccess = function (_event) {
      self.db = request.result;
      self.Logger = {};
      self.Logger.config = self.userConfig;
      if (self.userConfig.isDevEnv) {
        console.info("logger-for-cannot-duplicate: ", self.Logger.config);
      }
      setTimeout(function () {
        if (!self.runVersionChange) {
          dealPreviousData();
        }
      }, 50);
    };

    request.onupgradeneeded = function (event) {
      self.runVersionChange = true;
      self.db = event.target.result;
      self.db.createObjectStore("collection", {
        keyPath: "key",
      });
      setTimeout(function () {
        dealPreviousData();
      }, 10);
    };

    const loggerTypes = ['debug', 'info', 'warn', 'error', 'show', 'log'];

    loggerTypes.forEach(function(level) {
      self[level] = function () {
        const args = Array.prototype.slice.call(arguments);
        const levelUpperCase = level.toUpperCase();
        if (level === "show") {
          console.log.apply(null, ["\x1b[32m [" + getTime() + "] " + levelUpperCase].concat(args));
        } else {
          if (self.userConfig.isDevEnv) {
            console[level].apply(null, ["[" + getTime() + "] " + "[" + levelUpperCase + "]"].concat(args));
          }
        }
        if (level !== "debug") {
          self.add({
            level: levelUpperCase,
            content: args
          });
        }
      };
    });

    this.showData = function () {
      return this.read()
        .then(function(result) {
          console.log('collection:', self.userConfig.collectionName, result);
        });
    };

    this.add = function (loggerContent) {
      const key = getTime() + "-" + Math.random().toString(36).slice(5);
      if (Object.prototype.toString.call(loggerContent) === '[object Object]') {
        loggerContent.key = key;
      } else {
        loggerContent = {
          content: loggerContent || Object.prototype.toString.call(loggerContent),
          key: key
        };
      }
      try {
        loggerContent = JSON.parse(JSON.stringify(loggerContent));
      } catch (err) {
        loggerContent = {
          err: JSON.stringify({})
        };
      }
      if (!self.db) {
        self.preQueue.push({
          name: "add",
          loggerContent: loggerContent,
        });
        return Promise.resolve("pending");
      }
      return new Promise(function (resolve) {
        const request = self.db
          .transaction(["collection"], "readwrite")
          .objectStore("collection")
          .add(loggerContent);

        request.onsuccess = function (_event) {
          resolve(loggerContent);
        };

        request.onerror = function (event) {
          resolve(event);
          console.warn("logger-for-cannot-duplicate: 数据写入失败");
        };
      });
    };

    this.read = function () {
      if (!self.db) {
        self.preQueue.push({ name: "read" });
        return Promise.resolve("pending! please wait indexedDB prepare and then read");
      }

      const result = [];
      return new Promise(function (resolve) {
        const objectStore = self.db
          .transaction("collection")
          .objectStore("collection");

        objectStore.openCursor().onsuccess = function (event) {
          const cursor = event.target.result;
          if (cursor) {
            result.push(cursor.value);
            cursor.continue();
          } else {
            resolve(result);
          }
        };
      });
    };

    this.remove = function () {
      if (!self.db) {
        self.preQueue.push({ name: "remove" });
        return Promise.resolve("pending");
      }

      return new Promise(function (resolve) {
        self.db.close();
        const req = indexedDB.deleteDatabase(collection);

        req.onsuccess = function () {
          resolve("success");
        };

        req.onerror = function () {
          console.log("logger-for-cannot-duplicate: Couldn't delete database");
          resolve("fail");
        };

        req.onblocked = function () {
          // console.warn("Couldn't delete database due to the operation being blocked");
          resolve("blocked");
        };
      });
    };

    this.send = function (loggerContents, objectID) {
      if (!objectID) {
        return Promise.reject(new Error("objectID is required"));
      }

      return new Promise(function (res) {
        if (!loggerContents) {
          return self.read().then(function (contents) {
            sendFunc(contents, res, objectID);
          });
        } else {
          return sendFunc(loggerContents, res, objectID);
        }
      });
    };
  } else {
    // prevent project init
    throw new Error("logger-for-cannot-duplicate: config must be an object or empty");
  }

  function sendFunc(loggerContents, res, objectID) {
    const obj = {
      logger: loggerContents,
      logId: objectID,
      dateFromFrontend: getTime(),
      version: packageJson.version,
      page: location.href
    };

    if (window && window.navigator && typeof window.navigator.sendBeacon === "function") {
      const formData = new FormData();
      Object.keys(obj).forEach(function (key) {
        var value = obj[key];
        if (typeof value !== "undefined") {
          if (typeof value === "object") {
            value = JSON.stringify(value, null, 2);
          }
          formData.append(key, value);
        }
      });
      window.navigator.sendBeacon(self.userConfig.serverAddr, formData);
      res("success");
    } else {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", self.userConfig.serverAddr, true);
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          res(xhr.responseText);
        } else {
          res("send_fail");
        }
      };
      xhr.send(JSON.stringify(obj));
    }
  }
}

function getTime() {
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const day = new Date().getDate();
  var hour = new Date().getHours();
  var minute = new Date().getMinutes();
  var second = new Date().getSeconds();
  var mileSecond = new Date().getMilliseconds();
  if (hour < 10) {
    hour = "0" + hour;
  }
  if (minute < 10) {
    minute = "0" + minute;
  }
  if (second < 10) {
    second = "0" + second;
  }
  if (mileSecond < 10) {
    mileSecond = "00" + mileSecond;
  }
  if (mileSecond < 100) {
    mileSecond = "0" + mileSecond;
  }
  const time = year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second + "." + mileSecond;
  return time;
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
