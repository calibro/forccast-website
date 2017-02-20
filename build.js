var metalsmith = require('metalsmith'),
    markdown = require('metalsmith-markdown'),
    layouts = require('metalsmith-layouts'),
    permalinks = require('metalsmith-permalinks'),
    collections = require('metalsmith-collections'),
    serve = require('metalsmith-serve'),
    watch = require('metalsmith-watch'),
    multilanguage = require('metalsmith-multi-language'),
    i18n = require('metalsmith-i18n'),
    dataloader = require('metalsmith-data-loader'),
    pagination = require('metalsmith-pagination'),
    assets = require('metalsmith-assets'),
    fromjsontocollection = require('./fromjsontocollection.js'),
    moment = require('moment'),
    nunjucks = require('nunjucks'),
    dateFilter = require('nunjucks-date-filter');

var env = nunjucks.configure('layouts', {watch: false,  noCache: true})
env.addFilter('date',dateFilter);
env.addFilter('limitTo', function(input, limit) {
  if (typeof limit !== 'number') {
    return input;
  }
  if (typeof input === 'string') {
    if (limit >= 0) {
      return input.substring(0, limit);
    } else {
      return input.substr(limit);
    }
  }
  if (Array.isArray(input)) {
    limit = Math.min(limit, input.length);
    if (limit >= 0) {
      return input.splice(0, limit);
    } else {
      return input.splice(input.length + limit, input.length);
    }
  }
  return input;
});

env.addFilter('addMonthYear', function(input, prop) {
  if (!prop || !input.length || !input) {
    return input;
  }

  input.forEach(function(d){
    var date = moment(d[prop])
    d.monthYear = date.format('MMMM YYYY')
  })

  return input;
});

metalsmith(__dirname)
  .metadata({
    site: {
      name: 'Forccast',
      baseurl: 'https://www.forccast.fr',
      author: 'Forccast team',
      description: 'Formation par la cartographie des controverses à l\'analyse des sciences et des techniques'
    }
  })
  .source('./src')
  .destination('./build')
  .use(fromjsontocollection())
  .use(collections({
    news_en: {
      pattern: 'news/**/*_en.md',
      sortBy: 'date',
      reverse: true
    },
    news_fr: {
      pattern: 'news/**/*_fr.md',
      sortBy: 'date',
      reverse: true
    },
    pages: {
      pattern: 'pages/**/*.md'
    }
  }))
  .use(dataloader({
    directory: 'data/',
    dataProperty: 'external',
  }))
  .use(pagination({
    'collections.news_fr': {
      perPage: 10,
      layout: 'news-archive.html',
      first: 'fr/news/index.html',
      path: 'fr/news/:num/index.html',
      pageMetadata: {
        title: 'Latest news'
      }
    },
    'collections.news_en': {
      perPage: 10,
      layout: 'news-archive.html',
      first: 'en/news/index.html',
      path: 'en/news/:num/index.html',
      pageMetadata: {
        title: 'Latest news'
      }
    }
  }))
  .use(multilanguage({
    default: 'fr', locales: ['fr', 'en']
  }))
  .use(i18n({
    default: 'fr',
    locales: ['fr', 'en'],
    directory: 'locales'
  }))
  .use(markdown())
  .use(permalinks({
    relative: false,
    linksets: [{
        match: { collection: 'news_fr' },
        pattern: ':locale/news/:title'
    },
    {
        match: { collection: 'news_en' },
        pattern: ':locale/news/:title'
    },
    {
        match: { collection: 'pages' },
        pattern: ':locale/:title'
    }]
  }))
  .use(layouts({
    engine: 'nunjucks',
    pattern: '**/*.html',
    directory: 'layouts'
  }))
  .use(assets({
    source: './bower_components', // relative to the working directory
    destination: './assets' // relative to the build directory
  }))
  .use(serve({
    port: 8081,
    verbose: true
  }))
  .use(watch({
      paths: {
        "${source}/**/*": true,
        "layouts/**/*": "**/*"
      }
    }))
  .build(function (err, files) {
    if (err) {
      console.log(err);
    }
    else {
      //console.log(files)
      console.log('Forccast built!');
    }
  });