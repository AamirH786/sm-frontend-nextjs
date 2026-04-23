"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Input from "./Input";

export default function PasswordInput({ label, error, ...props }: any) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium">{label}</label>}

      <div className="relative">
        <Input
          {...props}
          type={show ? "text" : "password"}
          className={`w-full border py-3"
          }`}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="off"
        />

        <button
          type="button"
          className="absolute right-3 top-3 text-gray-600"
          onClick={() => setShow((s) => !s)}
        >
          {show ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
