"use client";

import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="text-7xl font-extrabold text-gray-300">403</h1>
      <h2 className="text-2xl font-semibold text-gray-800 mt-3">
        Access Forbidden
      </h2>
      <p className="text-gray-600 mt-2">
        You are not authorized to view this page.
      </p>

      <Link
        href="/"
        className="mt-6 inline-block bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700"
      >
        Back to Home
      </Link>
    </div>
  );
}
