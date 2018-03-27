'use strict';

const rccCore = require('rcc-core');

const RedisMock = require('ioredis-mock');
const ReplyError = require('ioredis').ReplyError;
exports.ReplyError = ReplyError;

const adaptee = 'ioredis-mock';
exports.adaptee = adaptee;

const defaultHost = 'localhost';
const defaultPort = rccCore.DEFAULT_REDIS_PORT;

exports.defaultHost = defaultHost;
exports.defaultPort = defaultPort;

exports.createClient = createClient;

const clientFunctionActions = [];
const clientFunctions = {};
const deletedClientFunctions = [];

exports.getClientFunction = getClientFunction;
exports.setClientFunction = setClientFunction;
exports.deleteClientFunction = deleteClientFunction;

exports.isMovedError = isMovedError;
exports.resolveHostAndPortFromMovedError = resolveHostAndPortFromMovedError;

const redisMockExample = new RedisMock();
const redisMockFnNames = Object.getOwnPropertyNames(redisMockExample)
  .filter(n => typeof redisMockExample[n] === 'function');

/**
 * Creates a new RedisClient instance.
 * NB: Add/remove any functions that you need to change via `setClientFunction`/`deleteClientFunction` BEFORE you create
 * any RedisClient mock instance via `createClient` - otherwise the instance will NOT see any such function changes made
 * after it is created.
 * @param {RedisClientOptions|undefined} [redisClientOptions] - the options to use to construct the new Redis client
 *        instance
 * @return {RedisClient} returns the new RedisClient instance
 */
function createClient(redisClientOptions) {
  const client = new RedisMock(redisClientOptions);
  if (!client._options) {
    client._options = redisClientOptions;
  }
  fixRedisClientFunctions(client);
  adaptRedisClient(client);
  updateClientWithClientFunctions(client);

  return client;
}

function fixRedisClientFunctions(client) {
  // If client is missing an `end` method then use its `quit` method as an `end` method
  if (!client.end) {
    // console.log('Adding missing `end` function to `ioredis-mock` client instance');
    client.end = endViaQuit;
  }
}

function adaptRedisClient(client) {
  if (!client.getAdapter) {
    client.getAdapter = getAdapter;
  }

  if (!client.getOptions) {
    client.getOptions = getOptions;
  }

  if (!client.isClosing) {
    client.isClosing = isClosing;
  }

  if (!client.resolveHostAndPort) {
    client.resolveHostAndPort = resolveHostAndPort;
  }

  if (!client.addEventListeners) {
    client.addEventListeners = addEventListeners;
  }

  if (!client.getFunction) {
    client.getFunction = getFunction;
  }

  if (!client.setFunction) {
    client.setFunction = setFunction;
  }

  if (!client.deleteFunction) {
    client.deleteFunction = deleteFunction;
  }
}

function getClientFunction(fnName) {
  return clientFunctions[fnName] || redisMockExample[fnName];
}

function setClientFunction(fnName, fn) {
  let origFnName = undefined;
  for (let i = 0; i < redisMockFnNames.length; ++i) {
    let n = redisMockFnNames[i];
    if (redisMockExample[n] === fn) {
      origFnName = n;
      break;
    }
  }
  const action = {action: 'set', fnName: fnName, fn: fn, origFnName: origFnName};
  clientFunctionActions.push(action);

  clientFunctions[fnName] = fn;
  const pos = deletedClientFunctions.indexOf(fnName);
  if (pos !== -1) {
    deletedClientFunctions.splice(pos, 1);
  }

  return action;
}

function deleteClientFunction(fnName) {
  clientFunctionActions.push({action: 'del', fnName: fnName});

  delete clientFunctions[fnName];
  if (!deletedClientFunctions.includes(fnName)) {
    deletedClientFunctions.push(fnName);
  }
}

function updateClientWithClientFunctions(client) {
  clientFunctionActions.forEach(action => {
    const fnName = action.fnName;
    const origFnName = action.origFnName;

    switch (action.action) {
      case 'set':
        client[fnName] = origFnName ? client[origFnName] : action.fn;
        break;

      case 'del':
        delete client[fnName];
        break;
    }
  });
}

function getFunction(fnName) {
  return getClientFunction(fnName);
}

function setFunction(fnName, fn) {
  const action = setClientFunction(fnName, fn);
  const origFnName = action.origFnName;
  this[fnName] = origFnName ? this[origFnName] : fn;
}

function deleteFunction(fnName) {
  deleteClientFunction(fnName);
  delete this[fnName];
}

/**
 * Returns true if the given error indicates that the key attempted was moved to a new host and port; otherwise returns
 * false.
 * @param {Error|ReplyError} error - an error thrown by a RedisClient instance
 * @return {boolean} true if moved; false otherwise
 */
function isMovedError(error) {
  // Check if error message contains something like: "MOVED 14190 127.0.0.1:6379"
  return error.message && error.message.startsWith('MOVED ');
}

/**
 * Extracts the new host and port from the given RedisClient "moved" ReplyError.
 * @param {ReplyError|Error} movedError - a ReplyError thrown by a RedisClient instance that indicates the redis server
 *        has moved
 * @return {[string, number|string]} the new host and port
 */
function resolveHostAndPortFromMovedError(movedError) {
  // Attempt to resolve the new host & port from the error message
  if (isMovedError(movedError)) {
    return movedError.message.substring(movedError.message.lastIndexOf(' ') + 1).split(':');
  }
  throw new Error(`Unexpected ioredis-mock client "moved" ReplyError - ${movedError}`);
}

/**
 * Simulates the missing `end` function by delegating to the `quit` function.
 * @param {boolean|undefined} [flush] - emulates the optional flush argument of other implementations' `end` functions
 * @returns {*} the result returned by `quit`
 */
function endViaQuit(flush) {
  let args = arguments;

  // Drop the first flush argument (if any), since quit cannot use it
  if (typeof flush !== 'function') {
    const n = arguments.length;
    args = new Array(n - 1);
    for (let i = 1; i < n; ++i) {
      args[i - 1] = arguments[i];
    }
  }
  this.manuallyClosing = true; // simulate a "closing" flag
  return this.quit.apply(this, args);
}

/**
 * Returns true if this RedisClient instance's connection is closing or has closed.
 * @return {boolean} true if closing or closed; false otherwise
 */
function getAdapter() {
  return module.exports;
}

/**
 * Returns the options with which this RedisClient instance was constructed.
 * @returns {RedisClientOptions} the options used
 */
function getOptions() {
  return this._options;
}

/**
 * Returns true if this RedisClient instance's connection is closing or has closed.
 * @return {boolean} true if closing or closed; false otherwise
 */
function isClosing() {
  return this.manuallyClosing;
}

/**
 * Resolves the host & port of this RedisClient instance.
 * @return {[string, number|string]} an array containing the host and port
 */
function resolveHostAndPort() {
  return this._options ? [this._options.host || defaultHost, this._options.port || defaultPort] :
    [defaultHost, defaultPort];
}

function addEventListeners(onConnect, onReady, onReconnecting, onError, onClientError, onEnd, onClose) {
  if (typeof onConnect === 'function') this.on('connect', onConnect);
  if (typeof onReady === 'function') this.on('ready', onReady);
  if (typeof onReconnecting === 'function') this.on('reconnecting', onReconnecting);
  if (typeof onError === 'function') this.on('error', onError);
  if (typeof onClientError === 'function') this.on('clientError', onClientError);
  if (typeof onEnd === 'function') this.on('end', onEnd);
  if (typeof onClose === 'function') this.on('close', onClose);
}