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

async function main(): Promise<void> {
  try {
    const url: string = core.getInput('abyssal-url');
    const version: string = core.getInput('abyssal-version');
    const platform: NodeJS.Platform = os.platform();
    let arch: string = os.arch();
    if (arch === 'x64') {
      arch = 'amd64';
    }

    let toolPath: string = cache.find('abyssal', version, arch);

    if (!toolPath) {
      const context: { arch: string; platform: NodeJS.Platform; version: string } = {
        arch,
        platform,
        version
      };
      const rendered = url.replace(/\{(\w+?)\}/g, (_a, match) => {
        return context[match as keyof typeof context] || '';
      });

      const downloadPath: string = await cache.downloadTool(rendered);
      toolPath = await cache.cacheFile(downloadPath, 'abyssal', 'abyssal', version);
    }

    await chmod(path.join(toolPath, 'abyssal'), 0o755); // just in case we haven't preserved the executable bit
    core.addPath(toolPath);
  } catch (error: any) {
    core.setFailed(error.message);
  }
}
