## Changes

### 1.0.11
- Updated rcc-core dependency

### 1.0.10
- Fix to register replacement for missing `end` function upfront

### 1.0.9
- Refactored code to deal with the fact that the mocked `ioredis` functions are installed on EACH RedisMock instance and 
  NOT on their prototype object by instead recording module-level client function actions and applying these actions on 
  each client during creation
  
### 1.0.8
- Refactored code to attempt to deal with the fact that the mocked `ioredis` functions are installed on EACH RedisMock 
  instance and NOT on their prototype object

### 1.0.7
- Moved all fixing of RedisClient functions and adaptation of the RedisClient prototype to happen at module load time 
  in order to fix sequencing bugs where promise-returning "Async" functions installed later by `redis-client-cache` 
  were NOT seeing the fixed `end` function

### 1.0.4
- Added unit tests to verify `ping` function works as expected

### 1.0.3
- Replaced `getDefaultHost` function with `defaultHost` property
- Replaced `getDefaultPort` function with `defaultPort` property

### 1.0.2
- Added `.npmignore`
- Renamed `release_notes.md` to `CHANGES.md`
- Updated dependencies

### 1.0.1
- Added better mocked support for `getOptions` and `resolveHostAndPort`

### 1.0.0
- Initial version