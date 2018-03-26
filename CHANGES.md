## Changes

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