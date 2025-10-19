// knip-ignore-file
import { defineConfig } from 'taze'

export default defineConfig({
  exclude: [],
  force: true,
  write: false,
  install: false,
  ignorePaths: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  depFields: {
    dependencies: true,
    devDependencies: true,
    optionalDependencies: true,
    peerDependencies: false,
    packageManager: false,
    overrides: false,
  },
})
