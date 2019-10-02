'use strict';

module.exports = function(grunt) {

  require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);
  require("time-grunt")(grunt);

  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= nodeunit.tests %>',
      ],
      options: {
        jshintrc: '.jshintrc',
      },
    },

    clean: {
      tests: ['tmp'],
    },

    doctype: {
      default_options: {
        files: {
          'tmp/default_options.html': 'test/fixtures/index.html',
        },
      },
      custom_selector: {
        options: {
          selector: /(nothing to replace)/
        },
        files: {
          'tmp/custom_selector.html': 'test/fixtures/index.html',
        },
      },
      custom_transform: {
        options: {
          transform: function (input) {
            return `<!${input[1].toLowerCase()} HTML>`;
          }
        },
        files: {
          'tmp/custom_transform.html': 'test/fixtures/index.html',
        },
      }
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js'],
    },

    conventionalChangelog: {
      options: {
        changelogOpts: {
          preset: "angular"
        }
      },
      dist: {
        src: "CHANGELOG.md"
      }
    },

    bump: {
      options: {
        files: ["package.json"],
        commitMessage: 'chore: release v%VERSION%',
        commitFiles: ["-a"],
        tagMessage: 'chore: create tag %VERSION%',
        push: false
      }
    },

    'npm-contributors': {
      options: {
        commitMessage: 'chore: update contributors'
      }
    }

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['clean', 'doctype', 'nodeunit']);

  grunt.registerTask('release', 'bump, changelog and publish to npm.', function(type) {
    grunt.task.run([
      'npm-contributors',
      'bump:' + (type || 'patch') + ':bump-only',
      'conventionalChangelog',
      'bump-commit',
      'npm-publish'
    ]);
  });

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);

};
