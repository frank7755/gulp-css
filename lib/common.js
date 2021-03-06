/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var is = require('is');
var path = require('path');
var join = path.join;
var rename = require('./rename');
var css = require('@nuintun/css-deps');
var util = require('./util');
var debug = util.debug;
var colors = util.colors;
var initPlugins = require('./plugins/');

/**
 * get rename options
 * @param transform
 * @returns {object}
 */
function initRenameOptions(transform){
  if (is.fn(transform)) {
    return transform;
  }

  transform = transform || {};

  if (transform.min) {
    transform.suffix = '-min';
  }

  if (transform.debug) {
    transform.suffix = '-debug';
  }

  return transform;
}

/**
 * init options
 * @param options
 * @returns {object}
 */
function initOptions(options){
  var defaults = {
    include: false, // include
    prefix: null, // css prefix
    onpath: null, // css resource path callback
    cache: true, // use memory file cahe
    wwwroot: '', // web root
    rename: null // { debug: boolean, min: boolean }
  };

  // mix
  util.extend(true, defaults, options);

  // wwwroot must be string
  if (!is.string(defaults.wwwroot)) {
    util.throwError('options.wwwroot\'s value should be string.');
  }

  // init wwwroot
  defaults.wwwroot = join(util.cwd, defaults.wwwroot);
  // init plugins
  defaults.plugins = initPlugins(defaults.plugins);
  // init rename
  defaults.rename = initRenameOptions(defaults.rename);

  return defaults;
}

/**
 * transport css dependencies.
 * @param vinyl
 * @param options
 * @returns {Array}
 */
function transportCssDeps(vinyl, options){
  var deps = [];
  var remote = [];
  var include = [];
  var pkg = vinyl.package || {};
  var onpath = options.onpath;
  var prefix = options.prefix;

  // init css settings
  onpath = is.fn(onpath) ? function (path, property){
    return options.onpath(path, property, vinyl.path, options.wwwroot);
  } : null;
  prefix = is.fn(prefix) ? prefix(vinyl.path, options.wwwroot) : prefix;

  // replace imports and collect dependencies
  vinyl.contents = new Buffer(css(vinyl.contents, function (id){
    var path;

    // id is not a local file
    if (!util.isLocal(id)) {
      // cache dependencie id
      deps.push(id);
      remote.push(id);
    } else {
      // normalize id
      id = util.normalize(id);

      // if end with /, find index file
      if (id.substring(id.length - 1) === '/') {
        id += 'index.css';
      }

      // set path
      path = id;
      // rename id
      id = rename(path, options.rename);

      // normalize id
      id = util.normalize(id);

      // debug
      debug('transport deps: %s', colors.magenta(id));

      // get absolute path
      path = util.resolve(path, vinyl, options.wwwroot);

      // cache dependencie id
      deps.push(id);
      // cache dependencie absolute path
      include.push(path);
    }

    // include import css file
    if (options.include) {
      // delete all import
      return false;
    }

    // onpath callback
    if (is.string(path = onpath(id, 'import'))) {
      return path;
    }

    // don't make changes
    return id;
  }, { prefix: prefix, onpath: onpath }));

  // cache file dependencies
  vinyl.package = util.extend(pkg, {
    remote: remote,
    include: include,
    dependencies: deps
  });

  return deps;
}

/**
 * exports module
 */
exports.initOptions = initOptions;
exports.transportCssDeps = transportCssDeps;
