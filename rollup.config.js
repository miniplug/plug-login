import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import buble from '@rollup/plugin-buble'
import builtins from 'builtin-modules'

const pkg = require('./package.json')

export default {
  input: './src/index.js',
  output: [
    { format: 'cjs', file: pkg.main, sourcemap: true, exports: 'default', interop: false },
    { format: 'es', file: pkg.module, sourcemap: true }
  ],
  external: builtins.concat(Object.keys(pkg.dependencies)),
  plugins: [
    buble({
      include: './src/**',
      target: { node: 4 },
      objectAssign: 'Object.assign'
    }),
    resolve(),
    commonjs({ include: './node_modules/**' })
  ]
}
