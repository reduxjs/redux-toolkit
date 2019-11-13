/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react')

const CompLibrary = require('../../core/CompLibrary.js')

const {
  MarkdownBlock,
  GridBlock,
  Container
} = CompLibrary /* Used to read markdown */

const siteConfig = require(`${process.cwd()}/siteConfig.js`)

function docUrl(doc, language) {
  return `${siteConfig.baseUrl}${language ? `${language}/` : ''}${doc}`
}

function imgUrl(img) {
  return `${siteConfig.baseUrl}img/${img}`
}
class Button extends React.Component {
  render() {
    return (
      <div className="pluginWrapper buttonWrapper">
        <a
          className="button hero"
          href={this.props.href}
          target={this.props.target}
        >
          {this.props.children}
        </a>
      </div>
    )
  }
}

Button.defaultProps = {
  target: '_self'
}

const SplashContainer = props => (
  <div className="homeContainer">
    <div className="homeSplashFade">
      <div className="wrapper homeWrapper">{props.children}</div>
    </div>
  </div>
)

const ProjectTitle = () => (
  <React.Fragment>
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <img src={'img/redux.svg'} alt="Redux logo" width={100} height={100} />
      <h1 className="projectTitle">{siteConfig.title}</h1>
    </div>

    <h2 style={{ marginTop: '0.5em' }}>{siteConfig.tagline}</h2>
  </React.Fragment>
)

const PromoSection = props => (
  <div className="section promoSection">
    <div className="promoRow">
      <div className="pluginRowBlock">{props.children}</div>
    </div>
  </div>
)

class HomeSplash extends React.Component {
  render() {
    const language = this.props.language || ''
    return (
      <SplashContainer>
        <div className="inner">
          <ProjectTitle />
          <PromoSection>
            <Button href={docUrl('introduction/quick-start', language)}>
              Get Started
            </Button>
          </PromoSection>
        </div>
      </SplashContainer>
    )
  }
}

const Installation = () => (
  <div
    className="productShowcaseSection paddingBottom"
    style={{ textAlign: 'center' }}
  >
    <h2>Installation</h2>
    <MarkdownBlock>``` npm install --save @reduxjs/toolkit ```</MarkdownBlock>
  </div>
)

const Block = props => (
  <Container
    id={props.id}
    background={props.background}
    className={props.className}
  >
    <GridBlock align="center" contents={props.children} layout={props.layout} />
  </Container>
)
const FeaturesTop = props => (
  <Block layout="fourColumn" className="featureBlock">
    {[
      {
        content: `Includes utilities to simplify common use cases like **store setup, creating reducers, immutable update logic**, and more.`,
        image: imgUrl('noun_snap_1984955.svg'),
        imageAlign: 'top',
        title: 'Simple'
      },
      {
        content:
          'Provides **good defaults for store setup out of the box**, and includes **the most commonly used Redux addons built-in**.',
        image: imgUrl('noun_Brain_1551075.svg'),
        imageAlign: 'top',
        title: 'Opinionated'
      },
      {
        // .
        content: `Takes inspiration from libraries like Immer and Autodux to let you **write "mutative" immutable update logic**, and even **create entire "slices" of state automatically**.`,
        image: imgUrl('noun_Bicep_1338504.svg'),
        imageAlign: 'top',
        title: 'Powerful'
      },
      {
        content:
          'Lets you focus on the core logic your app needs, so you can **do more work with less code**.',
        image: imgUrl('noun_Checklist_437165.svg'),
        imageAlign: 'top',
        title: 'Effective'
      }
    ]}
  </Block>
)
const OtherLibraries = props => (
  <Block layout="twoColumn" className="libBlock">
    {[
      {
        content: 'A predictable state container for JavaScript applications',
        title:
          '[Redux ![link2](img/external-link-square-alt-solid.svg)](https://redux.js.org) '
      },
      {
        content: 'Official React bindings for Redux',
        title:
          '[React-Redux ![link2](img/external-link-square-alt-solid.svg)](https://react-redux.js.org) '
      }
    ]}
  </Block>
)
class Index extends React.Component {
  render() {
    const language = this.props.language || ''

    return (
      <div>
        <HomeSplash language={language} />
        <div className="mainContainer">
          <div className="productShowcaseSection">
            <Container background="light">
              <FeaturesTop />
            </Container>
            <Container>
              <h2 style={{ marginTop: '0.5em' }}>
                Other Libraries from the Redux Team
              </h2>
              <OtherLibraries />
            </Container>
          </div>
        </div>
      </div>
    )
  }
}

module.exports = Index
