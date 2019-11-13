// site configuration options.

module.exports = {
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          path: '../docs',
          sidebarPath: require.resolve('./sidebars.json'),
          routeBasePath: '/'
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      }
    ]
  ],
  projectName: 'redux-toolkit',
  baseUrl: '/',
  favicon: 'img/favicon/favicon.ico',
  tagline: 'The official, opinionated, batteries-included toolset for efficient Redux development',
  title: 'Redux Toolkit',
  url: 'https://redux-toolkit.js.org',
  customFields: {
    repoUrl: 'https://github.com/reduxjs/redux-toolkit',
  },
  themeConfig: {
    prism: {
      theme: require('./src/js/monokaiTheme')
    },
    footer: {
      style: 'dark',
      logo: {
        alt: 'Redux Logo',
        src: 'img/redux_white.svg'
      },
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Quick Start',
              to: 'introduction/quick-start'
            },
            {
              label: 'API Reference',
              to: 'api/configureStore'
            }
          ]
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'http://stackoverflow.com/questions/tagged/redux'
            },
            {
              label: 'Discord',
              href: 'https://discord.gg/0ZcbPKXt5bZ6au5t'
            }
          ]
        },
        {
          title: 'Social',
          items: [
            {
              label: 'GitHub',
              href: 'https://www.github.com/reduxjs/redux-toolkit'
            }
          ]
        }
      ],
      copyright: `Copyright (c) 2015-present Dan Abramov and the Redux documentation authors.`
    },
    image: 'img/redux-logo-landscape.png',
    // twitterImage: 'img/redux-logo-twitter.png',
    navbar: {
      title: 'Redux Starter Kit',
      logo: {
        alt: 'Redux Logo',
        src: 'img/redux.svg'
      },
      links: [
        {
          to: 'introduction/quick-start',
          label: 'Quick Start',
          position: 'right'
        },
        { to: 'api/configureStore', label: 'API', position: 'right' },
        {
          href: 'https://www.github.com/reduxjs/redux-starter-kit',
          label: 'GitHub',
          position: 'right'
        }
      ]
    },
    algolia: {
      apiKey: '82d838443b672336bf63cab4772d9eb4',
      indexName: 'redux-starter-kit',
      algoliaOptions: {}
    },
    googleAnalytics: {
      trackingID: 'UA-130598673-3'
    }
  }
}
