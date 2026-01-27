const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.default = async function (context) {
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productName}.app`);
  const frameworksPath = path.join(appPath, 'Contents', 'Frameworks');

  console.log('Running aggressive cleanup of resource forks and extended attributes...');
  console.log('Target app:', appPath);
  console.log('Frameworks path:', frameworksPath);

  try {
    // First, use dot_clean on the entire app
    execSync(`dot_clean -m "${appPath}"`, { stdio: 'inherit' });
    console.log('dot_clean completed');

    // Then clear all extended attributes
    execSync(`xattr -cr "${appPath}"`, { stdio: 'inherit' });
    console.log('xattr -cr completed');

    // Specifically target the Helper apps that are known to cause issues
    if (fs.existsSync(frameworksPath)) {
      const helpers = [
        'Chattio Helper (GPU).app',
        'Chattio Helper (Renderer).app',
        'Chattio Helper (Plugin).app',
        'Chattio Helper.app',
      ];

      for (const helper of helpers) {
        const helperPath = path.join(frameworksPath, helper);
        if (fs.existsSync(helperPath)) {
          console.log(`Cleaning ${helper}...`);
          execSync(`dot_clean -m "${helperPath}"`, { stdio: 'inherit' });
          execSync(`xattr -cr "${helperPath}"`, { stdio: 'inherit' });
        }
      }
    }

    console.log('Successfully cleaned all extended attributes and resource forks');
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }
};
