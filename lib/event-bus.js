function EventBus() {
  const self = this;
  this.emitObj = {};

  this.on = function (name, callback) {
    if (!this.emitObj[name]) {
      this.emitObj[name] = [];
    }
    this.emitObj[name].push(callback);
  };

  this.emit = async function (name) {
    const args = Array.from(arguments).slice(1);
    if (this.emitObj[name] && this.emitObj[name].length) {
      for (const callback of this.emitObj[name]) {
        // eslint-disable-next-line no-await-in-loop
        await callback.apply(self, args);
      }
    }
  };

  this.once = function (name, callback) {
    function oneTime() {
      callback.apply(this, arguments);
      self.off(name, oneTime.cbName);
    }
    oneTime.cbName = callback;
    this.on(name, oneTime);
  };

  this.off = function (name, callback) {
    if (!arguments) {
      this.emitObj = Object.create(null);
    }
    if (this.emitObj[name]) {
      if (callback) {
        for (let i = 0; i < this.emitObj[name].length; i++) {
          if (this.emitObj[name].indexOf(this.emitObj[name]) !== -1) {
            this.emitObj[name].splice(i, 1);
          }
        }
      } else {
        this.emitObj[name].length = 0;
      }
    }
  };
}

module.exports = EventBus;
