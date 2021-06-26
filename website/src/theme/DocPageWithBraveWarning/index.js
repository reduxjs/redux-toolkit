/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useState, useCallback, useEffect } from 'react'
import { MDXProvider } from '@mdx-js/react'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import renderRoutes from '@docusaurus/renderRoutes'
import Layout from '@theme/Layout'
import DocSidebar from '@theme/DocSidebar'
import MDXComponents from '@theme/MDXComponents'
import NotFound from '@theme/NotFound'
import IconArrow from '@theme/IconArrow'
import { matchPath } from '@docusaurus/router'
import { translate } from '@docusaurus/Translate'
import clsx from 'clsx'
import styles from './styles.module.css'
import { ThemeClassNames, docVersionSearchTag } from '@docusaurus/theme-common'

function BraveWarning() {
  const [isBrave, setIsBrave] = useState(false)

  useEffect(() => {
    const check = async () => {
      return (navigator.brave && (await navigator.brave.isBrave())) || false
    }

    check()
      .then((isBrave) => {
        if (isBrave) {
          setIsBrave(isBrave)
        }
      })
      .catch(console.error)
  }, [])

  return isBrave && !localStorage.getItem('brave-warning-dismissed') ? (
    <div className="admonition admonition-caution alert alert--warning">
      <div className="admonition-heading">
        <h5>
          <span className="admonition-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
            >
              <path
                fill-rule="evenodd"
                d="M8.893 1.5c-.183-.31-.52-.5-.887-.5s-.703.19-.886.5L.138 13.499a.98.98 0 0 0 0 1.001c.193.31.53.501.886.501h13.964c.367 0 .704-.19.877-.5a1.03 1.03 0 0 0 .01-1.002L8.893 1.5zm.133 11.497H6.987v-2.003h2.039v2.003zm0-3.004H6.987V5.987h2.039v4.006z"
              ></path>
            </svg>
          </span>
          Brave Browser Warning
        </h5>
      </div>
      <div className="admonition-content">
        <p>
          It appears that you're using Brave - that's awesome. We recommend
          disabling shields for this domain as well as CodeSandbox in the event
          that the examples do not load correctly.
        </p>
        <button
          className="button button--warning button--md"
          onClick={() => {
            localStorage.setItem('brave-warning-dismissed', true)
            setIsBrave(false)
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  ) : null
}

function getSidebar({ versionMetadata, currentDocRoute }) {
  function addTrailingSlash(str) {
    return str.endsWith('/') ? str : `${str}/`
  }

  function removeTrailingSlash(str) {
    return str.endsWith('/') ? str.slice(0, -1) : str
  }

  const { permalinkToSidebar, docsSidebars } = versionMetadata // With/without trailingSlash, we should always be able to get the appropriate sidebar
  // note: docs plugin permalinks currently never have trailing slashes
  // trailingSlash is handled globally at the framework level, not plugin level

  const sidebarName =
    permalinkToSidebar[currentDocRoute.path] ||
    permalinkToSidebar[addTrailingSlash(currentDocRoute.path)] ||
    permalinkToSidebar[removeTrailingSlash(currentDocRoute.path)]
  const sidebar = docsSidebars[sidebarName]
  return {
    sidebar,
    sidebarName,
  }
}

function DocPageContent({ currentDocRoute, versionMetadata, children }) {
  const { siteConfig, isClient } = useDocusaurusContext()
  const { pluginId, version } = versionMetadata
  const { sidebarName, sidebar } = getSidebar({
    versionMetadata,
    currentDocRoute,
  })
  const [hiddenSidebarContainer, setHiddenSidebarContainer] = useState(false)
  const [hiddenSidebar, setHiddenSidebar] = useState(false)
  const toggleSidebar = useCallback(() => {
    if (hiddenSidebar) {
      setHiddenSidebar(false)
    }

    setHiddenSidebarContainer(!hiddenSidebarContainer)
  }, [hiddenSidebar])
  return (
    <Layout
      key={isClient}
      wrapperClassName={ThemeClassNames.wrapper.docPages}
      pageClassName={ThemeClassNames.page.docPage}
      searchMetadatas={{
        version,
        tag: docVersionSearchTag(pluginId, version),
      }}
    >
      <div className={styles.docPage}>
        {sidebar && (
          <aside
            className={clsx(styles.docSidebarContainer, {
              [styles.docSidebarContainerHidden]: hiddenSidebarContainer,
            })}
            onTransitionEnd={(e) => {
              if (
                !e.currentTarget.classList.contains(styles.docSidebarContainer)
              ) {
                return
              }

              if (hiddenSidebarContainer) {
                setHiddenSidebar(true)
              }
            }}
          >
            <DocSidebar
              key={
                // Reset sidebar state on sidebar changes
                // See https://github.com/facebook/docusaurus/issues/3414
                sidebarName
              }
              sidebar={sidebar}
              path={currentDocRoute.path}
              sidebarCollapsible={
                siteConfig.themeConfig?.sidebarCollapsible ?? true
              }
              onCollapse={toggleSidebar}
              isHidden={hiddenSidebar}
            />

            {hiddenSidebar && (
              <div
                className={styles.collapsedDocSidebar}
                title={translate({
                  id: 'theme.docs.sidebar.expandButtonTitle',
                  message: 'Expand sidebar',
                  description:
                    'The ARIA label and title attribute for expand button of doc sidebar',
                })}
                aria-label={translate({
                  id: 'theme.docs.sidebar.expandButtonAriaLabel',
                  message: 'Expand sidebar',
                  description:
                    'The ARIA label and title attribute for expand button of doc sidebar',
                })}
                tabIndex={0}
                role="button"
                onKeyDown={toggleSidebar}
                onClick={toggleSidebar}
              >
                <IconArrow className={styles.expandSidebarButtonIcon} />
              </div>
            )}
          </aside>
        )}
        <main
          className={clsx(styles.docMainContainer, {
            [styles.docMainContainerEnhanced]:
              hiddenSidebarContainer || !sidebar,
          })}
        >
          <div
            className={clsx(
              'container padding-top--md padding-bottom--lg',
              styles.docItemWrapper,
              {
                [styles.docItemWrapperEnhanced]: hiddenSidebarContainer,
              }
            )}
          >
            <BraveWarning />
            <MDXProvider components={MDXComponents}>{children}</MDXProvider>
          </div>
        </main>
      </div>
    </Layout>
  )
}

function DocPage(props) {
  const {
    route: { routes: docRoutes },
    versionMetadata,
    location,
  } = props
  const currentDocRoute = docRoutes.find((docRoute) =>
    matchPath(location.pathname, docRoute)
  )

  if (!currentDocRoute) {
    return <NotFound {...props} />
  }

  return (
    <DocPageContent
      currentDocRoute={currentDocRoute}
      versionMetadata={versionMetadata}
    >
      {renderRoutes(docRoutes)}
    </DocPageContent>
  )
}

export default DocPage
