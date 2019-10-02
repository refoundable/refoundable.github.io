module.exports = function(grunt) {
  const path = require('path');

  grunt.registerMultiTask('doctype', 'Minimal effort DOCTYPE transformation ', function() {

    const options = this.options({
      // https://regex101.com/r/s8SBhI/1/
      selector: /<!(DOCTYPE)([^>]*?)>/i,
      transform: function (input) {
        return input[0].toLowerCase();
      }
    });

    const created = {
      files: 0
    };

    this.files.forEach((filePair) => {
      // check that the source file exists
      if (filePair.src.length === 0) { return; }

      var file_content = grunt.file.read(filePair.src);
      var get_doctype = file_content.match(options.selector);

      if (get_doctype) {
        var doctype_new = options.transform(get_doctype);
        file_content = file_content.replace(get_doctype[0], doctype_new);
        grunt.verbose.writeln(`Found DOCTYPE: ${get_doctype[0]}`.cyan);
        grunt.verbose.writeln(`Replaced DOCTYPE to: ${doctype_new}`.green);
      } else {
        grunt.verbose.writeln(`No DOCTYPE found`.yellow);
      }

      grunt.file.write(path.resolve(filePair.dest), file_content);
      created.files++;
    });

    if (created.files > 0) {
      grunt.log.ok(`${created.files} ${grunt.util.pluralize(this.files.length, 'file/files')} created.`);
    } else {
      grunt.log.warn('No files created.');
    }
  });
};
