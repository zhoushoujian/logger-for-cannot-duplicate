# logger-for-cannot-duplicate

[ENGLISH] | [中文](./readme_zh.md)

A light logger system for browser.

## Functions

`zero dependence`

Log useful info to indexedDB to send to server for analysis
Default to use navigator.sendBeacon to upload and not support to fail back to xhr

## Usage

```Open test.html to experience```

```js
import Logger from "logger-for-cannot-duplicate";

//support more one instances
const logger = new Logger({
  //if isDevEnv is true, it will print console, including logger-for-cannot-duplicate config
  isDevEnv: true,   // default value: false
  //indexedDB to put log info
  collectionName: "foo", // default value: logger-for-cannot-duplicate
  //your server to receive log infos
  serverAddr: "put your log server addr here",  // default value: "",
  //write log info to local file if you use electron and specify log path
  logFilePath: "", // default value: ""
  //the slicing of per log file
  logFileSize: 100 * 1024 * 1024, //default value: 100 * 1024 * 1024,
});

//Due to initialize indexedDB is async, so if read or remove or add will return a result named pending
//it's better to instance Logger first and then to use. e.g. init Logger when project launch
//debug level not log to indexedDB
logger.debug("this is debug info");
logger.info("this is info info");
logger.warn("this is warn info");
logger.error("this is error info");
//logger.show will print console even if isDevEnv is false or undefined
logger.show("this is show level info");
//add one log to indexedDB
logger.add("123456");
logger.add(true);
logger.showData()
//read logs in indexDB collection， init indexedDB require some time, 
//please wait indexedDB prepare and then call logger method
//other method will save actions to queue and execute util indexedDB init success
logger.read().then((result) => {
  console.log("result", result);
  //remove that indexDB collection
  logger.remove();
  //send log infos to server, also can call send without read
  logger.send(result, "myLogId");
});
```

## Api

There are nine apis at present and are easy to use.

`debug:`  
Only print info on console when isDevEnv is true, `not save` to indexedDB

`info:`  
Standard logger print when isDevEnv is true, print info on console and save in indexedDB

`warn:`  
Print warn info on console when isDevEnv is true and save in indexedDB

`error:`  
Print error info on console when isDevEnv is true and save in indexedDB

`show:`  
Print info on console `even if isDevEnv is false`, and save to indexedDB

`showData:`  
show all data in specify indexedDB collection

`log:`  
Print log info on console when isDevEnv is true and save in indexedDB

`add:`  
Add one log info to indexedDB to save

`read:`  
Read log infos from that indexedDB

`remove:`  
Remove that indexedDB database

`send:`  
Send log infos to your server

## CHANGELOG

[CHANGELOG](./CHANGELOG.md)

## License

[MIT](./LICENSE)
