"use client";
import { useState } from "react";

// Password field with a Show / Hide toggle. Takes the same props as <input>.
export default function PasswordInput(props) {
  const [shown, setShown] = useState(false);
  return (
    <span className="pw">
      <input {...props} type={shown ? "text" : "password"} />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setShown((s) => !s)}
        aria-pressed={shown}
        aria-label={shown ? "Hide password" : "Show password"}
      >
        {shown ? "Hide" : "Show"}
      </button>
    </span>
  );
}
