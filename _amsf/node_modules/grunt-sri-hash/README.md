# grunt-sri-hash
[![Greenkeeper badge](https://badges.greenkeeper.io/sparanoid/grunt-sri-hash.svg)](https://greenkeeper.io/)
[![Build Status](https://api.travis-ci.org/sparanoid/grunt-sri-hash.svg?branch=master)](https://travis-ci.org/sparanoid/grunt-sri-hash)
[![Dependency Status](https://david-dm.org/sparanoid/grunt-sri-hash.svg)](https://david-dm.org/sparanoid/grunt-sri-hash)
[![devDependency Status](https://david-dm.org/sparanoid/grunt-sri-hash/dev-status.svg)](https://david-dm.org/sparanoid/grunt-sri-hash#info=devDependencies)
[![npm Version](https://img.shields.io/npm/v/grunt-sri-hash.svg)](https://www.npmjs.com/package/grunt-sri-hash)
[![npm Downloads](https://img.shields.io/npm/dm/grunt-sri-hash.svg)](https://www.npmjs.com/package/grunt-sri-hash)

> A grunt task which hashes all scripts and stylesheets with integrity attributes.

## Getting Started

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-sri-hash --save-dev
```

One the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-sri-hash');
```

## The "sri_hash" task

### Overview

In your project's Gruntfile, add a section named `sri_hash` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  sri_hash: {
    options: {
      algorithm: "sha512",
      selector: 'script[src]:not([integrity]):not([src^="http"]):not([src^="//"])'
    },
    all: {
      files: {
        'dest-index.html': 'source-index.html',
      },
    },
  },
});
```

### Options

#### `algorithm`

Defaults to `sha384`.

```js

grunt.initConfig({
  sri_hash: {
    all: {
      options: {
        algorithm: 'sha384'
      },
      files: {
        'dest-index.html': 'source-index.html',
      },
    },
  },
});
```

#### `selector`

Defaults to `link[rel=stylesheet][href]:not([integrity]):not([href^="http"]):not([href^="//"]), script[src]:not([integrity]):not([src^="http"]):not([src^="//"])`.

```js

grunt.initConfig({
  sri_hash: {
    all: {
      options: {
        selector: 'script[src]:not([integrity]):not([src^="http"]):not([src^="//"])'
      },
      files: {
        'dest-index.html': 'source-index.html',
      },
    },
  },
});
```

#### `assetsDir`

Defaults to `''`.

```js

grunt.initConfig({
  sri_hash: {
    all: {
      options: {
        assetsDir: '_site'
      },
      files: {
        'dest-index.html': 'source-index.html',
      },
    },
  },
});
```

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History

- See `CHANGELOG.md` for release history
