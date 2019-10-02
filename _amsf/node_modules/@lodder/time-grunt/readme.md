# time-grunt
[![NPM Version](https://img.shields.io/npm/v/@lodder/time-grunt.svg?style=flat)](https://npmjs.org/package/@lodder/time-grunt)
[![Build Status](https://travis-ci.com/C-Lodder/time-grunt.svg?branch=master)](https://travis-ci.org/C-Lodder/time-grunt)
[![Dependency Status](https://david-dm.org/C-Lodder/time-grunt.png)](https://david-dm.org/C-Lodder/time-grunt)

> Display the elapsed execution time of [grunt](http://gruntjs.com) tasks

![](screenshot.png)


## Install

```
$ npm i --save-dev @lodder/time-grunt
```


## Usage

```js
// Gruntfile.js
module.exports = grunt => {
	// Require it at the top and pass in the grunt instance
	require('@lodder/time-grunt')(grunt);

	grunt.initConfig();
}
```


## Optional callback

If you want to collect the timing stats for your own use, pass in a callback:

```js
require('time-grunt')(grunt, (stats, done) => {
	// do whatever you want with the stats
	uploadReport(stats);

	// be sure to let grunt know when to exit
	done();
});
```


## Clean layout

The `watch` task is hidden to reduce clutter.

Run grunt with `grunt --verbose` to see all tasks.

Run grunt with `grunt --quiet` to quiet all tasks including time-grunt.


## License

MIT © [Sindre Sorhus](https://sindresorhus.com)
