# grunt-doctype
[![Greenkeeper badge](https://badges.greenkeeper.io/sparanoid/grunt-doctype.svg)](https://greenkeeper.io/)
[![Build Status](https://api.travis-ci.org/sparanoid/grunt-doctype.svg?branch=master)](https://travis-ci.org/sparanoid/grunt-doctype)
[![Dependency Status](https://david-dm.org/sparanoid/grunt-doctype.svg)](https://david-dm.org/sparanoid/grunt-doctype)
[![devDependency Status](https://david-dm.org/sparanoid/grunt-doctype/dev-status.svg)](https://david-dm.org/sparanoid/grunt-doctype#info=devDependencies)
[![npm Version](https://img.shields.io/npm/v/grunt-doctype.svg)](https://www.npmjs.com/package/grunt-doctype)
[![npm Downloads](https://img.shields.io/npm/dm/grunt-doctype.svg)](https://www.npmjs.com/package/grunt-doctype)

> Minimal effort DOCTYPE transformation with grunt.

## Getting Started

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-doctype --save-dev
```

One the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-doctype');
```

## The "doctype" task

### Overview

In your project's Gruntfile, add a section named `doctype` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  doctype: {
    options: {
      selector: '/<!DOCTYPE[^>[]*(\[[^]]*\])?>/i'
      transform: function (input) {
        return `<!${input[1].toLowerCase()} HTML>`;
      }
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

#### `selector`

Defaults to `/<!(DOCTYPE)([^>]*?)>/i`.

```js

grunt.initConfig({
  doctype: {
    all: {
      options: {
        selector: '/<!DOCTYPE[^>[]*(\[[^]]*\])?>/i'
      },
      files: {
        'dest-index.html': 'source-index.html',
      },
    },
  },
});
```

#### `transform`

Defaults to:

```js
function (input) {
  return input[0].toLowerCase();
}
```

```js

grunt.initConfig({
  doctype: {
    all: {
      options: {
        transform: function (input) {
          return `<!${input[1].toLowerCase()} HTML>`;
        }
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
