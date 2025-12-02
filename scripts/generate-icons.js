const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ICONUTIL = '/usr/bin/iconutil';

function resolveConvertBinary() {
  if (process.env.CONVERT_BIN) {
    return process.env.CONVERT_BIN;
  }

  const candidates = [
    '/opt/homebrew/bin/convert', // Apple Silicon Homebrew
    '/usr/local/bin/convert', // Intel Homebrew
    'convert',
  ];

  for (const candidate of candidates) {
    try {
      if (candidate.includes('/')) {
        fs.accessSync(candidate, fs.constants.X_OK);
        return candidate;
      }
      execSync(`command -v ${candidate} >/dev/null 2>&1`);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error('Unable to locate ImageMagick "convert" binary. Set CONVERT_BIN to override.');
}

const CONVERT = resolveConvertBinary();
const PUBLIC_DIR = path.join(__dirname, '../public');
const ICONSET_DIR = path.join(PUBLIC_DIR, 'icon.iconset');

// Create iconset directory if it doesn't exist
if (!fs.existsSync(ICONSET_DIR)) {
  fs.mkdirSync(ICONSET_DIR, { recursive: true });
}

// Sizes for different icon resolutions
const sizes = [16, 32, 64, 128, 256, 512, 1024];

// Generate PNGs for each size
sizes.forEach(size => {
  const out = path.join(ICONSET_DIR, `icon_${size}x${size}.png`);
  execSync(
    `${CONVERT} -background none -resize ${size}x${size} ${path.join(PUBLIC_DIR, 'logo.svg')} ${out}`
  );

  // Generate @2x versions for Retina displays
  if (size <= 512) {
    const out2x = path.join(ICONSET_DIR, `icon_${size}x${size}@2x.png`);
    execSync(
      `${CONVERT} -background none -resize ${size * 2}x${size * 2} ${path.join(PUBLIC_DIR, 'logo.svg')} ${out2x}`
    );
  }
});

// Generate iconset
const iconutilArgs = ['-c', 'icns', ICONSET_DIR, '-o', path.join(PUBLIC_DIR, 'icon.icns')];

try {
  execSync(`${ICONUTIL} ${iconutilArgs.join(' ')}`);
  console.log('Successfully generated icon.icns');

  // Clean up iconset directory
  fs.rmSync(ICONSET_DIR, { recursive: true, force: true });
} catch (error) {
  console.error('Error generating icon:', error);
  process.exit(1);
}
