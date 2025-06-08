'use strict';

import { promisify } from 'util';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import * as cache from '@actions/tool-cache';
import * as core from '@actions/core';

const chmod = promisify(fs.chmod);

if (require.main === module) {
  main().catch((err: Error) => {
    console.error(err.stack);
    process.exit(1);
  });
}

async function getLatestVersion(): Promise<string> {
  const url = 'https://api.github.com/repos/camalot/abyssal/releases/latest';
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Abyssal Action'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch latest version: ${response.statusText}`);
  }
  const data = await response.json();
  return data.tag_name;
}

async function main(): Promise<void> {
  try {
    const url: string = core.getInput('abyssal-url');
    const defaultUrl: string = 'https://github.com/camalot/abyssal/releases/download/{version}/abyssal-{platform}-{arch}.tar.gz';
    let version: string = core.getInput('abyssal-version');
    const platform: NodeJS.Platform = os.platform();
    let arch: string = os.arch();
    if (arch === 'x64') {
      arch = 'amd64';
    }

    if (!version || version === 'latest' || version === undefined || version === 'undefined') {
      core.debug('No version specified, fetching latest version');
      version = await getLatestVersion();
      core.debug(`Latest version fetched: ${version}`);
      core.setOutput('abyssal-version', version);
    } else {
      core.setOutput('abyssal-version', version);
    }

    let toolPath: string = cache.find('abyssal', version, arch);

    if (!toolPath) {
      const context: { arch: string; platform: NodeJS.Platform; version: string } = {
        arch,
        platform,
        version
      };
      const rendered = (url ?? defaultUrl).replace(/\{(\w+?)\}/g, (_a, match) => {
        return context[match as keyof typeof context] || '';
      });

      core.debug(`Downloading Abyssal from: ${rendered}`);

      const downloadPath: string = await cache.downloadTool(rendered);

      let extractedPath = downloadPath;
      if (rendered.endsWith('.tar.gz')) {
        core.debug(`Extracting Abyssal from: ${downloadPath}`);
        extractedPath = await cache.extractTar(downloadPath);
      } else if (rendered.endsWith('.zip')) {
        core.debug(`Extracting Abyssal from: ${downloadPath}`);
        extractedPath = await cache.extractZip(downloadPath);
      }
      core.debug(`Extracted Abyssal to: ${extractedPath}`);

      // Rename/move the binary to 'abyssal'
      const srcBinary = path.join(extractedPath, `abyssal-${platform}-${arch}`);
      const destBinary = path.join(extractedPath, 'abyssal');
      if (!fs.existsSync(srcBinary)) {
        throw new Error(`Expected binary not found at ${srcBinary}`);
      }
      core.debug(`Renaming Abyssal binary from ${srcBinary} to ${destBinary}`);
      await fs.promises.copyFile(srcBinary, destBinary);
      await fs.promises.unlink(srcBinary); // Remove the original binary if it exists
      core.debug(`Binary renamed successfully`);
      toolPath = await cache.cacheFile(destBinary, 'abyssal', 'abyssal', version);
      core.debug(`Cached Abyssal at: ${toolPath}`);
    }

    await chmod(path.join(toolPath, 'abyssal'), 0o755); // just in case we haven't preserved the executable bit
    core.addPath(toolPath);
  } catch (error: any) {
    core.setFailed(error.message);
  }
}
