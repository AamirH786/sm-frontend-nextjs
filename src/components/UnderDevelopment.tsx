"use client";

import { Wrench } from "lucide-react";

export default function UnderDevelopment({ title }: { title?: string }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <Wrench size={60} className="text-blue-600 mb-4" />

      <h1 className="text-3xl font-bold mb-2">
        {title || "Module Under Development"}
      </h1>

      <p className="text-gray-600 max-w-md">
        This module is currently being worked on. Please check back later.
      </p>
    </div>
  );
}
