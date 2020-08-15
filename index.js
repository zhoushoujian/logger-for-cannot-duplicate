Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true });
  } else {
    obj[key] = value;
  }
  return obj;
}

function LoggerForCannotDuplicate(config) {
  if (!config) {
    config = {};
  }
  var self = this;
  this.db = null;
  this.preQueue = [];
  this.runVersionChange = false;

  function dealPreviousData() {
    if (self.preQueue.length) {
      return self[self.preQueue[0].name](self.preQueue[0].loggerContent)
        .then(function () {
          self.preQueue.shift();
          if (self.preQueue.length) {
            return dealPreviousData();
          }
        });
    }
  }

  if (Object.prototype.toString.call(config) === '[object Object]') {
    this.userConfig = config;
    this.userConfig.collectionName = (typeof (this.userConfig.collectionName) === 'string' ? this.userConfig.collectionName : "default");
    this.userConfig.serverAddr = (typeof (this.userConfig.serverAddr) === 'string' ? this.userConfig.serverAddr : "");
    if (this.userConfig.serverAddr === "") {
      console.warn("server addr is not config!");
    }
    var collection = this.userConfig.collectionName;
    var request = indexedDB.open(collection, 1);
    request.onerror = function (_event) {
      console.error('loggerForCannotDuplicate: 数据库打开报错');
    };
    request.onsuccess = function (_event) {
      self.db = request.result;
      setTimeout(function () {
        if (!self.runVersionChange) {
          dealPreviousData();
        }
      }, 50);
    };
    request.onupgradeneeded = function (event) {
      self.runVersionChange = true;
      self.db = event.target.result;
      self.db.createObjectStore('collection', { keyPath: 'key' });
      setTimeout(function () {
        dealPreviousData();
      }, 10);
    };

    this.add = function (loggerContent) {
      if (!self.db) {
        self.preQueue.push({
          name: 'add',
          loggerContent: loggerContent
        });
        return Promise.resolve('pending');
      }
      loggerContent = {
        key: new Date().formatTime("yyyy-MM-dd hh:mm:ss:S") + "-" + String(Math.random()).slice(-4),
        content: loggerContent
      };
      return new Promise(function (resolve) {
        var request = self.db.transaction(['collection'], 'readwrite')
          .objectStore('collection')
          .add(loggerContent);
        request.onsuccess = function (_event) {
          resolve(loggerContent);
        };
        request.onerror = function (event) {
          resolve(event);
          console.warn('loggerForCannotDuplicate: 数据写入失败');
        };
      });
    };

    this.read = function () {
      if (!self.db) {
        self.preQueue.push({
          name: 'read'
        });
        return Promise.resolve('pending');
      }
      var result = [];
      return new Promise(function (resolve) {
        var objectStore = self.db.transaction('collection').objectStore('collection');
        objectStore.openCursor().onsuccess = function (event) {
          var cursor = event.target.result;
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
        self.preQueue.push({
          name: 'remove'
        });
        return Promise.resolve('pending');
      }
      return new Promise(function (resolve) {
        self.db.close();
        var req = indexedDB.deleteDatabase(collection);
        req.onsuccess = function () {
          resolve("success");
        };
        req.onerror = function () {
          console.log("Couldn't delete database");
          resolve("fail");
        };
        req.onblocked = function () {
          // console.warn("Couldn't delete database due to the operation being blocked");
          resolve("blocked");
        };
      });
    };

    this.send = function (loggerContents, objectID) {
      function sendFunc(loggerContents, res) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', self.userConfig.serverAddr, true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4 && xhr.status === 200) {
            res(xhr.responseText);
          } else {
            res("send_fail");
          }
        };
        var obj = { loggerContents: loggerContents };
        if (objectID) {
          obj = _defineProperty({
            logger: loggerContents
          }, objectID, true);
        }
        xhr.send(JSON.stringify(obj));
      }

      return new Promise(function (res) {
        if (!loggerContents) {
          self.read()
            .then(function (contents) {
              sendFunc(contents, res);
            });
        } else {
          sendFunc(loggerContents, res);
        }
      });
    };

  } else {
    throw new Error("loggerForCannotDuplicate: config must be an object or empty");
  }
}

Date.prototype.formatTime = function (fmt) {
  var o = {
    "M+": this.getMonth() + 1, //月份
    "d+": this.getDate(), //日
    "h+": this.getHours(), //小时
    "m+": this.getMinutes(), //分
    "s+": this.getSeconds(), //秒
    "q+": Math.floor((this.getMonth() + 3) / 3), //季度
    "S": this.getMilliseconds() //毫秒
  };
  try {
    if (/(y+)/.test(fmt)) {
      fmt = fmt.replace(RegExp.$1, String(this.getFullYear()).slice(4 - RegExp.$1.length));
    }
    for (var k in o) {
      if (new RegExp("(" + k + ")").test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (("00" + o[k]).slice(o[k].length)));
      }
    }
  } catch (err) {
    //
  }
  return fmt;
};


exports.default = LoggerForCannotDuplicate;
