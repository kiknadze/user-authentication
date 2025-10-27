module.exports = {
  module: {
    rules: [
      {
        test: /\.scss$|\.sass$/,
        use: [
          {
            loader: require.resolve('resolve-url-loader')
          },
          {
            loader: require.resolve('sass-loader'),
            options: {
              sourceMap: true,
              additionalData: (content, loaderContext) => {
                if (loaderContext.resourcePath.endsWith('styles.scss') || 
                    loaderContext.resourcePath.endsWith('variables.scss') ||
                    loaderContext.resourcePath.includes('base/')) {
                  return content;
                }

                if (!content.includes('variables')) {
                  return `
                   @use "src/scss/variables" as *;
                   ${content}
                 `;
                }

                return content;
              }
            }
          }
        ]
      }
    ]
  }
};
