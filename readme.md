# LoggerForCannotDuplicate

A light logger system for browser for the case which can not duplicate but sometimes happened.  

## Functions

```zero dependence => written with ES5```  

Log useful info to indexedDB to send to server for analysis  

## Usage

```js
import Logger from "logger-for-cannot-duplicate"

// support more one instances
const logger1 = new Logger({
  collectionName: "foo",  //to put lof info
  serverAddr: "put your log server addr here"  //to receive your log infos
})
const logger2 = new Logger({
  collectionName: "oops",
  serverAddr: "put your log server addr here"
})
//Due to initialize indexedDB is async, so if read or remove or add will return a result named pending 
//it's better to instance Logger first and then to use.
logger1.add('123456')  //add one log to indexedDB
logger1.add(true)
logger1.read()  //read logs in that indexDB collection， init indexedDb require some time, please wait indexedDB prepare and then call logger mehod
  .then(result => {
    console.log("result", result)
    logger1.remove()  //remove that indexDB collection
    logger1.send(result, "myId")  //send log infos to server
  })
logger2.add(123456)
logger2.add([1, 2, 3, 4, 5, 6])
logger2.read()
  .then(result => {
    console.log("result2", result)
    // logger2.remove()
  })
```

## Api

There are only four apis at present and are easy to use.  
```add```
add one log info to indexedDB to save  

```read```
read log infos from that indexedDB  

```remove```
remove that indexedDB database  

```send```
send your log infos to your server  

## License

[MIT](https://github.com/zhoushoujian/logger-for-cannot-duplicate/blob/master/LICENSE)  