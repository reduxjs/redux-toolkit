---
id: react-optimistic-updates
title: React Optimistic Updates
sidebar_label: React Optimistic Updates
hide_title: true
hide_table_of_contents: true
---

# `Optimistic Updates`

In the example below you'll notice a few things. There are two `Posts` list on the sidebar. The top one will only update _after_ a successful mutation and resync with the server. The _subscribed_ one will update immediately due to the optimistic update. In the event of an error, you'll see this get rolled back.

:::info
The example has some intentionally wonky behavior... when editing the name of a post, there is a decent chance you'll get a random error.
:::

<iframe src="https://codesandbox.io/embed/concepts-optimistic-updates-lush8?fontsize=12&hidenavigation=1&module=%2Fsrc%2Fapp%2Fservices%2Fposts.ts&theme=dark"
     style={{ width: '100%', height: '800px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
     title="RTK Query Optimistic Update Example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb" 
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>
