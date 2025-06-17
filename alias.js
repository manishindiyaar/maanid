const path = require('path');

/**
 * Module aliases for path resolution
 */
const aliases = {
  '@': path.join(__dirname, 'src'),
  '@/components': path.join(__dirname, 'src/components'),
  '@/lib': path.join(__dirname, 'src/lib'),
};

module.exports = aliases; 