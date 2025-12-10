module.exports = (api) => {
  const isTest = api.env('test');
  const isProduction = api.env('production');

  return {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: isTest ? { node: 'current' } : '> 0.25%, not dead',
          useBuiltIns: 'usage',
          corejs: 3,
          modules: false,
        },
      ],
      [
        '@babel/preset-react',
        {
          runtime: 'automatic',
          development: !isProduction,
        },
      ],
    ],
    plugins: [
      '@babel/plugin-transform-runtime',
      '@babel/plugin-transform-class-properties',
      '@babel/plugin-transform-optional-chaining',
      '@babel/plugin-transform-nullish-coalescing-operator',
      isProduction && 'babel-plugin-transform-react-remove-prop-types',
    ].filter(Boolean),
  };
};
