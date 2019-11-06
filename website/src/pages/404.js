import React from 'react'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

function ErrorPage() {
  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;

  function getTrackingScript() {
    if (!siteConfig.gaTrackingId) {
      return null
    }

    return {
      __html: `
      ga('create', "${siteConfig.themeConfig.googleAnalytics.trackingID}");
      ga('send', {
        hitType: 'event',
        eventCategory: '404 Response',
        eventAction: window.location.href,
        eventLabel: document.referrer
      });`
    }
  }

  const trackingScript = getTrackingScript()

  return (
    <div className="error-page">
      {trackingScript && <script dangerouslySetInnerHTML={trackingScript} />}
      <div className="error-message">
        <div className=" error-message-container container">
          <span>404 </span>
          <p>Page Not Found.</p>
          <a href="/">Return to the front page</a>
        </div>
      </div>
    </div>
  )
}

ErrorPage.title = 'Page Not Found'

export default ErrorPage
