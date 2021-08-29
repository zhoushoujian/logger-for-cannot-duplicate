# logger-for-cannot-duplicate

[中文] | [ENGLISH](./readme.md)

一款轻量级的前端日志系统

## 安装

```shell
npm i logger-for-cannot-duplicate
```

## 功能

`零依赖`

打印有用的信息到 indexedDB,然后发送到的服务器上便于分析
默认使用 navigator.sendBeacon 上报日志，如果浏览器不支持，则回退到 xhr 上报

## 用法

`打开test.html体验效果`

```js
import Logger from "logger-for-cannot-duplicate";

//支持多实例
const logger = new Logger({
  //如果isDevEnv为true，日志将会打印到浏览器控制台，包括logger-for-cannot-duplicate的配置
  isDevEnv: true, //默认值: false
  //用于存放日志的indexDB集合名称
  collectionName: "foo", //默认值："logger-for-cannot-duplicate"
  //用于接收日志的服务器地址
  serverAddr: "put your log server addr here", // //默认值："",
  //如果你使用electron并且指定了日志文件路径,将会打印日志到本地文件
  logFilePath: "", // 默认值：""
  //每个日志文件的分片大小
  logFileSize: 100 * 1024 * 1024, //默认值: 100 * 1024 * 1024,
});

//由于初始化indexedDB是异步操作，所以读取、移除或添加操作都会返回一个叫pending的结果，除非indexedDB已经初始化成功
//最好是先实例化Logger然后再使用它，例如在项目初始化的时候实例化Logger
//debug级别的日志不会存储到indexedDB
logger.debug("this is debug info");
logger.info("this is info info");
logger.warn("this is warn info");
logger.error("this is error info");
//即使isDevEnv为false或undefined，logger.show也会打印到控制台
logger.show("this is show level info");
//添加一条日志到indexedDB
logger.add("123456");
logger.add(true);
logger.showData();
//读取indexedDB集合里的所有日志，初始化indexedDB需要一些时间，所以请等待indexedDB准备好再调用读取操作，
//其他方法会存到Logger队列里，直到Logger初始化完成后从队列里读取
logger.read().then((result) => {
  console.log("result", result);
  //移除Logger所在的集合
  // logger.remove();
  //仅仅清除数据库集合里的数据
  logger.clearData();
  //send log infos to server, also can call send without read
  //发送日志信息到服务器，你也可以不用先读取，直接调用send方法
  logger.send(result, "myLogId");
});
```

## Api

目前一共有 9 个 api，并且他们都很容易使用
There are nine apis at present and are easy to use.

`debug:`  
仅打印信息到控制台当 isDevEnv 为 true 的时候，不会保存到 indexedDB

`info:`  
标准的日志打印当 isDevEnv 为 true 的时候，打印日志到控制台并且存储到 indexedDB

`warn:`  
打印警告日志到控制台当 isDevEnv 为 true 的时候，并且存储到 indexedDB

`error:`  
打印错误日志到控制台当 isDevEnv 为 true 的时候，并且存储到 indexedDB

`show:`
即使 isDevEnv 为 false，依然会打印到控制台，并且存储到 indexedDB

`showData:`  
显示在指定集合里的所有数据

`log:`  
打印 log 级别的日志到控制台当 isDevEnv 为 true 的时候，并且存储到 indexedDB

`add:`  
添加一条日志信息到 indexedDB
add one log info to indexedDB to save

`read:`  
读取指定集合的所有日志信息

`remove:`  
移除指定的集合

`clearData:`
清除指定数据库集合里的数据

`send:`  
发送日志到你的服务器

## 许可证

[MIT](https://github.com/zhoushoujian/logger-for-cannot-duplicate/blob/master/LICENSE)
