import path from 'path';
import loaderUtils from 'loader-utils';
import steed from 'steed';

function resolveImageSrc(loaderContext, image, callback) {
  if (typeof image.src !== 'string') {
    return callback(
      new Error('Missing image "src" property in Web App Manifest')
    );
  }

  var publicPath = loaderContext.options.output.publicPath || '';
  var dirname = path.dirname(loaderContext.resourcePath);

  // Resolve the image filename relative to the manifest file
  loaderContext.resolve(dirname, image.src, (err, filename) => {
    if (err) {
      return callback(err);
    }

    // Ensure Webpack knows that the image is a dependency of the manifest
    loaderContext.dependency && loaderContext.dependency(filename);

    // Asynchronously pass the image through the loader pipeline
    loaderContext.loadModule(filename, (err, source, map, module) => {
      if (err) {
        return callback(err);
      }

      // Update the image src property to match the generated filename
      // Is it always the first key in the assets object?
      image.src = publicPath + Object.keys(module.assets)[0];

      callback(null);
    });
  });
}

function resolveImages(loaderContext, manifest, key, callback) {
  if (!Array.isArray(manifest[key])) {
    return callback(null);
  }

  steed.map(manifest[key], resolveImageSrc.bind(null, loaderContext), err => {
    if (err) {
      return callback(err);
    }

    callback(null);
  });
}

export default function(source) {
  var loaderContext = this;
  var callback = loaderContext.async();

  try {
    var manifest = JSON.parse(source);
  } catch (err) {
    return callback(new Error('Invalid JSON in Web App Manifest'));
  }

  steed.parallel(
    [
      resolveImages.bind(null, loaderContext, manifest, 'splash_screens'),
      resolveImages.bind(null, loaderContext, manifest, 'icons')
    ],
    err => {
      if (err) {
        return callback(err);
      }

      callback(null, JSON.stringify(manifest, null, 2));
    }
  );
};