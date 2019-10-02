# grunt-html-trim

[![Greenkeeper badge](https://badges.greenkeeper.io/sparanoid/grunt-html-trim.svg)](https://greenkeeper.io/)

[![NPM version](https://img.shields.io/npm/v/grunt-html-trim.svg?)](https://www.npmjs.com/package/grunt-html-trim)
[![Build Status](https://travis-ci.org/sparanoid/grunt-html-trim.svg?branch=master)](https://travis-ci.org/sparanoid/grunt-html-trim)
[![dependencies Status](https://img.shields.io/david/sparanoid/grunt-html-trim.svg)](https://david-dm.org/sparanoid/grunt-html-trim)
[![devDependencies Status](https://img.shields.io/david/dev/sparanoid/grunt-html-trim.svg)](https://david-dm.org/sparanoid/grunt-html-trim?type=dev)

> Trim HTML files

## Getting Started

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-html-trim --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-html-trim');
```

## The "html_trim" task

### Overview

In your project's Gruntfile, add a section named `html_trim` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  html_trim: {
    options: {
      // Task-specific options go here.
    }
  },
});
```

### Options

No options for this plugin.

### Usage Examples

#### Single File

In this example, `html_trim` will trim single file `app/index.html` and save output to `dist/index.html`.

```js
grunt.initConfig({
  html_trim: {
    files: {
      'dist/index.html': 'app/index.html'
    }
  },
});
```

#### Multiple Files

In this example, `html_trim` will trim all `*.html` files include subdirectories under `app/` and save output to `dist/` directory.

```js
grunt.initConfig({
  html_trim: {
    files: [
      {
        expand: true,
        cwd: 'app/',
        src: "**/*.html",
        dest: "dist/"
      }
    ]
  },
});
```

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## License

MIT
