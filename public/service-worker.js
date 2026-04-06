if (!self.define) {
  let e,
    s = {};
  const a = (a, n) => (
    (a = new URL(a + '.js', n).href),
    s[a] ||
      new Promise((s) => {
        if ('document' in self) {
          const e = document.createElement('script');
          ((e.src = a), (e.onload = s), document.head.appendChild(e));
        } else ((e = a), importScripts(a), s());
      }).then(() => {
        let e = s[a];
        if (!e) throw new Error(`Module ${a} didn’t register its module`);
        return e;
      })
  );
  self.define = (n, c) => {
    const t = e || ('document' in self ? document.currentScript.src : '') || location.href;
    if (s[t]) return;
    let i = {};
    const r = (e) => a(e, t),
      u = { module: { uri: t }, exports: i, require: r };
    s[t] = Promise.all(n.map((e) => u[e] || r(e))).then((e) => (c(...e), i));
  };
}
define(['./workbox-f1770938'], function (e) {
  'use strict';
  (importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: '/_next/static/Dqux83SDHB-UR4YVMkwLx/_buildManifest.js',
          revision: '6310079bf1ae7bebeb6a2135896e4564',
        },
        {
          url: '/_next/static/Dqux83SDHB-UR4YVMkwLx/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        { url: '/_next/static/chunks/1061-07568eb4569bfdaa.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/1152-74749eaa330323f0.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/1468-bc963ae749c7033b.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/2510-e4842d8b79ea77d9.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/2972-4f4401be8cd89133.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/3304-250daa0498596c2a.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        {
          url: '/_next/static/chunks/3b8e57c5-70b4aadaa6e40d79.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        { url: '/_next/static/chunks/4386-6753527632f4b750.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/4438-a4ec94659fe7d5ba.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/4711-abc3f792312e2747.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/4770-bdfe3c5adf85bfcd.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/4964-f30238d0c172d3ac.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/5560-9908bdee7d814853.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/5665-540a0377e3c22cd6.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/5935-35e09bf88d9813d1.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/611-4bcc5766faf4cf0e.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/6434-f1ba83ef6f4d8ff1.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/6623-8508d979ec6ed7ba.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/6929-4be63bf9950cb016.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/6997-590c06a66cde52fc.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/7535-890e4d99421eefda.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/7804-ca4efd579712e20d.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/7840-cb7edb5b0d6f9f0c.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        {
          url: '/_next/static/chunks/7e4c7320-01d5b76bb616d1bb.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        { url: '/_next/static/chunks/9454-8e755ab43c0dc1a5.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        { url: '/_next/static/chunks/9467-73b7bdb5df87c185.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        {
          url: '/_next/static/chunks/app/_not-found/page-9b65a946c7f6bc48.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/admin/verifications/page-b92c06cf0591dbaf.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/auth/layout-7fcdee733557df4c.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/auth/login/page-beb5b190bc7a347c.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/auth/signup/page-b4839dd6b76ec32b.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/analytics/page-d6a603c6854e8539.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/flashcards/page-b4eeefe338496b00.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/layout-603f859c650a4542.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/page-805aa53d8e0dade7.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/settings/page-3a98a649c8194b3d.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/study-plan/page-36ee42d588687792.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/analytics/page-a3fbda76268b840c.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/chat/page-026025b96c5f38e6.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/flashcards/page-b1a730f9867b8d1a.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/layout-fa516e03507d95b3.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/members/page-e5fd5ce5ff728aa1.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/page-e6f195b40618a6ab.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/quiz/page-8f46256622203e70.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/sources/page-83ecbb227027bfe2.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/studio/page-9bbeb43d7d016bb2.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/study-plan/page-e3e45074493a2bb3.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspace/%5BworkspaceId%5D/tutor/page-5292d76bf3ba70ed.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/dashboard/workspaces/page-d3627c6612e59876.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/layout-7777b45fb4763a68.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/offline/page-53877d931a9c85eb.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/page-2ba871391c484422.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/pricing/page-f25a08c48db5c94c.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/app/workspace/join/page-a0944bc53ece75b4.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/fd9d1056-def3aac4257a2603.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/framework-8e0e0f4a6b83a956.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        { url: '/_next/static/chunks/main-16e0e03c1bf39a86.js', revision: 'Dqux83SDHB-UR4YVMkwLx' },
        {
          url: '/_next/static/chunks/main-app-7b35fc1c72fb8a71.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/pages/_app-3c9ca398d360b709.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/pages/_error-cf5ca766ac8f493f.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-e4aeea437ac41d8e.js',
          revision: 'Dqux83SDHB-UR4YVMkwLx',
        },
        { url: '/_next/static/css/19d0b58a16ed0e73.css', revision: '19d0b58a16ed0e73' },
        { url: '/_next/static/css/3341990a1a93265b.css', revision: '3341990a1a93265b' },
        { url: '/_next/static/css/5e55c879906009af.css', revision: '5e55c879906009af' },
        { url: '/_next/static/css/9d6b10e36d8c380a.css', revision: '9d6b10e36d8c380a' },
        { url: '/_next/static/css/9eca856894f65114.css', revision: '9eca856894f65114' },
        { url: '/_next/static/css/e699cf99e3844123.css', revision: 'e699cf99e3844123' },
        { url: '/_next/static/css/ed34943891bc37f4.css', revision: 'ed34943891bc37f4' },
        {
          url: '/_next/static/media/27834908180db20f-s.p.woff2',
          revision: 'b39676298197422e3f5284bfafdc7dc3',
        },
        {
          url: '/_next/static/media/78fec81b34c4a365.p.woff2',
          revision: '8383036bed6b5635fbd81508767479af',
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
      ({ request: e, url: { pathname: s }, sameOrigin: a }) =>
        '1' === e.headers.get('RSC') &&
        '1' === e.headers.get('Next-Router-Prefetch') &&
        a &&
        !s.startsWith('/api/'),
      new e.NetworkFirst({
        cacheName: 'pages-rsc-prefetch',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: s }, sameOrigin: a }) =>
        '1' === e.headers.get('RSC') && a && !s.startsWith('/api/'),
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
