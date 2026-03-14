import Link from 'next/link';

export default function Offline() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="p-8 text-center">
        <h1 className="mb-4 text-2xl font-bold">You&apos;re Offline</h1>
        <p className="mb-4 text-gray-600">Please check your internet connection and try again.</p>
        <Link href="/" className="text-indigo-600 hover:underline">
          Go Home
        </Link>
      </div>
    </div>
  );
}
