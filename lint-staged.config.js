const path = require('path');

module.exports = {
  'Backend/**/*.ts': (filenames) => {
    const relativePaths = filenames.map((file) => path.relative(__dirname, file));
    return `npm --prefix Backend exec -- eslint --config Backend/eslint.config.mjs --fix ${relativePaths.join(' ')}`;
  },
};
