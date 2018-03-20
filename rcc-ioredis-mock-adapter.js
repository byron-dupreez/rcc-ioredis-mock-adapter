'use strict';

const rccCore = require('rcc-core');

const IoRedisClient = require('ioredis-mock');

const DEFAULT_REDIS_HOST = 'localhost';
const DEFAULT_REDIS_PORT = rccCore.DEFAULT_REDIS_PORT;

exports.getDefaultHost = () => DEFAULT_REDIS_HOST;
exports.getDefaultPort = () => DEFAULT_REDIS_PORT;

exports.createClient = createClient;

exports.getClientFunction = getClientFunction;
exports.setClientFunction = setClientFunction;
exports.deleteClientFunction = deleteClientFunction;

exports.isMovedError = isMovedError;
exports.resolveHostAndPortFromMovedError = resolveHostAndPortFromMovedError;

/**
 * Creates a new RedisClient instance.
 * @param {RedisClientOptions|undefined} [redisClientOptions] - the options to use to construct the new Redis client
 *        instance
 * @return {RedisClient} returns the new RedisClient instance
 */
function createClient(redisClientOptions) {
  const client = new IoRedisClient(redisClientOptions);
  adaptClient(client);
  return client;
}

function adaptClient(client) {
  if (!client.end) {
    // If client is missing an `end` method then use its `quit` method as an `end` method
    client.end = function end(flush) {
      let args = arguments;
      if (flush === true || flush === false) {
        args = new Array(arguments.length - 1);
        for (let i = 1; i < arguments.length; ++i) {
          args[i - 1] = arguments[i];
        }
      }
      this.manuallyClosing = true;
      return this.quit.apply(this, args);
    };
  }

  if (!client.getAdapter) {
    /**
     * Returns true if this RedisClient instance's connection is closing or has closed.
     * @return {boolean} true if closing or closed; false otherwise
     */
    client.getAdapter = function () {
      return module.exports;
    };
  }

  if (!client.isClosing) {
    /**
     * Returns true if this RedisClient instance's connection is closing or has closed.
     * @return {boolean} true if closing or closed; false otherwise
     */
    client.isClosing = function () {
      return this.manuallyClosing;
    };
  }

  if (!client.resolveHostAndPort) {
    /**
     * Resolves the host & port of this RedisClient instance.
     * @return {[string, string|number]} an array containing the host and port
     */
    client.resolveHostAndPort = function () {
      const connectionOptions = this.connection_options;
      return connectionOptions ? [connectionOptions.host, connectionOptions.port] :
        this.options ? [this.options.host, this.options.port] : [DEFAULT_REDIS_HOST, DEFAULT_REDIS_PORT];
    };
  }

  if (!client.getOptions) {
    client.getOptions = function () {
      return this.options;
    };
  }

  if (!client.addEventListeners) {
    client.addEventListeners = function (onConnect, onReady, onReconnecting, onError, onClientError, onEnd, onClose) {
      if (typeof onConnect === 'function') this.on('connect', onConnect);
      if (typeof onReady === 'function') this.on('ready', onReady);
      if (typeof onReconnecting === 'function') this.on('reconnecting', onReconnecting);
      if (typeof onError === 'function') this.on('error', onError);
      if (typeof onClientError === 'function') this.on('clientError', onClientError);
      if (typeof onEnd === 'function') this.on('end', onEnd);
      if (typeof onClose === 'function') this.on('close', onClose);
    }
  }

  if (!client.getFunction) {
    client.getFunction = getClientFunction;
  }

  if (!client.setFunction) {
    client.setFunction = setClientFunction;
  }

  if (!client.deleteFunction) {
    client.deleteFunction = deleteClientFunction;
  }
}

function getClientFunction(fnName) {
  return IoRedisClient.prototype[fnName];
}

function setClientFunction(fnName, fn) {
  IoRedisClient.prototype[fnName] = fn;
}

function deleteClientFunction(fnName) {
  delete IoRedisClient.prototype[fnName];
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
  throw new Error(`Unexpected ioredis mock client "moved" ReplyError - ${movedError}`);
}