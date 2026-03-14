if (!self.define) {
  let e,
    s = {};
  const n = (n, a) => (
    (n = new URL(n + '.js', a).href),
    s[n] ||
      new Promise((s) => {
        if ('document' in self) {
          const e = document.createElement('script');
          ((e.src = n), (e.onload = s), document.head.appendChild(e));
        } else ((e = n), importScripts(n), s());
      }).then(() => {
        let e = s[n];
        if (!e) throw new Error(`Module ${n} didn’t register its module`);
        return e;
      })
  );
  self.define = (a, i) => {
    const c = e || ('document' in self ? document.currentScript.src : '') || location.href;
    if (s[c]) return;
    let t = {};
    const r = (e) => n(e, c),
      d = { module: { uri: c }, exports: t, require: r };
    s[c] = Promise.all(a.map((e) => d[e] || r(e))).then((e) => (i(...e), t));
  };
}
define(['./workbox-f1770938'], function (e) {
  'use strict';
  (importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/_next/static/chunks/1061-77f6d0dd852f58e4.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/1137-2e75d625a0b07c65.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/2502-f39d35a07847e9fe.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/2510-a323a2bb8206ffda.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/2972-4f4401be8cd89133.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/398-8c97fb1764f60adf.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        {
          url: '/_next/static/chunks/3b8e57c5-0dbe61d558694fa1.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        { url: '/_next/static/chunks/4386-0fb4bf4b890f744c.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/4405-946632fd72b7dd0f.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/4438-d47565a1edc13a77.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/4711-9660d62f230feff1.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/5560-677d117888a30d4e.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/6434-f1ba83ef6f4d8ff1.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/6997-590c06a66cde52fc.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/738-970e4ce0acbe21ba.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/7535-23031881a19504aa.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/7804-ca4efd579712e20d.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        {
          url: '/_next/static/chunks/7e4c7320-01d5b76bb616d1bb.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        { url: '/_next/static/chunks/8071-fd1e2469f6f93504.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/8201-31cbb027866d4ca2.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/9454-57a1d275b5d0e4ab.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/9467-0ca2150d5cdea40b.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/9532-40183d9587c4b2df.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        { url: '/_next/static/chunks/9719-321eee59a6f88588.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        {
          url: '/_next/static/chunks/app/_not-found/page-9b65a946c7f6bc48.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/auth/layout-d9731504b9e69833.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/auth/login/page-956ad6d0efb83d1e.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/auth/signup/page-f7bbcc3d020c5f9c.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/dashboard/analytics/page-996ad7a4b5dd98f2.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/dashboard/flashcards/page-f41f68b9be68044e.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/dashboard/layout-88927591377d37d7.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/dashboard/page-4c3a643b66572f2c.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/dashboard/settings/page-70579dd17e62e6d1.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/dashboard/study-plan/page-42e0082151bf77f8.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/analytics/page-e95e5d0e2e3033f5.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/chat/page-3ac1c212cf442709.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/flashcards/page-7a9507516d9a217f.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/layout-f52b68914fefb0ea.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/page-824e9c51805f03b8.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/quiz/page-d1023a662927af0e.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/sources/page-1f4266e724beb543.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/study-plan/page-4e260865bafbd853.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspaces/page-67ee630e92e580f9.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/layout-3247a981b08f8fa6.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/offline/page-53877d931a9c85eb.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/page-35606397050dc65c.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/app/pricing/page-a9473b64f44df0b0.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/fd9d1056-def3aac4257a2603.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/framework-8e0e0f4a6b83a956.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        { url: '/_next/static/chunks/main-494950c80e556c00.js', revision: 'xqrmdHcnEQn6fiWpjPait' },
        {
          url: '/_next/static/chunks/main-app-7b35fc1c72fb8a71.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/pages/_app-3c9ca398d360b709.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/pages/_error-cf5ca766ac8f493f.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-0b78078cecdc8816.js',
          revision: 'xqrmdHcnEQn6fiWpjPait',
        },
        { url: '/_next/static/css/23e3ed04a949c125.css', revision: '23e3ed04a949c125' },
        { url: '/_next/static/css/51cd1b43a4fd75cb.css', revision: '51cd1b43a4fd75cb' },
        { url: '/_next/static/css/5d0493c6590efb09.css', revision: '5d0493c6590efb09' },
        { url: '/_next/static/css/5e55c879906009af.css', revision: '5e55c879906009af' },
        { url: '/_next/static/css/a4c2f45cd7d2109b.css', revision: 'a4c2f45cd7d2109b' },
        { url: '/_next/static/css/ddc4c3ea1cae7227.css', revision: 'ddc4c3ea1cae7227' },
        { url: '/_next/static/css/e699cf99e3844123.css', revision: 'e699cf99e3844123' },
        {
          url: '/_next/static/media/27834908180db20f-s.p.woff2',
          revision: 'b39676298197422e3f5284bfafdc7dc3',
        },
        {
          url: '/_next/static/media/78fec81b34c4a365.p.woff2',
          revision: '8383036bed6b5635fbd81508767479af',
        },
        {
          url: '/_next/static/xqrmdHcnEQn6fiWpjPait/_buildManifest.js',
          revision: '6310079bf1ae7bebeb6a2135896e4564',
        },
        {
          url: '/_next/static/xqrmdHcnEQn6fiWpjPait/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        { url: '/apple-touch-icon.png', revision: '7918add184627aca20cddaba86fe9a7e' },
        { url: '/icon-192.png', revision: 'bda8afa5bed57ca0fc899a630fb29a8e' },
        { url: '/icon-512.png', revision: 'b686af10414d8253685fc5e31c1b1a2c' },
        { url: '/manifest.json', revision: '5ddd88f18947e7ab7bc9a0fb9d0f9218' },
      ],
      { ignoreURLParametersMatching: [/^utm_/, /^fbclid$/] },
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      '/',
      new e.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: async ({ response: e }) =>
              e && 'opaqueredirect' === e.type
                ? new Response(e.body, { status: 200, statusText: 'OK', headers: e.headers })
                : e,
          },
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: 'google-fonts-webfonts',
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: 'google-fonts-stylesheets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-font-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-image-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 2592e3 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\/_next\/static.+\.js$/i,
      new e.CacheFirst({
        cacheName: 'next-static-js-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-image',
        plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: 'static-audio-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:mp4|webm)$/i,
      new e.CacheFirst({
        cacheName: 'static-video-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-js-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-style-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-data',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: 'static-data-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      ({ sameOrigin: e, url: { pathname: s } }) =>
        !(!e || s.startsWith('/api/auth/callback') || !s.startsWith('/api/')),
      new e.NetworkFirst({
        cacheName: 'apis',
        networkTimeoutSeconds: 10,
        plugins: [new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: s }, sameOrigin: n }) =>
        '1' === e.headers.get('RSC') &&
        '1' === e.headers.get('Next-Router-Prefetch') &&
        n &&
        !s.startsWith('/api/'),
      new e.NetworkFirst({
        cacheName: 'pages-rsc-prefetch',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: s }, sameOrigin: n }) =>
        '1' === e.headers.get('RSC') && n && !s.startsWith('/api/'),
      new e.NetworkFirst({
        cacheName: 'pages-rsc',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      ({ url: { pathname: e }, sameOrigin: s }) => s && !e.startsWith('/api/'),
      new e.NetworkFirst({
        cacheName: 'pages',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      ({ sameOrigin: e }) => !e,
      new e.NetworkFirst({
        cacheName: 'cross-origin',
        networkTimeoutSeconds: 10,
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 })],
      }),
      'GET',
    ));
});
