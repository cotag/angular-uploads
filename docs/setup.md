# Setting up Grunt

1. Install Node.js
2. Run `npm install -g karma yo generator-angular`
3. Setup a new project `yo angular`
   * Ensure it is upgraded to use AngularJS 1.2
4. Download required modules
   * `npm install`
   * `bower install`
4. Add conditional javascript libraries to the grunt file
   * Add the files to the `concat` section ([Guide here](https://github.com/gruntjs/grunt-contrib-concat#multiple-files-per-target))
   * Ensure they are placed in the `scripts` folder (ensures they are minified)
   * Copy the minifications files task to uglify to ensure these are also processed


== Snippets

```javascript
concat: {
  options: {
    separator: ';' // Probably don't need this option
  },
  dist: { // For build task
    files: {
      '<%= yeoman.dist %>/scripts/condo-hash-worker.js': ['<%= yeoman.app %>/bower_components/spark-md5/spark-md5.js', '<%= yeoman.app %>/scripts/condo/md5/hasher.js', '<%= yeoman.app %>/scripts/condo/md5/hash.worker.js'],
      '<%= yeoman.dist %>/scripts/condo-hash-worker-emulator.js': ['<%= yeoman.app %>/bower_components/spark-md5/spark-md5.js', '<%= yeoman.app %>/scripts/condo/md5/hasher.js', '<%= yeoman.app %>/scripts/condo/md5/hash.worker.emulator.js'],
    }
  },
  server: { // For server task
    files: {
      '.tmp/scripts/condo-hash-worker.js': ['<%= yeoman.app %>/bower_components/spark-md5/spark-md5.js', '<%= yeoman.app %>/scripts/condo/md5/hasher.js', '<%= yeoman.app %>/scripts/condo/md5/hash.worker.js'],
      '.tmp/scripts/condo-hash-worker-emulator.js': ['<%= yeoman.app %>/bower_components/spark-md5/spark-md5.js', '<%= yeoman.app %>/scripts/condo/md5/hasher.js', '<%= yeoman.app %>/scripts/condo/md5/hash.worker.emulator.js'],
    }
  }
}
```
