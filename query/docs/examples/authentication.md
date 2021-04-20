---
id: authentication
title: Authentication
sidebar_label: Authentication
hide_title: true
hide_table_of_contents: true
---

# `Authentication Example`

There are several ways to handle authentication with RTK Query. This is a very basic example of taking a JWT from a login mutation, then setting that in our store. We then use `prepareHeaders` to inject the authentication headers into every subsequent request.

## Dispatching an action to set the user state

This example dispatches a `setCredentials` action to store the user and token information.

<iframe src="https://codesandbox.io/embed/rtk-query-authentication-example-zx8me?fontsize=12&hidenavigation=1&module=%2Fsrc%2Ffeatures%2Fauth%2FauthSlice.tsx&theme=dark"
     style={{ width: '100%', height: '800px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
     title="RTK Query Authentication Example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb" 
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>

## Using `extraReducers`

This example uses a matcher from the endpoint and `extraReducers` in the `authSlice`.

<iframe src="https://codesandbox.io/embed/rtk-query-authentication-example-extrareducers-5w7q9?fontsize=12&hidenavigation=1&module=%2Fsrc%2Ffeatures%2Fauth%2FauthSlice.tsx&theme=dark"
     style={{ width: '100%', height: '800px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
     title="RTK Query Authentication Example - extraReducers"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>
